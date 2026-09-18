import { BrowserWindow, ipcMain } from 'electron';
import {
  BRIGHTNESS_SAFE_MIN,
  CRITICAL_ACCEPT_MS,
  CRITICAL_CONFIRM_MS,
  effectiveDimmer,
  isCriticalBrightness,
  mergeWidimmerSettings,
  withSafeBrightnessFloor,
  type WidimmerSettings,
} from '../../../shared/settings/widimmer';
import {
  applyDimmerLive,
  applyDimmerSettings,
  clearDimmerOverlays,
  listMonitors,
  restoreIdentityGamma,
  type MonitorInfo,
} from './displayControl';
import { loadWidimmerSettings, saveWidimmerSettings } from './settingsStore';

let scheduleTimer: ReturnType<typeof setInterval> | null = null;
let criticalTimer: ReturnType<typeof setTimeout> | null = null;
let lastAppliedKey = '';
let appEnabled = true;
let latestSettings: WidimmerSettings | null = null;
let criticalConfirmOpen = false;
/** Same critical level already accepted — don't re-prompt until user leaves critical. */
let confirmedCriticalKey = '';
let criticalChoiceHandler: ((event: Electron.IpcMainEvent, choice: string) => void) | null = null;

function broadcast(
  settings: WidimmerSettings,
  monitors?: MonitorInfo[],
  meta?: { force?: boolean },
): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('widimmer:settingsChanged', {
        settings,
        monitors,
        force: Boolean(meta?.force),
      });
    }
  }
}

function monitorsKey(settings: WidimmerSettings): string {
  return Object.entries(settings.monitors)
    .map(([id, m]) => `${id}:${m.included ? 1 : 0}:${m.brightness.toFixed(2)}`)
    .sort()
    .join('|');
}

function criticalKey(settings: WidimmerSettings): string {
  const eff = effectiveDimmer(settings);
  return `${settings.linkAll}:${settings.autoSchedule}:${eff.brightness.toFixed(3)}:${monitorsKey(settings)}`;
}

function clearCriticalWatch(): void {
  if (criticalTimer) {
    clearTimeout(criticalTimer);
    criticalTimer = null;
  }
}

function applyLiveNow(settings: WidimmerSettings): {
  ok: boolean;
  kelvin: number;
  brightness: number;
  error?: string;
  appliedMonitors?: number;
} {
  if (!appEnabled) {
    const result = applyDimmerLive({ ...settings, enabled: false });
    lastAppliedKey = 'off';
    return result;
  }
  const eff = effectiveDimmer(settings);
  const key = `${settings.enabled}:${settings.linkAll}:${eff.kelvin}:${eff.brightness.toFixed(3)}:${monitorsKey(settings)}`;
  if (key === lastAppliedKey && settings.enabled) {
    return { ok: true, kelvin: eff.kelvin, brightness: eff.brightness };
  }
  const result = applyDimmerLive(settings);
  if (result.ok) {
    lastAppliedKey = settings.enabled ? key : 'identity';
  }
  return result;
}

async function restoreSafeAndPersist(base: WidimmerSettings): Promise<void> {
  const safe = withSafeBrightnessFloor(base);
  latestSettings = safe;
  confirmedCriticalKey = '';
  lastAppliedKey = '';
  // Wipe overlay first — executeJavaScript updates were leaving the screen dark
  clearDimmerOverlays();
  applyLiveNow(safe);
  await saveWidimmerSettings(safe);
  const monitors = await listMonitors();
  broadcast(safe, monitors, { force: true });
}

const KEEP_CONFIRM_LOCK_MS = 3000;

