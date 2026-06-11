import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  type IpcMainEvent,
  Menu,
  nativeImage,
  net,
  protocol,
  screen,
  Tray,
} from 'electron';
import { access, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bootLog, getBootLogPath } from './bootLog';
import { applyLaunchAtStartup } from './autostart';

bootLog('main module loaded');
import { buildCaptureSavePath, getBaseSaveDirectory } from './capturePaths';
import { encodeCaptureForClipboard, encodeCaptureForSave } from './imageEncode';
import { captureScreenElectron } from './captureElectron';
import { assignHotkeyWithConflictCheck } from './hotkeyAssign';
import {
  findDuplicateHotkeys,
  isHotkeyAvailable,
  isSafeGlobalAccelerator,
  isValidAccelerator,
  normalizeAccelerator,
  normalizeForElectron,
} from './hotkeys';
import { log } from './logger';
import {
  closeColorPicker,
  destroyColorPicker,
  openColorPicker,
  prewarmColorPickerWindow,
  setColorPickerSessionEndCallback,
} from './colorPickerWindow';
import { playCaptureSound } from './captureSound';
import { notifyCaptureSaved, notifySimple } from './notifications';
import { closeSettingsWindow, openSettingsWindow } from './settingsWindow';
import { loadSettings, saveSettings } from './settingsStore';
import { getTrayIconPath } from './trayIcon';
import { previewCaptureFilename } from '../shared/filenameFormat';
import { getDictionary, hotkeyLabel, t } from '../shared/i18n';
import type { AppSettings, HotkeyAction, Language } from '../shared/settings';
import { DEFAULT_SETTINGS, GLOBAL_HOTKEY_ACTIONS, OVERLAY_HOTKEY_ACTIONS } from '../shared/settings';

let overlayWindow: BrowserWindow | null = null;
let overlayReady = false;
let keepAliveWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let captureInProgress = false;
let currentCapturePath: string | null = null;
let isQuitting = false;
let currentSettings: AppSettings | null = null;

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.wiarch.wirec');
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();
bootLog(`single instance lock: ${gotSingleInstanceLock ? 'acquired' : 'denied'}`);

if (!gotSingleInstanceLock) {
  app.whenReady().then(() => {
    dialog.showMessageBox({
      type: 'info',
      title: 'WI-Rec',
      message: 'WI-Rec is already running',
      detail: 'Check the system tray icon next to the clock.',
      buttons: ['OK'],
    });
    app.quit();
  });
}

function setupProcessErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    void log(`uncaughtException: ${error.message}`);
    dialog.showErrorBox('WI-Rec', error.message);
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    void log(`unhandledRejection: ${message}`);
    dialog.showErrorBox('WI-Rec', message);
  });
}

setupProcessErrorHandlers();

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'wirec',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      bypassCSP: true,
    },
  },
]);

function getSettings(): AppSettings {
  if (!currentSettings) {
    throw new Error('Settings not loaded');
  }
  return currentSettings;
}

function getPreloadPath(): string {
  return join(app.getAppPath(), 'dist', 'preload', 'preload.js');
}

function getOverlayHtmlPath(): string {
  return join(app.getAppPath(), 'dist', 'renderer', 'overlay.html');
}

function formatHotkeyForUi(accelerator: string): string {
  return accelerator
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/PrintScreen/g, 'PrtSc');
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
    overlayWindow.hide();
  }
  void clearCaptureFile();
}

function destroyOverlay(): void {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
  }
  overlayWindow = null;
  overlayReady = false;
  void clearCaptureFile();
}

function showError(message: string): void {
  notifySimple('WI-Rec', message);
  dialog.showErrorBox('WI-Rec', message);
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
    const prefix = 'wirec://capture/';
    if (!requestUrl.startsWith(prefix)) {
      return null;
    }

    return decodeURIComponent(requestUrl.slice(prefix.length));
  }
}

