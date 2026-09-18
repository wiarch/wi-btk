import { BrowserWindow, dialog, globalShortcut, ipcMain } from 'electron';
import { readFile } from 'node:fs/promises';
import { notifySimple } from '../../shell/main/notifications';
import {
  isValidAccelerator,
  normalizeForElectron,
} from '../../wirec/main/hotkeys';
import { closeDrawWindow, isDrawWindowOpen, openDrawWindow, toggleDrawWindow } from './drawWindow';
import {
  loadWidrawScene,
  loadWidrawSettings,
  saveWidrawScene,
  saveWidrawSettings,
} from './settingsStore';
import { mergeWidrawSettings, type WidrawSettings } from '../../../shared/settings/widraw';

let registeredHotkey: string | null = null;

function broadcastOpenState(): void {
  const open = isDrawWindowOpen();
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) {
      continue;
    }
    win.webContents.send('widraw:openState', { open });
  }
}

export function registerWidrawHotkeys(settings: WidrawSettings, enabled: boolean): void {
  if (registeredHotkey) {
    try {
      globalShortcut.unregister(registeredHotkey);
    } catch {
      // ignore
    }
    registeredHotkey = null;
  }

  if (!enabled || !settings.hotkeyEnabled) {
    return;
  }

  const accelerator = normalizeForElectron(settings.hotkey);
  if (!accelerator || !isValidAccelerator(accelerator)) {
    return;
  }

  try {
    const ok = globalShortcut.register(accelerator, () => {
      const open = toggleDrawWindow();
      broadcastOpenState();
      notifySimple('WI-Draw', open ? 'Opened' : 'Closed');
    });
    if (ok) {
      registeredHotkey = accelerator;
    }
  } catch {
    // ignore
  }
}

export function setupWidrawIpc(onSettingsSaved: (settings: WidrawSettings) => void): void {
  ipcMain.handle('widraw:getSettings', async () => loadWidrawSettings());

  ipcMain.handle('widraw:saveSettings', async (_event, raw: Partial<WidrawSettings>) => {
    try {
      const settings = mergeWidrawSettings(raw);
      await saveWidrawSettings(settings);
      onSettingsSaved(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('widraw:isOpen', async () => ({ open: isDrawWindowOpen() }));

  ipcMain.handle('widraw:open', async () => {
    openDrawWindow();
    broadcastOpenState();
    return { open: true as const };
  });

  ipcMain.handle('widraw:close', async () => {
    closeDrawWindow();
    broadcastOpenState();
    return { open: false as const };
  });

  ipcMain.handle('widraw:toggle', async () => {
    const open = toggleDrawWindow();
    broadcastOpenState();
    return { open };
  });

  ipcMain.handle('widraw:loadScene', async () => loadWidrawScene());

  ipcMain.handle('widraw:saveScene', async (_event, scene: unknown) => {
    await saveWidrawScene(scene);
    return { ok: true as const };
  });

  ipcMain.handle('widraw:pickImage', async () => {
    const result = await dialog.showOpenDialog({
      title: 'WI-Draw — Image',
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    const buffer = await readFile(filePath);
    const ext = filePath.split('.').pop()?.toLowerCase() ?? 'png';
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'gif'
          ? 'image/gif'
          : ext === 'webp'
            ? 'image/webp'
            : 'image/png';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  });

  ipcMain.on('widraw:notify', (_event, message: string) => {
    notifySimple('WI-Draw', String(message));
  });

  ipcMain.on('widraw:closed', () => {
    broadcastOpenState();
  });
}

export function teardownWidraw(): void {
  closeDrawWindow();
  if (registeredHotkey) {
    try {
      globalShortcut.unregister(registeredHotkey);
    } catch {
      // ignore
    }
    registeredHotkey = null;
  }
}