function showCriticalConfirmDialog(seconds: number): Promise<'keep' | 'restore'> {
  return new Promise((resolve) => {
    let settled = false;
    const safePct = Math.round(BRIGHTNESS_SAFE_MIN * 100);
    const lockSec = Math.round(KEEP_CONFIRM_LOCK_MS / 1000);
    const parent =
      BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());

    const win = new BrowserWindow({
      width: 460,
      height: 280,
      resizable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      modal: Boolean(parent),
      parent: parent && !parent.isDestroyed() ? parent : undefined,
      autoHideMenuBar: true,
      show: false,
      backgroundColor: '#1a1410',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const html = `<!doctype html>
<html lang="es"><head><meta charset="UTF-8"/><title>WI-Dimmer</title>
<style>
  html,body{margin:0;height:100%;background:#1a1410;color:#f5efe8;font:14px/1.4 Segoe UI,Tahoma,sans-serif}
  main{padding:18px 20px;display:flex;flex-direction:column;gap:10px;height:100%;box-sizing:border-box}
  h1{font-size:1.05rem;margin:0}
  p{margin:0;color:#a89888}
  #cd,#lock{color:#e8c07a;font-weight:700}
  .row{display:flex;gap:10px;margin-top:auto}
  button{flex:1;min-height:40px;border-radius:8px;border:1px solid #3a3028;background:#241c16;color:#f5efe8;font:600 0.9rem Segoe UI;cursor:pointer}
  button:disabled{opacity:.45;cursor:not-allowed}
  #keep,#accept{border-color:#f0a060;color:#f0a060}
  #restore,#cancel{background:#3a2818}
  #step2{display:none}
</style></head><body><main>
  <div id="step1">
    <h1>Brillo crítico</h1>
    <p>Por debajo del mínimo seguro (${safePct}%). ¿Mantener?</p>
    <p>Sin respuesta en <span id="cd">${seconds}</span>s → vuelve a ${safePct}%.</p>
    <div class="row">
      <button type="button" id="keep">Mantener</button>
      <button type="button" id="restore">Restaurar ${safePct}%</button>
    </div>
  </div>
  <div id="step2">
    <h1>Confirmar brillo bajo</h1>
    <p>La pantalla quedará muy oscura. ¿Seguro?</p>
    <p>Aceptar disponible en <span id="lock">${lockSec}</span>s (anti miss-click).</p>
    <div class="row">
      <button type="button" id="accept" disabled>Aceptar (${lockSec})</button>
      <button type="button" id="cancel">Cancelar → ${safePct}%</button>
    </div>
  </div>
</main>
<script>
  const { ipcRenderer } = require('electron');
  const keepBtn = document.getElementById('keep');
  const restoreBtn = document.getElementById('restore');
  const acceptBtn = document.getElementById('accept');
  const cancelBtn = document.getElementById('cancel');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const lockEl = document.getElementById('lock');
  let lockLeft = ${lockSec};
  let lockTimer = null;

  restoreBtn.onclick = () => ipcRenderer.send('widimmer:critical-choice', 'restore');
  cancelBtn.onclick = () => ipcRenderer.send('widimmer:critical-choice', 'restore');
  acceptBtn.onclick = () => {
    if (acceptBtn.disabled) return;
    ipcRenderer.send('widimmer:critical-choice', 'keep');
  };
  keepBtn.onclick = () => {
    step1.style.display = 'none';
    step2.style.display = 'block';
    ipcRenderer.send('widimmer:critical-step', 'confirm');
    acceptBtn.disabled = true;
    acceptBtn.textContent = 'Aceptar (' + lockLeft + ')';
    lockTimer = setInterval(() => {
      lockLeft -= 1;
      if (lockEl) lockEl.textContent = String(Math.max(0, lockLeft));
      if (lockLeft <= 0) {
        clearInterval(lockTimer);
        acceptBtn.disabled = false;
        acceptBtn.textContent = 'Aceptar';
      } else {
        acceptBtn.textContent = 'Aceptar (' + lockLeft + ')';
      }
    }, 1000);
  };
</script></body></html>`;

    const finish = (choice: 'keep' | 'restore') => {
      if (settled) {
        return;
      }
      settled = true;
      clearInterval(tick);
      if (criticalChoiceHandler) {
        ipcMain.removeListener('widimmer:critical-choice', criticalChoiceHandler);
        criticalChoiceHandler = null;
      }
      if (criticalStepHandler) {
        ipcMain.removeListener('widimmer:critical-step', criticalStepHandler);
        criticalStepHandler = null;
      }
      if (!win.isDestroyed()) {
        win.close();
      }
      resolve(choice);
    };

    let left = seconds;
    let inStep2 = false;
    const tick = setInterval(() => {
      if (inStep2) {
        return; // pause auto-restore while confirming keep
      }
      left -= 1;
      if (!win.isDestroyed()) {
        void win.webContents
          .executeJavaScript(
            `(() => { const el = document.getElementById('cd'); if (el) el.textContent = ${JSON.stringify(String(Math.max(0, left)))}; })()`,
          )
          .catch(() => {
            // ignore
          });
      }
      if (left <= 0) {
        finish('restore');
      }
    }, 1000);

    criticalChoiceHandler = (_event, choice: string) => {
      finish(choice === 'keep' ? 'keep' : 'restore');
    };
    ipcMain.on('widimmer:critical-choice', criticalChoiceHandler);

    let criticalStepHandler: ((event: Electron.IpcMainEvent, step: string) => void) | null = (
      _event,
      step: string,
    ) => {
      if (step === 'confirm') {
        inStep2 = true;
      }
    };
    ipcMain.on('widimmer:critical-step', criticalStepHandler);

    win.on('closed', () => {
      finish('restore');
    });

    win.setAlwaysOnTop(true, 'screen-saver');
    void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).then(() => {
      if (!win.isDestroyed()) {
        win.show();
        win.focus();
      }
    });
  });
}