async function captureImage(): Promise<Buffer> {
  const errors: string[] = [];

  if (process.platform === 'linux' || process.platform === 'win32') {
    try {
      const { captureScreen } = await import('./capture');
      const buffer = await captureScreen();
      await log(`capture ok via platform snapshot (${buffer.length} bytes)`);
      return buffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`platform snapshot: ${message}`);
    }
  }

  try {
    const buffer = await captureScreenElectron();
    await log(`capture ok via desktopCapturer (${buffer.length} bytes)`);
    return buffer;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(`desktopCapturer: ${message}`);
  }

  throw new Error(errors.join('\n'));
}

function buildOverlayPayload(
  imageUrl: string,
  imageSize: { width: number; height: number },
  bounds: { width: number; height: number },
  fullScreen: boolean,
): Record<string, unknown> {
  const settings = getSettings();
  const dict = getDictionary(settings.language);

  return {
    imageUrl,
    width: imageSize.width,
    height: imageSize.height,
    displayWidth: bounds.width,
    displayHeight: bounds.height,
    language: settings.language,
    captureFullScreen: fullScreen,
    hotkeys: {
      arrow: settings.hotkeys.arrow,
      rect: settings.hotkeys.rect,
      save: settings.hotkeys.save,
      copy: settings.hotkeys.copy,
      cancel: settings.hotkeys.cancel,
    },
    overlayLabels: dict.overlay,
    hotkeyDisplay: {
      arrow: formatHotkeyForUi(settings.hotkeys.arrow),
      rect: formatHotkeyForUi(settings.hotkeys.rect),
      copy: formatHotkeyForUi(settings.hotkeys.copy),
      save: formatHotkeyForUi(settings.hotkeys.save),
      close: formatHotkeyForUi(settings.hotkeys.cancel),
    },
    saveAsJpeg: settings.saveAsJpeg,
    jpegQuality: settings.jpegQuality,
  };
}

function waitForOverlayReady(win: BrowserWindow): Promise<void> {
  return new Promise((resolve) => {
    const webContentsId = win.webContents.id;

    const timeout = setTimeout(() => {
      ipcMain.removeListener('overlay:ready', onReady);
      void log('overlay ready timeout, sending payload anyway');
      resolve();
    }, 5000);

    function onReady(event: IpcMainEvent): void {
      if (event.sender.id !== webContentsId) {
        return;
      }

      clearTimeout(timeout);
      ipcMain.removeListener('overlay:ready', onReady);
      resolve();
    }

    ipcMain.on('overlay:ready', onReady);
  });
}

function createOverlayShell(): BrowserWindow {
  const bounds = getVirtualBounds();
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
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.setMenuBarVisibility(false);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.on('closed', () => {
    overlayWindow = null;
    overlayReady = false;
    void clearCaptureFile();
  });

  return win;
}

async function prewarmOverlayWindow(): Promise<void> {
  if (overlayReady && overlayWindow && !overlayWindow.isDestroyed()) {
    return;
  }

  overlayWindow = createOverlayShell();
  const readyPromise = waitForOverlayReady(overlayWindow);
  await overlayWindow.loadFile(getOverlayHtmlPath());
  await readyPromise;
  overlayReady = true;
  await log('overlay prewarmed');
}

async function openOverlay(imageBuffer: Buffer, fullScreen: boolean): Promise<void> {
  if (!overlayReady || !overlayWindow || overlayWindow.isDestroyed()) {
    await prewarmOverlayWindow();
  }

  if (!overlayWindow) {
    throw new Error('Overlay window unavailable');
  }

  const image = nativeImage.createFromBuffer(imageBuffer);
  const imageSize = image.getSize();
  if (imageSize.width < 1 || imageSize.height < 1) {
    throw new Error('Captured image is empty');
  }

  const bounds = getVirtualBounds();
  const settings = getSettings();
  const encoded = encodeCaptureForSave(image, settings);
  const mime = settings.saveAsJpeg ? 'image/jpeg' : 'image/png';
  const imageUrl = `data:${mime};base64,${encoded.toString('base64')}`;

  overlayWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height });
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');

  const payload = buildOverlayPayload(imageUrl, imageSize, bounds, fullScreen);
  overlayWindow.show();
  overlayWindow.focus();
  overlayWindow.webContents.send('screenshot-ready', payload);
}

