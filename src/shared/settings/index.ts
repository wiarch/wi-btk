import { DEFAULT_SHELL_SETTINGS, mergeAppEnablement, type ShellSettings } from './shell';
import { DEFAULT_WIREC_SETTINGS, type WirecSettings } from './wirec';

export type { Language, HotkeyAction, RecordFormat, RecordQuality, RecordFrameRate } from './types';
export type {
  FilenameMode,
  FilenameDateStyle,
  FilenameTimeStyle,
  CaptureSoundPreset,
} from './types';

export type { ShellSettings, AppEnablement } from './shell';
export {
  DEFAULT_SHELL_SETTINGS,
  SHELL_APP_ID,
  mergeAppEnablement,
} from './shell';

export {
  isAppEnabled,
  MICRO_APP_IDS,
  DEFAULT_APP_ENABLEMENT,
  ensureAppInEnablement,
} from '../apps/registry';

export type { WirecSettings } from './wirec';
export {
  DEFAULT_WIREC_SETTINGS,
  WIREC_APP_ID,
  RECORD_FORMATS,
  RECORD_QUALITIES,
  RECORD_FRAME_RATES,
  RECORD_BITRATES,
  CAPTURE_SOUND_PRESETS,
  GLOBAL_HOTKEY_ACTIONS,
  OVERLAY_HOTKEY_ACTIONS,
  RECORDING_HOTKEY_ACTIONS,
  getRecordMimeType,
  getRecordingFileExtension,
} from './wirec';

/** Combined settings used by the shell UI (shell + wirec). */
export type AppSettings = ShellSettings & WirecSettings;

export const DEFAULT_SETTINGS: AppSettings = {
  ...DEFAULT_SHELL_SETTINGS,
  ...DEFAULT_WIREC_SETTINGS,
};

export function pickShellSettings(settings: AppSettings): ShellSettings {
  return {
    language: settings.language,
    launchAtStartup: settings.launchAtStartup,
    sidebarIconsOnly: settings.sidebarIconsOnly,
    enabledApps: mergeAppEnablement(settings.enabledApps),
  };
}

export function pickWirecSettings(settings: AppSettings): WirecSettings {
  return {
    autoSaveCaptures: settings.autoSaveCaptures,
    saveDirectory: settings.saveDirectory,
    useCaptureSubfolders: settings.useCaptureSubfolders,
    saveAsJpeg: settings.saveAsJpeg,
    jpegQuality: settings.jpegQuality,
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
    hotkeys: settings.hotkeys,
  };
}

export function mergeAppSettings(shell: ShellSettings, wirec: WirecSettings): AppSettings {
  return { ...shell, ...wirec };
}
