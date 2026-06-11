import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';
import {
  AppSettings,
  CAPTURE_SOUND_PRESETS,
  DEFAULT_SETTINGS,
  GLOBAL_HOTKEY_ACTIONS,
  RECORD_FORMATS,
  RECORD_FRAME_RATES,
  RECORD_QUALITIES,
} from '../shared/settings';
import { isSafeGlobalAccelerator } from './hotkeys';

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

function mergeSettings(partial: Partial<AppSettings> & { captureFullScreen?: boolean }): AppSettings {
  const hotkeys = {
    ...DEFAULT_SETTINGS.hotkeys,
    ...(partial.hotkeys ?? {}),
  };

  if (partial.captureFullScreen === true && !partial.hotkeys?.captureFullScreen) {
    hotkeys.captureFullScreen = DEFAULT_SETTINGS.hotkeys.captureFullScreen;
  }

  for (const action of GLOBAL_HOTKEY_ACTIONS) {
    if (hotkeys[action] && !isSafeGlobalAccelerator(hotkeys[action])) {
      hotkeys[action] = DEFAULT_SETTINGS.hotkeys[action];
    }
  }

  const legacyFullScreen = hotkeys.captureFullScreen;
  if (
    legacyFullScreen === 'PrintScreen' ||
    legacyFullScreen === 'Ctrl+PrintScreen' ||
    legacyFullScreen === 'Ctrl+Print Screen'
  ) {
    hotkeys.captureFullScreen = DEFAULT_SETTINGS.hotkeys.captureFullScreen;
  }

  return {
    language: partial.language ?? DEFAULT_SETTINGS.language,
    launchAtStartup: partial.launchAtStartup ?? DEFAULT_SETTINGS.launchAtStartup,
    autoSaveCaptures: partial.autoSaveCaptures ?? DEFAULT_SETTINGS.autoSaveCaptures,
    saveDirectory: partial.saveDirectory ?? DEFAULT_SETTINGS.saveDirectory,
    useCaptureSubfolders: partial.useCaptureSubfolders ?? DEFAULT_SETTINGS.useCaptureSubfolders,
    saveAsJpeg: partial.saveAsJpeg ?? DEFAULT_SETTINGS.saveAsJpeg,
    jpegQuality: partial.jpegQuality ?? DEFAULT_SETTINGS.jpegQuality,
    filenameMode: partial.filenameMode ?? DEFAULT_SETTINGS.filenameMode,
    filenameDateStyle: partial.filenameDateStyle ?? DEFAULT_SETTINGS.filenameDateStyle,
    filenameTimeStyle: partial.filenameTimeStyle ?? DEFAULT_SETTINGS.filenameTimeStyle,
    captureSoundEnabled: partial.captureSoundEnabled ?? DEFAULT_SETTINGS.captureSoundEnabled,
    captureSoundPreset: CAPTURE_SOUND_PRESETS.includes(partial.captureSoundPreset as never)
      ? (partial.captureSoundPreset as AppSettings['captureSoundPreset'])
      : DEFAULT_SETTINGS.captureSoundPreset,
    recordDesktopAudio: partial.recordDesktopAudio ?? DEFAULT_SETTINGS.recordDesktopAudio,
    recordMicEnabled: partial.recordMicEnabled ?? DEFAULT_SETTINGS.recordMicEnabled,
    recordMicDeviceId: partial.recordMicDeviceId ?? DEFAULT_SETTINGS.recordMicDeviceId,
    recordFormat: RECORD_FORMATS.includes(partial.recordFormat as never)
      ? (partial.recordFormat as AppSettings['recordFormat'])
      : DEFAULT_SETTINGS.recordFormat,
    recordQuality: RECORD_QUALITIES.includes(partial.recordQuality as never)
      ? (partial.recordQuality as AppSettings['recordQuality'])
      : DEFAULT_SETTINGS.recordQuality,
    recordFrameRate: RECORD_FRAME_RATES.includes(partial.recordFrameRate as never)
      ? (partial.recordFrameRate as AppSettings['recordFrameRate'])
      : DEFAULT_SETTINGS.recordFrameRate,
    hotkeys,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const dir = app.getPath('userData');
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}
