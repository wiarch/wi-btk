import { BrowserWindow } from 'electron';
import { shellPreload, shellRenderer } from '../../../shared/paths';

let settingsWindow: BrowserWindow | null = null;

export function getSettingsWindow(): BrowserWindow | null {
  return settingsWindow;
}

export function openSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 1320,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    title: 'WI-BTK',
    backgroundColor: '#202020',
    roundedCorners: true,
    // mica can gray-out the maximize caption button on some Win11 + Electron builds
    webPreferences: {
      preload: shellPreload('preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  settingsWindow.setMaximizable(true);
  settingsWindow.setResizable(true);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  void settingsWindow.loadFile(shellRenderer('shell.html'));
}

export function closeSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.close();
  }
}