async function saveFullScreenCapture(imageBuffer: Buffer): Promise<void> {
  const settings = getSettings();
  const image = nativeImage.createFromBuffer(imageBuffer);
  const filePath = await buildCaptureSavePath(settings, 'completa');

  await writeFile(filePath, encodeCaptureForSave(image, settings));
  clipboard.writeImage(nativeImage.createFromBuffer(encodeCaptureForClipboard(image)));
  notifyCaptureSaved(
    settings.language,
    'notifications.fullScreenCaptured',
    'notifications.fullScreenCapturedHint',
    filePath,
  );
  playCaptureSound(settings);
}

async function triggerColorPicker(source: string, panelMode = false): Promise<void> {
  if (captureInProgress) {
    await log(`color picker ignored (${source}): already in progress`);
    return;
  }

  captureInProgress = true;
  await log(`color picker started (${source})`);

  try {
    closeOverlay();
    closeColorPicker();
    const imageBuffer = await captureImage();
    const bounds = getVirtualBounds();
    const settings = getSettings();
    await openColorPicker(imageBuffer, bounds, getPreloadPath(), settings.language, { panelMode });
    await log('color picker opened');
  } catch (error) {
    captureInProgress = false;
    const settings = getSettings();
    const message = error instanceof Error ? error.message : String(error);
    await log(`color picker failed (${source}): ${message}`);
    showError(t(settings.language, 'errors.captureFailed', { message }));
  }
}

async function triggerCapture(source: string, fullScreen = false): Promise<void> {
  if (captureInProgress) {
    await log(`capture ignored (${source}): already in progress`);
    return;
  }

  captureInProgress = true;
  await log(`capture started (${source}, fullScreen=${fullScreen})`);

  try {
    closeOverlay();
    closeColorPicker();
    const imageBuffer = await captureImage();

    if (fullScreen) {
      await saveFullScreenCapture(imageBuffer);
      await log('full screen capture saved and copied');
      return;
    }

    await openOverlay(imageBuffer, false);
    await log('overlay opened');
  } catch (error) {
    const settings = getSettings();
    const message = error instanceof Error ? error.message : String(error);
    await log(`capture failed (${source}): ${message}`);
    showError(t(settings.language, 'errors.captureFailed', { message }));
  } finally {
    captureInProgress = false;
  }
}

function registerHotkey(): void {
  const settings = getSettings();
  globalShortcut.unregisterAll();

  for (const action of GLOBAL_HOTKEY_ACTIONS) {
    const accelerator = normalizeForElectron(settings.hotkeys[action]);
    if (!accelerator || !isValidAccelerator(accelerator)) {
      void log(`hotkey skipped (${action}): not assigned`);
      continue;
    }

    if (!isSafeGlobalAccelerator(accelerator)) {
      void log(`hotkey skipped (${action}): unsafe single key ${accelerator}`);
      continue;
    }

    const registered = globalShortcut.register(accelerator, () => {
      if (action === 'colorPicker') {
        void triggerColorPicker(`hotkey:${action}`);
        return;
      }

      if (action === 'colorPickerPanel') {
        void triggerColorPicker(`hotkey:${action}`, true);
        return;
      }

      void triggerCapture(`hotkey:${action}`, action === 'captureFullScreen');
    });

    if (!registered) {
      void log(`hotkey registration failed (${action}): ${accelerator}`);
      const detail =
        action === 'captureFullScreen' && accelerator.includes('PrintScreen')
          ? ` ${t(settings.language, 'notifications.hotkeyUbuntuConflict')}`
          : '';
      notifySimple(
        'WI-Rec',
        `${t(settings.language, 'notifications.hotkeyUnavailable', {
          hotkey: formatHotkeyForUi(accelerator),
        })}${detail}`,
      );
    } else {
      void log(`hotkey registered (${action}): ${accelerator}`);
    }
  }
}

async function applySettings(settings: AppSettings): Promise<void> {
  currentSettings = settings;
  await saveSettings(settings);
  await applyLaunchAtStartup(settings.launchAtStartup);
  registerHotkey();
  rebuildTray();
}

