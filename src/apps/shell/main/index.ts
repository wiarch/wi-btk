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
  session,
  Tray,
} from 'electron';
import { unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bootLog, getBootLogPath } from './bootLog';
import { applyCaptureWindowLayer, getCaptureBounds, presentCaptureWindow, type ScreenBounds } from '../../wirec/main/captureWindowLayer';
import { compositorSettle } from '../../wirec/main/compositorSettle';
import { applyLaunchAtStartup } from './autostart';

bootLog('main module loaded');
import {
  buildCaptureSavePath,
  buildLoomSavePath,
  buildRecordingSavePath,
  buildVoiceSavePath,
  getBaseSaveDirectory,
} from '../../wirec/main/capturePaths';
import { encodeCaptureForClipboard, encodeCaptureForSave } from '../../wirec/main/imageEncode';
import { captureScreenElectron } from '../../wirec/main/captureElectron';
import { assignHotkeyWithConflictCheck } from '../../wirec/main/hotkeyAssign';
import {
  findDuplicateHotkeys,
  isHotkeyAvailable,
  isSafeGlobalAccelerator,
  isValidAccelerator,
  normalizeAccelerator,
  normalizeForElectron,
} from '../../wirec/main/hotkeys';
import { log } from '../../../shared/logger';
import {
  closeColorPicker,
  destroyColorPicker,
  openColorPicker,
  prewarmColorPickerWindow,
  setColorPickerSessionEndCallback,
} from '../../wirec/main/colorPickerWindow';
import { clearRecordingMediaHandler, setRecordingMediaHandler } from '../../wirec/main/recordingCapture';
import {
  closeRecording,
  destroyRecording,
  openRecording,
  openVoiceRecording,
  prewarmRecordingWindow,
  setRecordingLiveMode,
  setRecordingMousePassthrough,
  setRecordingSessionEndCallback,
} from '../../wirec/main/recordingWindow';
import { playCaptureSound, playRecordingSound, type RecordingSoundCue } from '../../wirec/main/captureSound';
import { notifyCaptureSaved, notifySimple } from './notifications';
import { closeSettingsWindow, openSettingsWindow } from './settingsWindow';
import { loadSettings, saveSettings } from './settingsStore';
import { loadTrayIcon } from './trayIcon';
import { registerWideviceHotkeys, setupWideviceIpc } from '../../widevice/main/register';
import { loadWideviceSettings } from '../../widevice/main/settingsStore';
import { registerWiclickHotkeys, setupWiclickIpc, teardownWiclick } from '../../wiclick/main/register';
import { loadWiclickSettings } from '../../wiclick/main/settingsStore';
import { registerWidrawHotkeys, setupWidrawIpc, teardownWidraw } from '../../widraw/main/register';
import { loadWidrawSettings } from '../../widraw/main/settingsStore';
import { registerWibuttonHotkeys, setupWibuttonIpc, teardownWibutton } from '../../wibutton/main/register';
import { loadWibuttonSettings } from '../../wibutton/main/settingsStore';
import { setupWiboosterIpc, teardownWibooster } from '../../wibooster/main/register';
import { setupWicalcIpc, teardownWicalc } from '../../wicalc/main/register';
import { setupWiclockIpc, teardownWiclock, setWiclockAppEnabled } from '../../wiclock/main/register';
import { setupWinotesIpc, teardownWinotes } from '../../winotes/main/register';
import { setupWirateIpc, teardownWirate } from '../../wirate/main/register';
import { setupWinetestIpc, teardownWinetest } from '../../winetest/main/register';
import { setupWicamIpc, teardownWicam } from '../../wicam/main/register';
import {
  setupWicolorIpc,
  teardownWicolor,
  setWicolorPickScreenHandler,
  broadcastPickedColor,
} from '../../wicolor/main/register';
import {
  setupWiviewIpc,
  teardownWiview,
  registerWiviewHotkeys,
  setWiviewQuickOpenHandler,
  triggerWiviewQuickOpen,
} from '../../wiview/main/register';
import { loadWiviewSettings } from '../../wiview/main/settingsStore';
import { setupWiremoteIpc, teardownWiremote } from '../../wiremote/main/register';
import { setupWiweatherIpc, teardownWiweather } from '../../wiweather/main/register';
import {
  setupWiwidgetIpc,
  teardownWiwidget,
  setWiwidgetAppEnabled,
  restoreWiwidgetWindows,
} from '../../wiwidget/main/register';
import { setupWisystemIpc, teardownWisystem } from '../../wisystem/main/register';
import {
  setupWidimmerIpc,
  teardownWidimmer,
  setWidimmerAppEnabled,
} from '../../widimmer/main/register';
import { setupWitranslateIpc, teardownWitranslate } from '../../witranslate/main/register';
import { setupPopoutIpc, teardownPopouts } from './popout';
import { previewCaptureFilename } from '../../../shared/filenameFormat';
import { getDictionary, hotkeyLabel, t } from '../../../shared/i18n';
import type { AppSettings, HotkeyAction, Language } from '../../../shared/settings';
import {
  DEFAULT_SETTINGS,
  GLOBAL_HOTKEY_ACTIONS,
  OVERLAY_HOTKEY_ACTIONS,
  RECORDING_HOTKEY_ACTIONS,
  isAppEnabled,
  mergeAppEnablement,
} from '../../../shared/settings';
import { shellPreload, wirecRenderer } from '../../../shared/paths';

