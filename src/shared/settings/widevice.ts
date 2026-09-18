export type WideviceHotkeyAction = 'switchPlayback' | 'switchRecording' | 'switchCamera';

export type WideviceSettings = {
  hotkeys: Record<WideviceHotkeyAction, string>;
  hotkeysEnabled: boolean;
  enabledPlaybackIds: string[];
  enabledRecordingIds: string[];
  enabledCameraIds: string[];
  lastPlaybackId: string;
  lastRecordingId: string;
  lastCameraId: string;
};

export const DEFAULT_WIDEVICE_SETTINGS: WideviceSettings = {
  hotkeys: {
    switchPlayback: 'Control+Alt+F11',
    switchRecording: 'Control+Alt+F10',
    switchCamera: 'Control+Alt+F9',
  },
  hotkeysEnabled: true,
  enabledPlaybackIds: [],
  enabledRecordingIds: [],
  enabledCameraIds: [],
  lastPlaybackId: '',
  lastRecordingId: '',
  lastCameraId: '',
};

export const WIDEVICE_APP_ID = 'widevice';
export const WIDEVICE_HOTKEY_ACTIONS: WideviceHotkeyAction[] = [
  'switchPlayback',
  'switchRecording',
  'switchCamera',
];
