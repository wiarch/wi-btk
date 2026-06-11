export type Language = 'en' | 'es';

export type HotkeyAction =
  | 'capture'
  | 'captureFullScreen'
  | 'colorPicker'
  | 'colorPickerPanel'
  | 'screenRecord'
  | 'arrow'
  | 'rect'
  | 'save'
  | 'copy'
  | 'cancel'
  | 'recordStart'
  | 'recordPause'
  | 'recordResume'
  | 'recordStop';

export type RecordFormat = 'webm-vp9' | 'webm-vp8' | 'webm';
export type RecordQuality = 'low' | 'medium' | 'high';
export type RecordFrameRate = 15 | 30 | 60;

export const RECORD_FORMATS: RecordFormat[] = ['webm-vp9', 'webm-vp8', 'webm'];
export const RECORD_QUALITIES: RecordQuality[] = ['low', 'medium', 'high'];
export const RECORD_FRAME_RATES: RecordFrameRate[] = [15, 30, 60];

export const RECORD_BITRATES: Record<RecordQuality, number> = {
  low: 2_500_000,
  medium: 5_000_000,
  high: 12_000_000,
};

export type FilenameMode = 'datetime' | 'sequential';
export type FilenameDateStyle = 'iso' | 'latin';
export type FilenameTimeStyle = 'h24' | 'h12';
export type CaptureSoundPreset = 'chime' | 'pop' | 'shutter' | 'ding';

export const CAPTURE_SOUND_PRESETS: CaptureSoundPreset[] = ['chime', 'pop', 'shutter', 'ding'];

export type AppSettings = {
  language: Language;
  launchAtStartup: boolean;
  autoSaveCaptures: boolean;
  saveDirectory: string;
  useCaptureSubfolders: boolean;
  saveAsJpeg: boolean;
  jpegQuality: number;
  filenameMode: FilenameMode;
  filenameDateStyle: FilenameDateStyle;
  filenameTimeStyle: FilenameTimeStyle;
  captureSoundEnabled: boolean;
  captureSoundPreset: CaptureSoundPreset;
  recordDesktopAudio: boolean;
  recordMicEnabled: boolean;
  recordMicDeviceId: string;
  recordFormat: RecordFormat;
  recordQuality: RecordQuality;
  recordFrameRate: RecordFrameRate;
  hotkeys: Record<HotkeyAction, string>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'es',
  launchAtStartup: false,
  autoSaveCaptures: false,
  saveDirectory: '',
  useCaptureSubfolders: true,
  saveAsJpeg: true,
  jpegQuality: 85,
  filenameMode: 'datetime',
  filenameDateStyle: 'iso',
  filenameTimeStyle: 'h24',
  captureSoundEnabled: true,
  captureSoundPreset: 'chime',
  recordDesktopAudio: false,
  recordMicEnabled: true,
  recordMicDeviceId: '',
  recordFormat: 'webm-vp9',
  recordQuality: 'medium',
  recordFrameRate: 30,
  hotkeys: {
    capture: 'Alt+Shift+S',
    captureFullScreen: 'Ctrl+Shift+F11',
    colorPicker: 'Alt+Shift+C',
    colorPickerPanel: 'Alt+Shift+V',
    screenRecord: 'Alt+Shift+R',
    arrow: 'A',
    rect: 'R',
    save: 'CommandOrControl+S',
    copy: 'CommandOrControl+C',
    cancel: 'Escape',
    recordStart: 'Enter',
    recordPause: 'F2',
    recordResume: 'F2',
    recordStop: 'F3',
  },
};

export const GLOBAL_HOTKEY_ACTIONS: HotkeyAction[] = [
  'capture',
  'captureFullScreen',
  'colorPicker',
  'colorPickerPanel',
  'screenRecord',
];
export const OVERLAY_HOTKEY_ACTIONS: HotkeyAction[] = ['arrow', 'rect', 'save', 'copy', 'cancel'];
export const RECORDING_HOTKEY_ACTIONS: HotkeyAction[] = [
  'recordStart',
  'recordPause',
  'recordResume',
  'recordStop',
];

export function getRecordMimeType(format: RecordFormat): string {
  const map: Record<RecordFormat, string> = {
    'webm-vp9': 'video/webm;codecs=vp9,opus',
    'webm-vp8': 'video/webm;codecs=vp8,opus',
    webm: 'video/webm',
  };
  return map[format];
}

export function getRecordingFileExtension(_format: RecordFormat): string {
  return 'webm';
}