let overlayWindow: BrowserWindow | null = null;
let overlayReady = false;
let keepAliveWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let captureInProgress = false;
let recordingLiveActive = false;
let currentCapturePath: string | null = null;
let isQuitting = false;
let currentSettings: AppSettings | null = null;

if (process.platform === 'linux') {
  app.commandLine.appendSwitch('enable-features', 'WebRTCPipeWireCapturer');
}

if (process.platform === 'win32') {
  app.setAppUserModelId('WI-BTK');
}

app.setName('WI-BTK');


const gotSingleInstanceLock = app.requestSingleInstanceLock();
bootLog(`single instance lock: ${gotSingleInstanceLock ? 'acquired' : 'denied'}`);

if (!gotSingleInstanceLock) {
  app.whenReady().then(() => {
    dialog.showMessageBox({
      type: 'info',
      title: 'WI-BTK',
      message: 'WI-BTK is already running',
      detail: 'Check the system tray icon next to the clock.',
      buttons: ['OK'],
    });
    app.quit();
  });
}

function setupProcessErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    void log(`uncaughtException: ${error.message}`);
    dialog.showErrorBox('WI-BTK', error.message);
  });

  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    void log(`unhandledRejection: ${message}`);
    dialog.showErrorBox('WI-BTK', message);
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
  {
    scheme: 'wiview',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
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
  return shellPreload('preload.js');
}

function getOverlayHtmlPath(): string {
  return wirecRenderer('overlay.html');
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
  notifySimple('WI-BTK', message);
  dialog.showErrorBox('WI-BTK', message);
}

function getVirtualBounds(): ScreenBounds {
  return getCaptureBounds();
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
      const { captureScreen } = await import('../../wirec/main/capture');
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
    snipLabels: dict.snip,
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
  applyCaptureWindowLayer(win);
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

  const payload = buildOverlayPayload(imageUrl, imageSize, bounds, fullScreen);
  await presentCaptureWindow(overlayWindow);
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

let windowsHiddenForPicker: BrowserWindow[] = [];

function hideAppWindowsForPicker(): void {
  windowsHiddenForPicker = [];
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed() && win.isVisible()) {
      windowsHiddenForPicker.push(win);
      win.hide();
    }
  }
}

