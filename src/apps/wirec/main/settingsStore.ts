import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  CAPTURE_SOUND_PRESETS,
  DEFAULT_WIREC_SETTINGS,
  GLOBAL_HOTKEY_ACTIONS,
  RECORD_FORMATS,
  RECORD_FRAME_RATES,
  RECORD_QUALITIES,
  WIREC_APP_ID,
  type WirecSettings,
} from '../../../shared/settings';
import { appConfigDir } from '../../../shared/paths';
import { isSafeGlobalAccelerator } from './hotkeys';

function settingsPath(): string {
  return join(appConfigDir(WIREC_APP_ID), 'settings.json');
}

function mergeWirecSettings(
  partial: Partial<WirecSettings> & { captureFullScreen?: boolean },
): WirecSettings {
  const hotkeys = {
    ...DEFAULT_WIREC_SETTINGS.hotkeys,
    ...(partial.hotkeys ?? {}),
  };

  if (partial.captureFullScreen === true && !partial.hotkeys?.captureFullScreen) {
    hotkeys.captureFullScreen = DEFAULT_WIREC_SETTINGS.hotkeys.captureFullScreen;
  }

  for (const action of GLOBAL_HOTKEY_ACTIONS) {
    if (hotkeys[action] && !isSafeGlobalAccelerator(hotkeys[action])) {
      hotkeys[action] = DEFAULT_WIREC_SETTINGS.hotkeys[action];
    }
  }

  const legacyFullScreen = hotkeys.captureFullScreen;
  if (
    legacyFullScreen === 'PrintScreen' ||
    legacyFullScreen === 'Ctrl+PrintScreen' ||
    legacyFullScreen === 'Ctrl+Print Screen'
  ) {
    hotkeys.captureFullScreen = DEFAULT_WIREC_SETTINGS.hotkeys.captureFullScreen;
  }

  return {
    autoSaveCaptures: partial.autoSaveCaptures ?? DEFAULT_WIREC_SETTINGS.autoSaveCaptures,
    saveDirectory: partial.saveDirectory ?? DEFAULT_WIREC_SETTINGS.saveDirectory,
    useCaptureSubfolders:
      partial.useCaptureSubfolders ?? DEFAULT_WIREC_SETTINGS.useCaptureSubfolders,
    saveAsJpeg: partial.saveAsJpeg ?? DEFAULT_WIREC_SETTINGS.saveAsJpeg,
    jpegQuality: partial.jpegQuality ?? DEFAULT_WIREC_SETTINGS.jpegQuality,
    filenameMode: partial.filenameMode ?? DEFAULT_WIREC_SETTINGS.filenameMode,
    filenameDateStyle: partial.filenameDateStyle ?? DEFAULT_WIREC_SETTINGS.filenameDateStyle,
    filenameTimeStyle: partial.filenameTimeStyle ?? DEFAULT_WIREC_SETTINGS.filenameTimeStyle,
    captureSoundEnabled:
      partial.captureSoundEnabled ?? DEFAULT_WIREC_SETTINGS.captureSoundEnabled,
    captureSoundPreset: CAPTURE_SOUND_PRESETS.includes(partial.captureSoundPreset as never)
      ? (partial.captureSoundPreset as WirecSettings['captureSoundPreset'])
      : DEFAULT_WIREC_SETTINGS.captureSoundPreset,
    recordDesktopAudio: partial.recordDesktopAudio ?? DEFAULT_WIREC_SETTINGS.recordDesktopAudio,
    recordMicEnabled: partial.recordMicEnabled ?? DEFAULT_WIREC_SETTINGS.recordMicEnabled,
    recordMicDeviceId: partial.recordMicDeviceId ?? DEFAULT_WIREC_SETTINGS.recordMicDeviceId,
    recordFormat: RECORD_FORMATS.includes(partial.recordFormat as never)
      ? (partial.recordFormat as WirecSettings['recordFormat'])
      : DEFAULT_WIREC_SETTINGS.recordFormat,
    recordQuality: RECORD_QUALITIES.includes(partial.recordQuality as never)
      ? (partial.recordQuality as WirecSettings['recordQuality'])
      : DEFAULT_WIREC_SETTINGS.recordQuality,
    recordFrameRate: RECORD_FRAME_RATES.includes(partial.recordFrameRate as never)
      ? (partial.recordFrameRate as WirecSettings['recordFrameRate'])
      : DEFAULT_WIREC_SETTINGS.recordFrameRate,
    hotkeys,
  };
}

export async function loadWirecSettings(): Promise<WirecSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWirecSettings(JSON.parse(raw) as Partial<WirecSettings>);
  } catch {
    return { ...DEFAULT_WIREC_SETTINGS, hotkeys: { ...DEFAULT_WIREC_SETTINGS.hotkeys } };
  }
}

export async function saveWirecSettings(settings: WirecSettings): Promise<void> {
  const dir = appConfigDir(WIREC_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}
