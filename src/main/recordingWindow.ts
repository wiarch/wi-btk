import { app, BrowserWindow, ipcMain, type IpcMainEvent } from 'electron';
import { join } from 'node:path';
import { nativeImage } from 'electron';
import { getDictionary } from '../shared/i18n';
import type { AppSettings, Language } from '../shared/settings';
import { log } from './logger';

let recordingWindow: BrowserWindow | null = null;
let recordingReady = false;
let onSessionEnd: (() => void) | null = null;

export function setRecordingSessionEndCallback(callback: () => void): void {
  onSessionEnd = callback;
}

function getRecordingHtmlPath(): string {
  return join(app.getAppPath(), 'dist', 'renderer', 'recording.html');
}

function endRecordingSession(): void {
  onSessionEnd?.();
}

export function closeRecording(): void {
  if (recordingWindow && !recordingWindow.isDestroyed()) {
    recordingWindow.hide();
  }
  endRecordingSession();
}

export function destroyRecording(): void {
  if (recordingWindow && !recordingWindow.isDestroyed()) {
    recordingWindow.destroy();
  }
  recordingWindow = null;
  recordingReady = false;
}

function waitForRecordingShellReady(win: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    const webContentsId = win.webContents.id;

    const timeout = setTimeout(() => {
      ipcMain.removeListener('recording:shell-ready', onReady);
      void log('recording shell ready timeout, continuing anyway');
      resolve();
    }, 5000);

    function onReady(event: IpcMainEvent): void {
      if (event.sender.id !== webContentsId) {
        return;
      }

      clearTimeout(timeout);
      ipcMain.removeListener('recording:shell-ready', onReady);
      resolve();
    }

    ipcMain.on('recording:shell-ready', onReady);
  });
}

function createRecordingShell(
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
    recordingWindow = null;
    recordingReady = false;
    endRecordingSession();
  });

  return win;
}

export async function prewarmRecordingWindow(
  bounds: { x: number; y: number; width: number; height: number },
  preloadPath: string,
): Promise<void> {
  if (recordingReady && recordingWindow && !recordingWindow.isDestroyed()) {
    return;
  }

  recordingWindow = createRecordingShell(bounds, preloadPath);
  const readyPromise = waitForRecordingShellReady(recordingWindow);
  await recordingWindow.loadFile(getRecordingHtmlPath());
  await readyPromise;
  recordingReady = true;
  await log('recording prewarmed');
}

export async function openRecording(
  imageBuffer: Buffer,
  bounds: { x: number; y: number; width: number; height: number },
  preloadPath: string,
  settings: AppSettings,
): Promise<void> {
  if (!recordingReady || !recordingWindow || recordingWindow.isDestroyed()) {
    await prewarmRecordingWindow(bounds, preloadPath);
  }

  if (!recordingWindow) {
    throw new Error('Recording window unavailable');
  }

  const image = nativeImage.createFromBuffer(imageBuffer);
  const imageSize = image.getSize();
  if (imageSize.width < 1 || imageSize.height < 1) {
    throw new Error('Captured image is empty');
  }

  const imageUrl = `data:image/png;base64,${image.toPNG().toString('base64')}`;
  const dict = getDictionary(settings.language);

  recordingWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
  recordingWindow.setAlwaysOnTop(true, 'screen-saver');
  recordingWindow.show();
  recordingWindow.focus();
  recordingWindow.webContents.send('recording:start', {
    imageUrl,
    width: imageSize.width,
    height: imageSize.height,
    snipLabels: dict.snip,
    labels: dict.recording,
    defaults: {
      desktopAudio: settings.recordDesktopAudio,
      micEnabled: settings.recordMicEnabled,
      micDeviceId: settings.recordMicDeviceId,
    },
  });
}
