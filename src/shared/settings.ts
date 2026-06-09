export type Language = 'en' | 'es';

export type HotkeyAction =
  | 'capture'
  | 'captureFullScreen'
  | 'arrow'
  | 'rect'
  | 'save'
  | 'copy'
  | 'cancel';

export type AppSettings = {
  language: Language;
  launchAtStartup: boolean;
  hotkeys: Record<HotkeyAction, string>;
};

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'es',
  launchAtStartup: false,
  hotkeys: {
    capture: 'Alt+Shift+S',
    captureFullScreen: 'Ctrl+PrintScreen',
    arrow: 'A',
    rect: 'R',
    save: 'CommandOrControl+S',
    copy: 'CommandOrControl+C',
    cancel: 'Escape',
  },
};

export const GLOBAL_HOTKEY_ACTIONS: HotkeyAction[] = ['capture', 'captureFullScreen'];
export const OVERLAY_HOTKEY_ACTIONS: HotkeyAction[] = ['arrow', 'rect', 'save', 'copy', 'cancel'];
