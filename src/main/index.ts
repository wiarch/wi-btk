import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  net,
  Notification,
  protocol,
  screen,
  Tray,
} from 'electron';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureScreen } from './capture';
import { captureScreenElectron } from './captureElectron';
import { log } from './logger';
import { getTrayIconPath } from './trayIcon';

const HOTKEY = 'Alt+Shift+S';
let overlayWindow: BrowserWindow | null = null;
let keepAliveWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let captureInProgress = false;
let currentCapturePath: string | null = null;

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'wiprint',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);

function getPreloadPath(): string {
  return join(__dirname, '..', 'preload', 'preload.js');
}

function getOverlayHtmlPath(): string {
  return join(__dirname, '..', 'renderer', 'overlay.html');
}

async function clearCaptureFile(): Promise<void> {
  if (!currentCapturePath) {
    return;
  }

  await unlink(currentCapturePath).catch(() => undefined);
  currentCapturePath = null;
}

function closeOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.close();
  }
  overlayWindow = null;
  void clearCaptureFile();
}

async function defaultSavePath(): Promise<string> {
  const picturesDir = join(homedir(), 'Pictures', 'WI-Print');
  await mkdir(picturesDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return join(picturesDir, `WI-Print-${stamp}.png`);
}

function notify(title: string, body: string): void {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
}

function showError(message: string): void {
  notify('WI-Print', message);
  dialog.showErrorBox('WI-Print', message);
}

function getVirtualBounds(): { x: number; y: number; width: number; height: number } {
  const displays = screen.getAllDisplays();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const display of displays) {
    minX = Math.min(minX, display.bounds.x);
    minY = Math.min(minY, display.bounds.y);
    maxX = Math.max(maxX, display.bounds.x + display.bounds.width);
    maxY = Math.max(maxY, display.bounds.y + display.bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function resolveCaptureFilePath(requestUrl: string): string | null {
  try {
    const url = new URL(requestUrl);
    if (url.hostname !== 'capture') {
      return null;
    }

    const encoded = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    return decodeURIComponent(encoded);
  } catch {
    const prefix = 'wiprint://capture/';
    if (!requestUrl.startsWith(prefix)) {
      return null;
    }

    return decodeURIComponent(requestUrl.slice(prefix.length));
  }
}

async function captureImage(): Promise<Buffer> {
  const errors: string[] = [];

  try {
    const buffer = await captureScreenElectron();
    await log(`capture ok via desktopCapturer (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`desktopCapturer: ${message}`);
  }

  try {
    const buffer = await captureScreen();
    await log(`capture ok via fallback (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`fallback: ${message}`);
  }

  throw new Error(errors.join('\n'));
}

async function openOverlay(imageBuffer: Buffer): Promise<void> {
  closeOverlay();

  const image = nativeImage.createFromBuffer(imageBuffer);
  const imageSize = image.getSize();
  if (imageSize.width < 1 || imageSize.height < 1) {
    throw new Error('Captured image is empty');
  }

  const bounds = getVirtualBounds();
  const capturePath = join(app.getPath('temp'), `wi-print-capture-${Date.now()}.png`);
  await writeFile(capturePath, image.toPNG());
  currentCapturePath = capturePath;

  overlayWindow = new BrowserWindow({
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
    backgroundColor: '#111111',
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  overlayWindow.setMenuBarVisibility(false);
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  overlayWindow.on('closed', () => {
    overlayWindow = null;
    void clearCaptureFile();
  });

  const payload = {
    imageUrl: `wiprint://capture/${encodeURIComponent(capturePath)}`,
    width: imageSize.width,
    height: imageSize.height,
    displayWidth: bounds.width,
    displayHeight: bounds.height,
  };

  await overlayWindow.loadFile(getOverlayHtmlPath());

  overlayWindow.webContents.once('did-finish-load', () => {
    overlayWindow?.webContents.send('screenshot-ready', payload);
    overlayWindow?.show();
    overlayWindow?.focus();
  });
}

async function triggerCapture(source: string): Promise<void> {
  if (captureInProgress) {
    await log(`capture ignored (${source}): already in progress`);
    return;
  }

  captureInProgress = true;
  await log(`capture started (${source})`);

  try {
    const imageBuffer = await captureImage();
    await openOverlay(imageBuffer);
    await log('overlay opened');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await log(`capture failed (${source}): ${message}`);
    showError(`No se pudo capturar la pantalla:\n\n${message}`);
  } finally {
    captureInProgress = false;
  }
}

function registerHotkey(): void {
  if (globalShortcut.isRegistered(HOTKEY)) {
    globalShortcut.unregister(HOTKEY);
  }

  const registered = globalShortcut.register(HOTKEY, () => {
    void triggerCapture('hotkey');
  });

  if (!registered) {
    void log(`hotkey registration failed: ${HOTKEY}`);
    notify(
      'WI-Print',
      `${HOTKEY} no disponible. Usa click en bandeja → Capturar pantalla.`,
    );
  } else {
    void log(`hotkey registered: ${HOTKEY}`);
  }
}

function createKeepAliveWindow(): void {
  keepAliveWindow = new BrowserWindow({
    width: 1,
    height: 1,
    show: false,
    skipTaskbar: true,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  keepAliveWindow.on('close', (event) => {
    event.preventDefault();
  });
}

function createTray(): void {
  const iconPath = getTrayIconPath();
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    void log(`tray icon missing at ${iconPath}, using fallback`);
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAMElEQVR4Ae3OMQEAAAgDINc/9K3hYwAAAAAAAAAAAAAAAAAAAADgXwNTAAE8h3fYAAAAAElFTkSuQmCC',
    );
  }

  tray = new Tray(icon.resize({ width: 22, height: 22 }));
  tray.setToolTip('WI-Print — Alt+Shift+S');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Capturar pantalla',
      click: () => {
        void triggerCapture('tray-menu');
      },
    },
    { type: 'separator' },
    {
      label: 'Salir',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    void triggerCapture('tray-click');
  });

  tray.on('double-click', () => {
    void triggerCapture('tray-double-click');
  });
}

function setupIpc(): void {
  ipcMain.handle('overlay:save', async (_event, imageBase64: string) => {
    closeOverlay();

    const png = Buffer.from(imageBase64, 'base64');
    const filePath = await defaultSavePath();
    await writeFile(filePath, png);
    notify('WI-Print', `Guardado en ${filePath}`);
  });

  ipcMain.handle('overlay:copy', (_event, imageBase64: string) => {
    closeOverlay();

    const png = Buffer.from(imageBase64, 'base64');
    clipboard.writeImage(nativeImage.createFromBuffer(png));
    notify('WI-Print', 'Copiado al portapapeles');
  });

  ipcMain.on('overlay:cancel', () => {
    closeOverlay();
  });
}

app.whenReady().then(async () => {
  if (process.platform === 'linux') {
    app.setName('WI-Print');
  }

  protocol.handle('wiprint', (request) => {
    const filePath = resolveCaptureFilePath(request.url);
    if (!filePath) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(filePath).toString());
  });

  setupIpc();
  createKeepAliveWindow();
  createTray();
  registerHotkey();

  notify('WI-Print', 'Activo. Alt+Shift+S o click en bandeja.');
  await log('app ready');

  app.on('activate', () => {
    registerHotkey();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (keepAliveWindow && !keepAliveWindow.isDestroyed()) {
    keepAliveWindow.destroy();
  }
  tray?.destroy();
});

app.on('window-all-closed', () => undefined);