function restoreAppWindowsAfterPicker(): void {
  for (const win of windowsHiddenForPicker) {
    if (!win.isDestroyed()) {
      win.showInactive();
    }
  }
  windowsHiddenForPicker = [];
}

async function prepareForScreenCapture(): Promise<void> {
  closeOverlay();
  closeColorPicker();
  closeRecording();
  registerHotkey();
  await compositorSettle();
}

async function triggerColorPicker(source: string, panelMode = false): Promise<void> {
  const settings = getSettings();
  const wirecOn = isAppEnabled(settings.enabledApps, 'wirec');
  const wicolorOn = isAppEnabled(settings.enabledApps, 'wicolor');
  if (!wirecOn && !wicolorOn) {
    await log(`color picker ignored (${source}): wirec/wicolor disabled`);
    return;
  }
  if (recordingLiveActive) {
    await log(`color picker ignored (${source}): recording live`);
    return;
  }
  if (captureInProgress) {
    await log(`color picker ignored (${source}): already in progress`);
    return;
  }

  captureInProgress = true;
  await log(`color picker started (${source})`);

  try {
    await prepareForScreenCapture();
    hideAppWindowsForPicker();
    await compositorSettle(220);
    const imageBuffer = await captureImage();
    const bounds = getVirtualBounds();
    await openColorPicker(imageBuffer, bounds, getPreloadPath(), settings.language, { panelMode });
    await log('color picker opened');
  } catch (error) {
    captureInProgress = false;
    restoreAppWindowsAfterPicker();
    const message = error instanceof Error ? error.message : String(error);
    await log(`color picker failed (${source}): ${message}`);
    showError(t(settings.language, 'errors.captureFailed', { message }));
  }
}

async function triggerScreenRecord(source: string, mode: 'screen' | 'loom' = 'screen'): Promise<void> {
  if (!isAppEnabled(getSettings().enabledApps, 'wirec')) {
    await log(`screen record ignored (${source}): wirec disabled`);
    return;
  }
  if (recordingLiveActive) {
    await log(`screen record ignored (${source}): recording live`);
    return;
  }
  if (captureInProgress) {
    await log(`screen record ignored (${source}): already in progress`);
    return;
  }

  captureInProgress = true;
  await log(`screen record started (${source}, mode=${mode})`);

  try {
    await prepareForScreenCapture();
    const imageBuffer = await captureImage();
    const bounds = getVirtualBounds();
    const settings = getSettings();
    await openRecording(imageBuffer, bounds, getPreloadPath(), settings, mode);
    await log('recording opened');
  } catch (error) {
    captureInProgress = false;
    clearRecordingMediaHandler();
    const settings = getSettings();
    const message = error instanceof Error ? error.message : String(error);
    await log(`screen record failed (${source}): ${message}`);
    showError(t(settings.language, 'errors.captureFailed', { message }));
  }
}

async function triggerLoomRecord(source: string): Promise<void> {
  await triggerScreenRecord(source, 'loom');
}

async function triggerVoiceRecord(source: string): Promise<void> {
  if (!isAppEnabled(getSettings().enabledApps, 'wirec')) {
    await log(`voice record ignored (${source}): wirec disabled`);
    return;
  }
  if (recordingLiveActive) {
    await log(`voice record ignored (${source}): recording live`);
    return;
  }
  if (captureInProgress) {
    await log(`voice record ignored (${source}): already in progress`);
    return;
  }

  captureInProgress = true;
  await log(`voice record started (${source})`);

  try {
    const bounds = getVirtualBounds();
    const settings = getSettings();
    await openVoiceRecording(bounds, getPreloadPath(), settings);
    await log('voice recording opened');
  } catch (error) {
    captureInProgress = false;
    const settings = getSettings();
    const message = error instanceof Error ? error.message : String(error);
    await log(`voice record failed (${source}): ${message}`);
    showError(t(settings.language, 'errors.captureFailed', { message }));
  }
}

