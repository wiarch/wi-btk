import { BrowserWindow, clipboard, ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import { loadWicolorSettings, saveWicolorSettings } from './settingsStore';
import {
  mergeWicolorSettings,
  type WicolorSettings,
} from '../../../shared/settings/wicolor';

let pickScreenHandler: (() => void) | null = null;

export function setWicolorPickScreenHandler(handler: (() => void) | null): void {
  pickScreenHandler = handler;
}

function broadcastSettings(settings: WicolorSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('wicolor:settingsChanged', settings);
    }
  }
}

export function broadcastPickedColor(hex: string): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('wicolor:picked', hex);
    }
  }
}

export function setupWicolorIpc(onSettingsSaved?: (settings: WicolorSettings) => void): void {
  ipcMain.handle('wicolor:getSettings', async () => loadWicolorSettings());

  ipcMain.handle('wicolor:saveSettings', async (_event, raw: Partial<WicolorSettings>) => {
    try {
      const settings = mergeWicolorSettings(raw);
      await saveWicolorSettings(settings);
      broadcastSettings(settings);
      onSettingsSaved?.(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('wicolor:pickScreen', async () => {
    if (!pickScreenHandler) {
      return { ok: false as const, error: 'Screen picker unavailable' };
    }
    pickScreenHandler();
    return { ok: true as const };
  });

  ipcMain.handle('wicolor:copyHex', async (_event, hex: string) => {
    const value = String(hex ?? '').trim();
    if (!value) {
      return { ok: false as const };
    }
    clipboard.writeText(value);
    notifySimple('WI-Color', value);
    return { ok: true as const };
  });

  ipcMain.on('wicolor:notify', (_event, message: string) => {
    notifySimple('WI-Color', String(message));
  });
}

export function teardownWicolor(): void {
  pickScreenHandler = null;
}
