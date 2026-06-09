import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

let settingsWindow: BrowserWindow | null = null;

function getPreloadPath(): string {
  return join(app.getAppPath(), 'dist', 'preload', 'preload.js');
}

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}

export function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 560,
    height: 620,
    minWidth: 480,
    minHeight: 520,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    autoHideMenuBar: true,
    title: 'WI-Print',
    backgroundColor: '#151826',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  void settingsWindow.loadFile(join('dist', 'renderer', 'settings.html'));
}

export function closeSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
}
