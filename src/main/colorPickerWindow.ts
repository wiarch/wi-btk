import { app, BrowserWindow, ipcMain, type IpcMainEvent } from 'electron';
import { join } from 'node:path';
import { nativeImage } from 'electron';
import { getDictionary } from '../shared/i18n';
import type { Language } from '../shared/settings';
import { log } from './logger';

let colorPickerWindow: BrowserWindow | null = null;
let colorPickerReady = false;
let onSessionEnd: (() => void) | null = null;

export function setColorPickerSessionEndCallback(callback: () => void): void {
  onSessionEnd = callback;
}

function getColorPickerHtmlPath(): string {
  return join(app.getAppPath(), 'dist', 'renderer', 'colorPicker.html');
}

function endColorPickerSession(): void {
  onSessionEnd?.();
}

export function closeColorPicker(): void {
  if (colorPickerWindow && !colorPickerWindow.isDestroyed()) {
    colorPickerWindow.hide();
  }
  endColorPickerSession();
}

export function destroyColorPicker(): void {
  if (colorPickerWindow && !colorPickerWindow.isDestroyed()) {
    colorPickerWindow.destroy();
  }
  colorPickerWindow = null;
  colorPickerReady = false;
}

function waitForColorPickerContentReady(win: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    const webContentsId = win.webContents.id;

    const timeout = setTimeout(() => {
      ipcMain.removeListener('colorpicker:content-ready', onReady);
      void log('color picker content ready timeout, continuing anyway');
      resolve();
    }, 8000);

    function onReady(event: IpcMainEvent): void {
      if (event.sender.id !== webContentsId) {
        return;
      }

      clearTimeout(timeout);
      ipcMain.removeListener('colorpicker:content-ready', onReady);
      resolve();
    }

    ipcMain.on('colorpicker:content-ready', onReady);
  });
}

function waitForColorPickerShellReady(win: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    const webContentsId = win.webContents.id;

    const timeout = setTimeout(() => {
      ipcMain.removeListener('colorpicker:shell-ready', onReady);
      void log('color picker shell ready timeout, continuing anyway');
      resolve();
    }, 5000);

    function onReady(event: IpcMainEvent): void {
      if (event.sender.id !== webContentsId) {
        return;
      }

      clearTimeout(timeout);
      ipcMain.removeListener('colorpicker:shell-ready', onReady);
      resolve();
    }

    ipcMain.on('colorpicker:shell-ready', onReady);
  });
}

function createColorPickerShell(
  bounds: { x: number; y: number; width: number; height: number },
  preloadPath: string,
): BrowserWindow {
  const win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    focusable: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.on('closed', () => {
    colorPickerWindow = null;
    colorPickerReady = false;
    endColorPickerSession();
  });

  return win;
}

export async function prewarmColorPickerWindow(
  bounds: { x: number; y: number; width: number; height: number },
  preloadPath: string,
): Promise<void> {
  if (colorPickerReady && colorPickerWindow && !colorPickerWindow.isDestroyed()) {
    return;
  }

  colorPickerWindow = createColorPickerShell(bounds, preloadPath);
  const readyPromise = waitForColorPickerShellReady(colorPickerWindow);
  await colorPickerWindow.loadFile(getColorPickerHtmlPath());
  await readyPromise;
  colorPickerReady = true;
  await log('color picker prewarmed');
}

export type ColorPickerOpenOptions = {
  panelMode?: boolean;
};

export async function openColorPicker(
  imageBuffer: Buffer,
  bounds: { x: number; y: number; width: number; height: number },
  preloadPath: string,
  language: Language,
  options: ColorPickerOpenOptions = {},
): Promise<void> {
  if (!colorPickerReady || !colorPickerWindow || colorPickerWindow.isDestroyed()) {
    await prewarmColorPickerWindow(bounds, preloadPath);
  }

  if (!colorPickerWindow) {
    throw new Error('Color picker window unavailable');
  }

  const image = nativeImage.createFromBuffer(imageBuffer);
  const imageSize = image.getSize();
  if (imageSize.width < 1 || imageSize.height < 1) {
    throw new Error('Captured image is empty');
  }

  const imageUrl = `data:image/png;base64,${image.toPNG().toString('base64')}`;
  const labels = getDictionary(language).colorPicker;

  colorPickerWindow.hide();
  colorPickerWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
  colorPickerWindow.setAlwaysOnTop(true, 'screen-saver');

  const contentReady = waitForColorPickerContentReady(colorPickerWindow);
  colorPickerWindow.webContents.send('colorpicker:start', {
    imageUrl,
    width: imageSize.width,
    height: imageSize.height,
    labels,
    panelMode: options.panelMode === true,
  });
  await contentReady;

  colorPickerWindow.show();
  colorPickerWindow.focus();
}
