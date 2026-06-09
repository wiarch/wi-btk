export type Language = 'en' | 'es';

export type HotkeyAction =
  | 'capture'
  | 'captureFullScreen'
  | 'arrow'
  | 'rect'
  | 'save'
  | 'copy'
  | 'cancel';

export type FilenameMode = 'datetime' | 'sequential';
export type FilenameDateStyle = 'iso' | 'latin';
export type FilenameTimeStyle = 'h24' | 'h12';

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
  hotkeys: {
    capture: 'Alt+Shift+S',
    captureFullScreen: 'Ctrl+Shift+F11',
    arrow: 'A',
    rect: 'R',
    save: 'CommandOrControl+S',
    copy: 'CommandOrControl+C',
    cancel: 'Escape',
  },
};

export const GLOBAL_HOTKEY_ACTIONS: HotkeyAction[] = ['capture', 'captureFullScreen'];
export const OVERLAY_HOTKEY_ACTIONS: HotkeyAction[] = ['arrow', 'rect', 'save', 'copy', 'cancel'];
