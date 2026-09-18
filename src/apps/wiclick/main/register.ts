import { BrowserWindow, globalShortcut, ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import {
  isValidAccelerator,
  normalizeForElectron,
} from '../../wirec/main/hotkeys';
import {
  getClickerStatus,
  getCursorPoint,
  onClickerStatus,
  shutdownClicker,
  startClicker,
  stopClicker,
  toggleClicker,
} from './clickEngine';
import { loadWiclickSettings, saveWiclickSettings } from './settingsStore';
import {
  mergeWiclickSettings,
  type WiclickSettings,
} from '../../../shared/settings/wiclick';

let registeredHotkey: string | null = null;
let statusForwardStarted = false;

function broadcastStatus(): void {
  const status = getClickerStatus();
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) {
      continue;
    }
    win.webContents.send('wiclick:status', status);
  }
}

function ensureStatusForward(): void {
  if (statusForwardStarted) {
    return;
  }
  statusForwardStarted = true;
  onClickerStatus(() => {
    broadcastStatus();
  });
}

export function registerWiclickHotkeys(settings: WiclickSettings, enabled: boolean): void {
  if (registeredHotkey) {
    try {
      globalShortcut.unregister(registeredHotkey);
    } catch {
      // ignore
    }
    registeredHotkey = null;
  }

  if (!enabled) {
    return;
  }

  const accelerator = normalizeForElectron(settings.hotkey);
  if (!accelerator || !isValidAccelerator(accelerator)) {
    return;
  }

  try {
    const ok = globalShortcut.register(accelerator, () => {
      void loadWiclickSettings().then((current) => toggleClicker(current)).then((result) => {
        if (!result.ok && result.error) {
          notifySimple('WI-Click', result.error);
        }
        broadcastStatus();
      });
    });
    if (ok) {
      registeredHotkey = accelerator;
    }
  } catch {
    // ignore conflicts
  }
}

export function setupWiclickIpc(onSettingsSaved: (settings: WiclickSettings) => void): void {
  ensureStatusForward();

  ipcMain.handle('wiclick:getSettings', async () => loadWiclickSettings());

  ipcMain.handle('wiclick:saveSettings', async (_event, raw: Partial<WiclickSettings>) => {
    try {
      const settings = mergeWiclickSettings(raw);
      await saveWiclickSettings(settings);
      onSettingsSaved(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('wiclick:start', async (_event, raw?: Partial<WiclickSettings>) => {
    const settings = mergeWiclickSettings(raw ?? (await loadWiclickSettings()));
    await saveWiclickSettings(settings);
    const result = await startClicker(settings);
    broadcastStatus();
    return result;
  });

  ipcMain.handle('wiclick:stop', async () => {
    stopClicker();
    broadcastStatus();
    return { ok: true as const };
  });

  ipcMain.handle('wiclick:toggle', async (_event, raw?: Partial<WiclickSettings>) => {
    const settings = mergeWiclickSettings(raw ?? (await loadWiclickSettings()));
    await saveWiclickSettings(settings);
    const result = await toggleClicker(settings);
    broadcastStatus();
    return result;
  });

  ipcMain.handle('wiclick:status', async () => getClickerStatus());

  ipcMain.handle('wiclick:getCursor', async () => getCursorPoint());

  ipcMain.handle('wiclick:pickLocation', async () => {
    notifySimple('WI-Click', 'Place the cursor… capturing in 2s');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const point = getCursorPoint();
    notifySimple('WI-Click', `Position X:${point.x} Y:${point.y}`);
    return point;
  });

  ipcMain.on('wiclick:notify', (_event, message: string) => {
    notifySimple('WI-Click', String(message));
  });
}

export function teardownWiclick(): void {
  shutdownClicker();
  if (registeredHotkey) {
    try {
      globalShortcut.unregister(registeredHotkey);
    } catch {
      // ignore
    }
    registeredHotkey = null;
  }
}