async function triggerCapture(source: string, fullScreen = false): Promise<void> {
  if (!isAppEnabled(getSettings().enabledApps, 'wirec')) {
    await log(`capture ignored (${source}): wirec disabled`);
    return;
  }
  if (recordingLiveActive) {
    await log(`capture ignored (${source}): recording live`);
    return;
  }
  if (captureInProgress) {
    await log(`capture ignored (${source}): already in progress`);
    return;
  }

  captureInProgress = true;
  await log(`capture started (${source}, fullScreen=${fullScreen})`);

  try {
    await prepareForScreenCapture();
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

  const wirecOn = isAppEnabled(settings.enabledApps, 'wirec');
  const wicolorOn = isAppEnabled(settings.enabledApps, 'wicolor');
  const colorHotkeys = new Set<HotkeyAction>(['colorPicker', 'colorPickerPanel']);

  if (wirecOn || wicolorOn) {
    const actions = [...GLOBAL_HOTKEY_ACTIONS].reverse();

    for (const action of actions) {
      if (!wirecOn && !colorHotkeys.has(action)) {
        continue;
      }

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

        if (action === 'screenRecord') {
          void triggerScreenRecord(`hotkey:${action}`);
          return;
        }

        if (action === 'voiceRecord') {
          void triggerVoiceRecord(`hotkey:${action}`);
          return;
        }

        void triggerCapture(`hotkey:${action}`, action === 'captureFullScreen');
      });

      if (!registered) {
        void log(`hotkey registration failed (${action}): ${accelerator}`);
      } else {
        void log(`hotkey registered (${action}): ${accelerator}`);
      }
    }
  } else {
    void log('wirec/wicolor disabled — global capture hotkeys skipped');
  }

  void loadWideviceSettings()
    .then((wideviceSettings) => {
      if (!isAppEnabled(getSettings().enabledApps, 'widevice')) {
        registerWideviceHotkeys({ ...wideviceSettings, hotkeysEnabled: false });
        return;
      }
      registerWideviceHotkeys(wideviceSettings);
    })
    .catch(() => undefined);

  void loadWiclickSettings()
    .then((wiclickSettings) => {
      registerWiclickHotkeys(
        wiclickSettings,
        isAppEnabled(getSettings().enabledApps, 'wiclick'),
      );
    })
    .catch(() => undefined);

  void loadWidrawSettings()
    .then((widrawSettings) => {
      registerWidrawHotkeys(
        widrawSettings,
        isAppEnabled(getSettings().enabledApps, 'widraw'),
      );
    })
    .catch(() => undefined);

  void loadWibuttonSettings()
    .then((wibuttonSettings) => {
      registerWibuttonHotkeys(
        wibuttonSettings,
        isAppEnabled(getSettings().enabledApps, 'wibutton'),
      );
    })
    .catch(() => undefined);

  void loadWiviewSettings()
    .then((wiviewSettings) => {
      registerWiviewHotkeys(
        wiviewSettings,
        isAppEnabled(getSettings().enabledApps, 'wiview'),
      );
    })
    .catch(() => undefined);

  setWiclockAppEnabled(isAppEnabled(getSettings().enabledApps, 'wiclock'));
  setWidimmerAppEnabled(isAppEnabled(getSettings().enabledApps, 'widimmer'));
  setWiwidgetAppEnabled(isAppEnabled(getSettings().enabledApps, 'wiwidget'));
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
  const wirecOn = isAppEnabled(settings.enabledApps, 'wirec');

  if (!tray) {
    return;
  }

  tray.setToolTip(
    wirecOn
      ? t(settings.language, 'tray.tooltip', { hotkey: captureHotkey })
      : 'WI-BTK',
  );

  const items: Electron.MenuItemConstructorOptions[] = [];

  if (wirecOn) {
    items.push(
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
        label: `${t(settings.language, 'tray.screenRecord')} (${formatHotkeyForUi(settings.hotkeys.screenRecord)})`,
        click: () => {
          void triggerScreenRecord('tray-menu');
        },
      },
      {
        label: `${t(settings.language, 'tray.voiceRecord')} (${formatHotkeyForUi(settings.hotkeys.voiceRecord)})`,
        click: () => {
          void triggerVoiceRecord('tray-menu');
        },
      },
      {
        label: t(settings.language, 'tray.wiview'),
        click: () => {
          void triggerWiviewQuickOpen();
        },
      },
      { type: 'separator' },
    );
  }

  items.push(
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
  );

  tray.setContextMenu(Menu.buildFromTemplate(items));
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