async function promptCriticalConfirm(critical: WidimmerSettings): Promise<void> {
  if (criticalConfirmOpen || !isCriticalBrightness(critical)) {
    return;
  }
  criticalConfirmOpen = true;
  clearCriticalWatch();

  // Temporarily raise so the dialog is readable
  const safePreview = withSafeBrightnessFloor(critical);
  latestSettings = safePreview;
  lastAppliedKey = '';
  clearDimmerOverlays();
  applyLiveNow(safePreview);

  try {
    const choice = await showCriticalConfirmDialog(Math.round(CRITICAL_ACCEPT_MS / 1000));
    if (choice === 'keep') {
      latestSettings = critical;
      confirmedCriticalKey = criticalKey(critical);
      lastAppliedKey = '';
      clearDimmerOverlays();
      applyLiveNow(critical);
      await saveWidimmerSettings(critical);
      const monitors = await listMonitors();
      broadcast(critical, monitors, { force: true });
    } else {
      await restoreSafeAndPersist(critical);
    }
  } catch {
    await restoreSafeAndPersist(critical);
  } finally {
    criticalConfirmOpen = false;
  }
}

function armCriticalWatch(settings: WidimmerSettings): void {
  if (!appEnabled || !isCriticalBrightness(settings)) {
    clearCriticalWatch();
    if (!isCriticalBrightness(settings)) {
      confirmedCriticalKey = '';
    }
    return;
  }
  const key = criticalKey(settings);
  if (key === confirmedCriticalKey) {
    clearCriticalWatch();
    return;
  }
  clearCriticalWatch();
  const snapshot = mergeWidimmerSettings(settings);
  criticalTimer = setTimeout(() => {
    void promptCriticalConfirm(snapshot);
  }, CRITICAL_CONFIRM_MS);
}

function startScheduleLoop(): void {
  if (scheduleTimer) {
    return;
  }
  scheduleTimer = setInterval(() => {
    void (async () => {
      const settings = await loadWidimmerSettings();
      if (!settings.autoSchedule || !settings.enabled || !appEnabled) {
        return;
      }
      applyLiveNow(settings);
      armCriticalWatch(settings);
    })();
  }, 30_000);
}

