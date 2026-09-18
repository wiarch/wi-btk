export type Language = 'en' | 'es';

export type HotkeyAction =
  | 'capture'
  | 'captureFullScreen'
  | 'colorPicker'
  | 'colorPickerPanel'
  | 'screenRecord'
  | 'voiceRecord'
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
export type FilenameMode = 'datetime' | 'sequential';
export type FilenameDateStyle = 'iso' | 'latin';
export type FilenameTimeStyle = 'h24' | 'h12';
export type CaptureSoundPreset = 'chime' | 'pop' | 'shutter' | 'ding';