function createTray(): void {
  const settings = getSettings();
  const icon = loadTrayIcon((reason) => {
    void log(`${reason}, using embedded fallback`);
  });

  tray = new Tray(icon);
  rebuildTray();

  tray.on('click', () => {
    if (recordingLiveActive) {
      return;
    }
    openSettingsWindow();
  });

  tray.on('double-click', () => {
    openSettingsWindow();
  });

  notifySimple('WI-BTK', t(settings.language, 'notifications.active'));
}

function setupIpc(): void {
  setupWideviceIpc((wideviceSettings) => {
    registerWideviceHotkeys(
      isAppEnabled(getSettings().enabledApps, 'widevice')
        ? wideviceSettings
        : { ...wideviceSettings, hotkeysEnabled: false },
    );
  });

  setupWiclickIpc((wiclickSettings) => {
    registerWiclickHotkeys(
      wiclickSettings,
      isAppEnabled(getSettings().enabledApps, 'wiclick'),
    );
  });

  setupWidrawIpc((widrawSettings) => {
    registerWidrawHotkeys(
      widrawSettings,
      isAppEnabled(getSettings().enabledApps, 'widraw'),
    );
  });

  setupWibuttonIpc((wibuttonSettings) => {
    registerWibuttonHotkeys(
      wibuttonSettings,
      isAppEnabled(getSettings().enabledApps, 'wibutton'),
    );
  });

  setupWiboosterIpc();
  setupWicalcIpc();
  setupWiclockIpc();
  setupWinotesIpc();
  setupWirateIpc();
  setupWinetestIpc();
  setupWicamIpc();
  setupWicolorIpc();
  setWicolorPickScreenHandler(() => {
    void triggerColorPicker('wicolor', false);
  });
  ipcMain.handle('wicolor:getPickHotkey', () => {
    return formatHotkeyForUi(getSettings().hotkeys.colorPicker);
  });
  setupWiviewIpc((wiviewSettings) => {
    registerWiviewHotkeys(
      wiviewSettings,
      isAppEnabled(getSettings().enabledApps, 'wiview'),
    );
  });
  setWiviewQuickOpenHandler(() => {
    void triggerWiviewQuickOpen();
  });
  setupWiremoteIpc();
  setupWiweatherIpc();
  setupWiwidgetIpc();
  setupWisystemIpc();
  setupWidimmerIpc();
  setupWitranslateIpc();
  setupPopoutIpc(ipcMain);

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

      notifySimple('WI-BTK', t(settings.language, 'notifications.copied'));
      playCaptureSound(settings);
    },
  );

  ipcMain.on('overlay:cancel', () => {
    closeOverlay();
    captureInProgress = false;
  });

  ipcMain.on('overlay:switchToRecord', async () => {
    if (recordingLiveActive) {
      return;
    }
    closeOverlay();
    captureInProgress = true;
    try {
      const imageBuffer = await captureImage();
      const bounds = getVirtualBounds();
      const settings = getSettings();
      await openRecording(imageBuffer, bounds, getPreloadPath(), settings, 'screen');
    } catch (error) {
      captureInProgress = false;
      clearRecordingMediaHandler();
      const settings = getSettings();
      const message = error instanceof Error ? error.message : String(error);
      showError(t(settings.language, 'errors.captureFailed', { message }));
    }
  });

  ipcMain.on('overlay:switchToLoomRecord', () => {
    if (recordingLiveActive) {
      return;
    }
    closeOverlay();
    captureInProgress = false;
    void triggerLoomRecord('switch-from-overlay');
  });

  ipcMain.on('overlay:switchToVoiceRecord', () => {
    if (recordingLiveActive) {
      return;
    }
    closeOverlay();
    captureInProgress = false;
    void triggerVoiceRecord('switch-from-overlay');
  });

  ipcMain.on('colorpicker:cancel', () => {
    closeColorPicker();
  });

  ipcMain.handle('recording:prepareCapture', (_event, options: { desktopAudio: boolean }) => {
    setRecordingMediaHandler(options.desktopAudio);
  });

  ipcMain.handle('recording:releaseCapture', () => {
    clearRecordingMediaHandler();
  });

  ipcMain.handle('recording:enterLiveMode', () => {
    recordingLiveActive = true;
    setRecordingLiveMode(true);
  });

  ipcMain.handle('recording:exitLiveMode', () => {
    recordingLiveActive = false;
    setRecordingLiveMode(false);
  });

  ipcMain.on('recording:mousePassthrough', (_event, enabled: boolean) => {
    setRecordingMousePassthrough(enabled);
  });

  ipcMain.on('recording:playSound', (_event, cue: RecordingSoundCue) => {
    playRecordingSound(getSettings(), cue);
  });

  ipcMain.on('recording:switchToCapture', async () => {
    if (recordingLiveActive) {
      return;
    }
    clearRecordingMediaHandler();
    closeRecording();
    captureInProgress = true;
    try {
      const imageBuffer = await captureImage();
      await openOverlay(imageBuffer, false);
    } catch (error) {
      captureInProgress = false;
      const settings = getSettings();
      const message = error instanceof Error ? error.message : String(error);
      showError(t(settings.language, 'errors.captureFailed', { message }));
    }
  });

  ipcMain.on('recording:switchToScreenRecord', async () => {
    if (recordingLiveActive) {
      return;
    }
    clearRecordingMediaHandler();
    closeRecording();
    captureInProgress = false;
    void triggerScreenRecord('switch-from-voice');
  });

  ipcMain.on('recording:switchToLoomRecord', async () => {
    if (recordingLiveActive) {
      return;
    }
    clearRecordingMediaHandler();
    closeRecording();
    captureInProgress = false;
    void triggerLoomRecord('switch-from-recording');
  });

  ipcMain.handle(
    'recording:save',
    async (_event, buffer: ArrayBuffer, options?: { kind?: 'screen' | 'voice' | 'loom' }) => {
      clearRecordingMediaHandler();
      recordingLiveActive = false;
      const settings = getSettings();
      const kind = options?.kind === 'voice' ? 'voice' : options?.kind === 'loom' ? 'loom' : 'screen';
      const filePath =
        kind === 'voice'
          ? await buildVoiceSavePath(settings)
          : kind === 'loom'
            ? await buildLoomSavePath(settings)
            : await buildRecordingSavePath(settings);
      await writeFile(filePath, Buffer.from(buffer));
      const titleKey =
        kind === 'voice'
          ? 'notifications.voiceSaved'
          : kind === 'loom'
            ? 'notifications.loomSaved'
            : 'notifications.recordingSaved';
      const hintKey =
        kind === 'voice'
          ? 'notifications.voiceSavedHint'
          : kind === 'loom'
            ? 'notifications.loomSavedHint'
            : 'notifications.recordingSavedHint';
      notifyCaptureSaved(settings.language, titleKey, hintKey, filePath);
      playCaptureSound(settings);
      return filePath;
    },
  );

  ipcMain.handle(
    'recording:persistPreferences',
    async (
      _event,
      prefs: { desktopAudio: boolean; micEnabled: boolean; micDeviceId: string },
    ) => {
      if (!currentSettings) {
        return;
      }

      currentSettings = {
        ...currentSettings,
        recordDesktopAudio: prefs.desktopAudio,
        recordMicEnabled: prefs.micEnabled,
        recordMicDeviceId: prefs.micDeviceId,
      };
      await saveSettings(currentSettings);
    },
  );

  ipcMain.on('recording:cancel', () => {
    clearRecordingMediaHandler();
    recordingLiveActive = false;
    setRecordingLiveMode(false);
    closeRecording();
    captureInProgress = false;
  });

  ipcMain.handle('colorpicker:copy', (_event, hex: string) => {
    const settings = getSettings();
    clipboard.writeText(hex);
    notifySimple('WI-BTK', t(settings.language, 'notifications.colorCopied', { hex }));
    broadcastPickedColor(hex);
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

    for (const action of [...OVERLAY_HOTKEY_ACTIONS, ...RECORDING_HOTKEY_ACTIONS]) {
      if (!normalizedHotkeys[action]) {
        normalizedHotkeys[action] = DEFAULT_SETTINGS.hotkeys[action];
      }
    }

    const nextSettings: AppSettings = {
      language: settings.language,
      launchAtStartup: settings.launchAtStartup,
      sidebarIconsOnly: Boolean(settings.sidebarIconsOnly),
      enabledApps: mergeAppEnablement(settings.enabledApps),
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
      recordDesktopAudio: settings.recordDesktopAudio,
      recordMicEnabled: settings.recordMicEnabled,
      recordMicDeviceId: settings.recordMicDeviceId,
      recordFormat: settings.recordFormat,
      recordQuality: settings.recordQuality,
      recordFrameRate: settings.recordFrameRate,
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
        app.setName('WI-BTK');
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
      session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
        callback(permission === 'media' || permission === 'mediaKeySystem');
      });
      setColorPickerSessionEndCallback(() => {
        captureInProgress = false;
        restoreAppWindowsAfterPicker();
      });
      setRecordingSessionEndCallback(() => {
        captureInProgress = false;
        clearRecordingMediaHandler();
      });
      createKeepAliveWindow();
      bootLog('keep-alive window created');
      createTray();
      bootLog('tray created');
      registerHotkey();
      bootLog('hotkeys registered');
      if (process.platform === 'linux' && process.env.WAYLAND_DISPLAY) {
        bootLog('Wayland: z-order above panel may need compositor rules or X11 (electron --ozone-platform=x11)');
      }
      await prewarmOverlayWindow();
      bootLog('overlay prewarmed');
      await prewarmColorPickerWindow(getVirtualBounds(), getPreloadPath());
      bootLog('color picker prewarmed');
      await prewarmRecordingWindow(getVirtualBounds(), getPreloadPath());
      bootLog('recording prewarmed');

      await log('app ready');
      bootLog('startup complete');
      void restoreWiwidgetWindows().catch(() => undefined);

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
  // Drop dimmer overlays immediately so the desktop is not left dark
  teardownWidimmer();
});

app.on('will-quit', () => {
  teardownWiclick();
  teardownWidraw();
  teardownWibutton();
  teardownWibooster();
  teardownWicalc();
  teardownWiclock();
  teardownWinotes();
  teardownWirate();
  teardownWinetest();
  teardownWicam();
  teardownWicolor();
  teardownWiview();
  teardownWiremote();
  teardownWiweather();
  teardownWiwidget();
  teardownWisystem();
  teardownWidimmer();
  teardownWitranslate();
  teardownPopouts();
  globalShortcut.unregisterAll();
  clearRecordingMediaHandler();
  destroyRecording();
  destroyColorPicker();
  destroyOverlay();
  if (keepAliveWindow && !keepAliveWindow.isDestroyed()) {
    keepAliveWindow.destroy();
  }
  tray?.destroy();
});

app.on('window-all-closed', () => undefined);