export function setWidimmerAppEnabled(enabled: boolean): void {
  appEnabled = enabled;
  void (async () => {
    if (!enabled) {
      clearCriticalWatch();
      confirmedCriticalKey = '';
      await restoreIdentityGamma();
      lastAppliedKey = 'off';
      return;
    }
    const settings = latestSettings ?? (await loadWidimmerSettings());
    applyLiveNow(settings);
    armCriticalWatch(settings);
  })();
}

export function setupWidimmerIpc(): void {
  ipcMain.handle('widimmer:getSettings', async () => {
    const settings = await loadWidimmerSettings();
    latestSettings = settings;
    const monitors = await listMonitors();
    const eff = effectiveDimmer(settings);
    return { settings, effective: eff, monitors };
  });

  ipcMain.handle('widimmer:listMonitors', async () => listMonitors());

  /** Instant apply — blocked while critical confirm is open (prevents undo of restore). */
  ipcMain.handle('widimmer:live', async (_event, raw: Partial<WidimmerSettings>) => {
    if (criticalConfirmOpen) {
      const cur = latestSettings ?? (await loadWidimmerSettings());
      const eff = effectiveDimmer(cur);
      return { ok: true, kelvin: eff.kelvin, brightness: eff.brightness };
    }
    const base = latestSettings ?? (await loadWidimmerSettings());
    const settings = mergeWidimmerSettings({
      ...base,
      ...raw,
      monitors: raw.monitors ? { ...base.monitors, ...raw.monitors } : base.monitors,
    });
    latestSettings = settings;
    const result = applyLiveNow(settings);
    armCriticalWatch(settings);
    return result;
  });

  ipcMain.handle('widimmer:saveSettings', async (_event, raw: Partial<WidimmerSettings>) => {
    try {
      if (criticalConfirmOpen) {
        const cur = latestSettings ?? (await loadWidimmerSettings());
        const monitors = await listMonitors();
        return {
          ok: true as const,
          settings: cur,
          applied: {
            ok: true,
            kelvin: effectiveDimmer(cur).kelvin,
            brightness: effectiveDimmer(cur).brightness,
          },
          monitors,
        };
      }
      const current = latestSettings ?? (await loadWidimmerSettings());
      const settings = mergeWidimmerSettings({
        ...current,
        ...raw,
        monitors: raw.monitors ? { ...current.monitors, ...raw.monitors } : current.monitors,
      });
      latestSettings = settings;
      await saveWidimmerSettings(settings);
      const applied = settings.useHardwareBrightness
        ? await applyDimmerSettings(settings, { hardware: true })
        : applyLiveNow(settings);
      armCriticalWatch(settings);
      const monitors = await listMonitors();
      broadcast(settings, monitors);
      return { ok: true as const, settings, applied, monitors };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('widimmer:apply', async () => {
    const settings = latestSettings ?? (await loadWidimmerSettings());
    const result = applyLiveNow(settings);
    armCriticalWatch(settings);
    return result;
  });

  ipcMain.handle('widimmer:reset', async () => {
    clearCriticalWatch();
    confirmedCriticalKey = '';
    lastAppliedKey = '';
    const monitors = await listMonitors();
    return restoreIdentityGamma(monitors);
  });

  startScheduleLoop();
  void loadWidimmerSettings().then((settings) => {
    latestSettings = settings;
    applyLiveNow(settings);
    armCriticalWatch(settings);
  });
}

export function teardownWidimmer(): void {
  clearCriticalWatch();
  confirmedCriticalKey = '';
  criticalConfirmOpen = false;
  if (criticalChoiceHandler) {
    ipcMain.removeListener('widimmer:critical-choice', criticalChoiceHandler);
    criticalChoiceHandler = null;
  }
  if (scheduleTimer) {
    clearInterval(scheduleTimer);
    scheduleTimer = null;
  }
  lastAppliedKey = '';
  // Restore screen as before dimmer (overlays off + identity gamma). Settings stay on disk.
  void restoreIdentityGamma();
}
