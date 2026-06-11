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
  | 'cancel';

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
