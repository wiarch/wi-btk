import { BrowserWindow, screen } from 'electron';
import { distPath, shellPreload } from '../../../shared/paths';

let drawWindow: BrowserWindow | null = null;

export function getDrawWindow(): BrowserWindow | null {
  return drawWindow && !drawWindow.isDestroyed() ? drawWindow : null;
}

export function isDrawWindowOpen(): boolean {
  return Boolean(getDrawWindow()?.isVisible());
}

export function openDrawWindow(): BrowserWindow {
  const existing = getDrawWindow();
  if (existing) {
    if (!existing.isVisible()) {
      existing.show();
    }
    existing.focus();
    return existing;
  }

  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  drawWindow = new BrowserWindow({
    width: Math.min(1280, width),
    height: Math.min(860, height),
    minWidth: 720,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    title: 'WI-Draw',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: shellPreload('preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  drawWindow.once('ready-to-show', () => {
    drawWindow?.show();
  });

  drawWindow.on('closed', () => {
    drawWindow = null;
    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.webContents.send('widraw:openState', { open: false });
      }
    }
  });

  void drawWindow.loadFile(distPath('apps', 'widraw', 'renderer', 'draw.html'));
  return drawWindow;
}

export function closeDrawWindow(): void {
  const win = getDrawWindow();
  if (win) {
    win.close();
  }
}

export function toggleDrawWindow(): boolean {
  if (isDrawWindowOpen()) {
    closeDrawWindow();
    return false;
  }
  openDrawWindow();
  return true;
}
