import { BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import {
  isValidAccelerator,
  normalizeForElectron,
} from '../../wirec/main/hotkeys';
import {
  applyWibuttonEngine,
  getRemapStatus,
  onRemapStatus,
  shutdownWibuttonEngine,
} from './buttonEngine';
import { loadWibuttonSettings, saveWibuttonSettings } from './settingsStore';
import {
  mergeWibuttonSettings,
  type WibuttonSettings,
} from '../../../shared/settings/wibutton';

let registeredHotkey: string | null = null;
let statusForwardStarted = false;
let appEnabled = true;

function broadcastStatus(): void {
  const status = getRemapStatus();
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) {
      continue;
    }
    win.webContents.send('wibutton:status', status);
  }
}

function ensureStatusForward(): void {
  if (statusForwardStarted) {
    return;
  }
  statusForwardStarted = true;
  onRemapStatus(() => broadcastStatus());
}

async function applyCurrent(settings?: WibuttonSettings): Promise<void> {
  const current = settings ?? (await loadWibuttonSettings());
  const result = await applyWibuttonEngine(current, appEnabled);
  if (!result.ok && result.error) {
    notifySimple('WI-Button', result.error);
  }
  broadcastStatus();
}

export function setWibuttonAppEnabled(enabled: boolean): void {
  appEnabled = enabled;
  void applyCurrent();
}

export function registerWibuttonHotkeys(settings: WibuttonSettings, enabled: boolean): void {
  appEnabled = enabled;

  if (registeredHotkey) {
    try {
      globalShortcut.unregister(registeredHotkey);
    } catch {
      // ignore
    }
    registeredHotkey = null;
  }

  void applyCurrent(settings);

  if (!enabled) {
    return;
  }

  const accelerator = normalizeForElectron(settings.toggleHotkey);
  if (!accelerator || !isValidAccelerator(accelerator)) {
    return;
  }

  try {
    const ok = globalShortcut.register(accelerator, () => {
      void loadWibuttonSettings().then(async (current) => {
        const next = { ...current, remappingEnabled: !current.remappingEnabled };
        await saveWibuttonSettings(next);
        await applyCurrent(next);
        notifySimple('WI-Button', next.remappingEnabled ? 'Remapping ON' : 'Remapping OFF');
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) {
            win.webContents.send('wibutton:settingsChanged', next);
          }
        }
      });
    });
    if (ok) {
      registeredHotkey = accelerator;
    }
  } catch {
    // ignore
  }
}

export function setupWibuttonIpc(onSettingsSaved: (settings: WibuttonSettings) => void): void {
  ensureStatusForward();

  ipcMain.handle('wibutton:getSettings', async () => loadWibuttonSettings());

  ipcMain.handle('wibutton:saveSettings', async (_event, raw: Partial<WibuttonSettings>) => {
    try {
      const settings = mergeWibuttonSettings(raw);
      await saveWibuttonSettings(settings);
      onSettingsSaved(settings);
      await applyCurrent(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('wibutton:status', async () => getRemapStatus());

  ipcMain.handle('wibutton:toggleRemap', async () => {
    const current = await loadWibuttonSettings();
    const next = { ...current, remappingEnabled: !current.remappingEnabled };
    await saveWibuttonSettings(next);
    onSettingsSaved(next);
    await applyCurrent(next);
    return { ok: true as const, settings: next };
  });

  ipcMain.on('wibutton:notify', (_event, message: string) => {
    notifySimple('WI-Button', String(message));
  });
}

export function teardownWibutton(): void {
  shutdownWibuttonEngine();
  if (registeredHotkey) {
    try {
      globalShortcut.unregister(registeredHotkey);
    } catch {
      // ignore
    }
    registeredHotkey = null;
  }
}