function rebuildTray(): void {
  const settings = getSettings();
  const captureHotkey = formatHotkeyForUi(settings.hotkeys.capture);

  if (!tray) {
    return;
  }

  tray.setToolTip(t(settings.language, 'tray.tooltip', { hotkey: captureHotkey }));

  const contextMenu = Menu.buildFromTemplate([
    {
      label: t(settings.language, 'tray.capture'),
      click: () => {
        void triggerCapture('tray-menu', false);
      },
    },
    {
      label: `${t(settings.language, 'tray.captureFullScreen')} (${formatHotkeyForUi(settings.hotkeys.captureFullScreen)})`,
      click: () => {
        void triggerCapture('tray-menu-full', true);
      },
    },
    {
      label: `${t(settings.language, 'tray.colorPicker')} (${formatHotkeyForUi(settings.hotkeys.colorPicker)})`,
      click: () => {
        void triggerColorPicker('tray-menu');
      },
    },
    {
      label: `${t(settings.language, 'tray.colorPickerPanel')} (${formatHotkeyForUi(settings.hotkeys.colorPickerPanel)})`,
      click: () => {
        void triggerColorPicker('tray-menu-panel', true);
      },
    },
    {
      label: t(settings.language, 'tray.settings'),
      click: () => {
        openSettingsWindow();
      },
    },
    { type: 'separator' },
    {
      label: t(settings.language, 'tray.quit'),
      click: () => {
        quitApp();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
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
    if (!isQuitting) {
      event.preventDefault();
    }
  });
}

function quitApp(): void {
  isQuitting = true;
  destroyOverlay();
  destroyColorPicker();
  closeSettingsWindow();
  app.quit();
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function maybeShowWindowsTrayHint(language: Language): Promise<void> {
  if (process.platform !== 'win32') {
    return;
  }

  const marker = join(app.getPath('userData'), '.tray-hint-shown');
  if (await fileExists(marker)) {
    return;
  }

  await dialog.showMessageBox({
    type: 'info',
    title: t(language, 'notifications.trayHintTitle'),
    message: t(language, 'notifications.trayHintTitle'),
    detail: t(language, 'notifications.trayHintBody'),
    buttons: ['OK'],
  });

  await writeFile(marker, '1', 'utf8').catch(() => undefined);
}

function createTray(): void {
  const settings = getSettings();
  const iconPath = getTrayIconPath();
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    void log(`tray icon missing at ${iconPath}, using fallback`);
    icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAMElEQVR4Ae3OMQEAAAgDINc/9K3hYwAAAAAAAAAAAAAAAAAAAADgXwNTAAE8h3fYAAAAAElFTkSuQmCC',
    );
  }

  tray = new Tray(icon.resize({ width: 22, height: 22 }));
  rebuildTray();

  tray.on('click', () => {
    void triggerCapture('tray-click');
  });

  tray.on('double-click', () => {
    void triggerCapture('tray-double-click');
  });

  notifySimple(
    'WI-Rec',
    t(settings.language, 'notifications.active', {
      hotkey: formatHotkeyForUi(settings.hotkeys.capture),
    }),
  );
}

function setupIpc(): void {
  ipcMain.handle(
    'overlay:save',
    async (_event, payload: { imageBase64: string; edited: boolean }) => {
      const settings = getSettings();
      closeOverlay();

      const raw = Buffer.from(payload.imageBase64, 'base64');
      const category = payload.edited ? 'edit' : 'rango';
      const filePath = await buildCaptureSavePath(settings, category);
      await writeFile(filePath, encodeCaptureForSave(raw, settings));
      notifyCaptureSaved(
        settings.language,
        'notifications.saved',
        'notifications.savedHint',
        filePath,
      );
      playCaptureSound(settings);
    },
  );

  ipcMain.handle(
    'overlay:copy',
    async (_event, payload: { imageBase64: string; edited: boolean }) => {
      const settings = getSettings();
      closeOverlay();

      const raw = Buffer.from(payload.imageBase64, 'base64');
      clipboard.writeImage(
        nativeImage.createFromBuffer(encodeCaptureForClipboard(raw)),
      );

      if (settings.autoSaveCaptures) {
        const category = payload.edited ? 'edit' : 'rango';
        const filePath = await buildCaptureSavePath(settings, category);
        await writeFile(filePath, encodeCaptureForSave(raw, settings));
        notifyCaptureSaved(
          settings.language,
          'notifications.copiedAndSaved',
          'notifications.copiedAndSavedHint',
          filePath,
        );
        playCaptureSound(settings);
        return;
      }

      notifySimple('WI-Rec', t(settings.language, 'notifications.copied'));
      playCaptureSound(settings);
    },
  );

  ipcMain.on('overlay:cancel', () => {
    closeOverlay();
  });

  ipcMain.on('colorpicker:cancel', () => {
    closeColorPicker();
  });

  ipcMain.handle('colorpicker:copy', (_event, hex: string) => {
    const settings = getSettings();
    clipboard.writeText(hex);
    notifySimple('WI-Rec', t(settings.language, 'notifications.colorCopied', { hex }));
  });

  ipcMain.handle('settings:get', () => {
    return getSettings();
  });

  ipcMain.handle('settings:getUi', (_event, language: AppSettings['language']) => {
    return getDictionary(language).settings;
  });

  ipcMain.handle(
    'settings:assignHotkey',
    async (
      _event,
      payload: {
        action: HotkeyAction;
        accelerator: string;
        hotkeys: AppSettings['hotkeys'];
        language: AppSettings['language'];
      },
    ) => {
      const result = await assignHotkeyWithConflictCheck(
        payload.language,
        payload.action,
        payload.accelerator,
        payload.hotkeys,
      );
      if (result.ok) {
        await applySettings({ ...getSettings(), hotkeys: result.hotkeys });
      }
      return result;
    },
  );

  ipcMain.handle('settings:save', async (_event, settings: AppSettings) => {
    const language = settings.language;
    const normalizedHotkeys = Object.fromEntries(
      Object.entries(settings.hotkeys).map(([action, value]) => [
        action,
        value ? normalizeAccelerator(value) : '',
      ]),
    ) as AppSettings['hotkeys'];

    for (const action of OVERLAY_HOTKEY_ACTIONS) {
      if (!normalizedHotkeys[action]) {
        normalizedHotkeys[action] = DEFAULT_SETTINGS.hotkeys[action];
      }
    }

    const nextSettings: AppSettings = {
      language: settings.language,
      launchAtStartup: settings.launchAtStartup,
      autoSaveCaptures: settings.autoSaveCaptures,
      saveDirectory: settings.saveDirectory.trim(),
      useCaptureSubfolders: settings.useCaptureSubfolders,
      saveAsJpeg: settings.saveAsJpeg,
      jpegQuality: Math.min(100, Math.max(50, Math.round(settings.jpegQuality))),
      filenameMode: settings.filenameMode,
      filenameDateStyle: settings.filenameDateStyle,
      filenameTimeStyle: settings.filenameTimeStyle,
      captureSoundEnabled: settings.captureSoundEnabled,
      captureSoundPreset: settings.captureSoundPreset,
      hotkeys: normalizedHotkeys,
    };

    for (const action of GLOBAL_HOTKEY_ACTIONS) {
      const accelerator = normalizedHotkeys[action];
      if (!accelerator || !isValidAccelerator(accelerator)) {
        return {
          ok: false as const,
          error: t(language, 'settings.hotkeyRequired', {
            action: hotkeyLabel(language, action),
          }),
        };
      }

      if (!isSafeGlobalAccelerator(accelerator)) {
        return {
          ok: false as const,
          error: t(language, 'settings.hotkeyNeedsModifierBody', {
            hotkey: formatHotkeyForUi(accelerator),
            target: hotkeyLabel(language, action),
          }),
        };
      }
    }

    for (const [action, accelerator] of Object.entries(normalizedHotkeys) as [
      HotkeyAction,
      string,
    ][]) {
      if (!accelerator) {
        continue;
      }

      if (!isValidAccelerator(accelerator)) {
        return {
          ok: false as const,
          error: t(language, 'settings.hotkeyInvalid', {
            hotkey: formatHotkeyForUi(accelerator),
          }),
        };
      }
    }

    const duplicate = findDuplicateHotkeys(normalizedHotkeys);
    if (duplicate) {
      return {
        ok: false as const,
        error: t(language, 'settings.hotkeyConflict', {
          hotkey: formatHotkeyForUi(duplicate),
        }),
      };
    }

    const current = getSettings();
    for (const action of GLOBAL_HOTKEY_ACTIONS) {
      const accelerator = normalizedHotkeys[action];
      if (!isHotkeyAvailable(accelerator, current.hotkeys[action])) {
        return {
          ok: false as const,
          error: t(language, 'settings.hotkeyConflict', {
            hotkey: formatHotkeyForUi(accelerator),
          }),
        };
      }
    }

    await applySettings(nextSettings);
    return { ok: true as const };
  });

  ipcMain.handle('settings:getResolvedSaveDirectory', () => {
    return getBaseSaveDirectory(getSettings());
  });

  ipcMain.handle('settings:previewFilename', (_event, draft: AppSettings) => {
    return previewCaptureFilename(draft);
  });

  ipcMain.handle('settings:browseSaveDirectory', async () => {
    const settings = getSettings();
    const result = await dialog.showOpenDialog({
      title: t(settings.language, 'settings.saveDirectory'),
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.on('settings:close', () => {
    closeSettingsWindow();
  });

  ipcMain.handle('settings:previewCaptureSound', (_event, draft: AppSettings) => {
    playCaptureSound(draft);
  });
}

if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    const language = currentSettings?.language ?? DEFAULT_SETTINGS.language;
    dialog.showMessageBox({
      type: 'info',
      title: t(language, 'notifications.alreadyRunningTitle'),
      message: t(language, 'notifications.alreadyRunningTitle'),
      detail: t(language, 'notifications.alreadyRunningBody'),
      buttons: ['OK'],
    });
  });

  app.whenReady().then(async () => {
    try {
      bootLog(`app ready, packaged=${app.isPackaged}, exe=${process.execPath}`);
      bootLog(`app path=${app.getAppPath()}, log=${getBootLogPath()}`);

      if (process.platform === 'linux') {
        app.setName('WI-Rec');
      }

      currentSettings = await loadSettings();
      bootLog('settings loaded');
      await applyLaunchAtStartup(currentSettings.launchAtStartup);

      protocol.handle('wirec', (request) => {
        const filePath = resolveCaptureFilePath(request.url);
        if (!filePath) {
          return new Response('Not found', { status: 404 });
        }

        return net.fetch(pathToFileURL(filePath).toString());
      });

      setupIpc();
      setColorPickerSessionEndCallback(() => {
        captureInProgress = false;
      });
      createKeepAliveWindow();
      bootLog('keep-alive window created');
      createTray();
      bootLog('tray created');
      registerHotkey();
      bootLog('hotkeys registered');
      await prewarmOverlayWindow();
      bootLog('overlay prewarmed');
      await prewarmColorPickerWindow(getVirtualBounds(), getPreloadPath());
      bootLog('color picker prewarmed');
      await maybeShowWindowsTrayHint(currentSettings.language);

      await log('app ready');
      bootLog('startup complete');

      app.on('activate', () => {
        registerHotkey();
      });
    } catch (error) {
      const language = currentSettings?.language ?? DEFAULT_SETTINGS.language;
      const message = error instanceof Error ? error.message : String(error);
      bootLog(`startup failed: ${message}`);
      await log(`startup failed: ${message}`);
      showError(`${t(language, 'errors.startupFailed', { message })}\n\nLog: ${getBootLogPath()}`);
      app.quit();
    }
  });
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (keepAliveWindow && !keepAliveWindow.isDestroyed()) {
    keepAliveWindow.destroy();
  }
  tray?.destroy();
});

app.on('window-all-closed', () => undefined);
