import type { HotkeyAction, Language } from './settings';

type TrayStrings = {
  capture: string;
  captureFullScreen: string;
  colorPicker: string;
  colorPickerPanel: string;
  screenRecord: string;
  voiceRecord: string;
  wiview: string;
  settings: string;
  quit: string;
  tooltip: string;
};

type NotificationStrings = {
  active: string;
  hotkeyUnavailable: string;
  hotkeyUbuntuConflict: string;
  saved: string;
  savedHint: string;
  copied: string;
  copiedAndSaved: string;
  copiedAndSavedHint: string;
  fullScreenCaptured: string;
  fullScreenCapturedHint: string;
  colorCopied: string;
  recordingSaved: string;
  recordingSavedHint: string;
  voiceSaved: string;
  voiceSavedHint: string;
  loomSaved: string;
  loomSavedHint: string;
  trayHintTitle: string;
  trayHintBody: string;
  alreadyRunningTitle: string;
  alreadyRunningBody: string;
};

type ColorPickerStrings = {
  windowTitle: string;
  pickHint: string;
  copiedHint: string;
  copy: string;
  close: string;
  minimize: string;
  maximize: string;
  advancedOptions: string;
  advancedHide: string;
  harmonies: string;
  variations: string;
  conversions: string;
  contrast: string;
  similarColors: string;
  colorLibrary: string;
  librarySearch: string;
  closestMatch: string;
  categoryAll: string;
  categoryRed: string;
  categoryPink: string;
  categoryOrange: string;
  categoryYellow: string;
  categoryGreen: string;
  categoryBlue: string;
  categoryPurple: string;
  categoryBrown: string;
  categoryWhite: string;
  categoryGray: string;
  onWhite: string;
  onBlack: string;
  pass: string;
  fail: string;
  harmonyAnalogous: string;
  harmonyComplementary: string;
  harmonySplitComplementary: string;
  harmonyTriadic: string;
  harmonyTetradic: string;
  harmonyDoubleSplitComplementary: string;
  harmonyRectangle: string;
  harmonyMonochromatic: string;
  variationSaturation: string;
  variationBrightness: string;
  variationTints: string;
  variationShades: string;
};

type ErrorStrings = {
  captureFailed: string;
  startupFailed: string;
};

type RecordingStrings = {
  title: string;
  desktopAudio: string;
  microphone: string;
  micMute: string;
  micDefault: string;
  camera: string;
  cameraMute: string;
  camDefault: string;
  voiceFx: string;
  voiceFxLabel: string;
  voiceMonitor: string;
  voicePads: string;
  fxNone: string;
  fxRobot: string;
  fxRadio: string;
  fxEcho: string;
  fxReverb: string;
  fxDeep: string;
  fxHelium: string;
  fxMonster: string;
  fxAlien: string;
  fullScreen: string;
  selectRegion: string;
  startRecord: string;
  showControls: string;
  hideControls: string;
  countdown: string;
  cancel: string;
  recording: string;
  paused: string;
  pause: string;
  resume: string;
  stop: string;
  regionHint: string;
  selectRegionFirst: string;
};

type OverlayStrings = {
  arrow: string;
  rect: string;
  copy: string;
  save: string;
  close: string;
};

type SnipStrings = {
  screenshot: string;
  record: string;
  voice: string;
  loom: string;
  rectangle: string;
  fullScreen: string;
  close: string;
  audio: string;
};

type SettingsStrings = {
  title: string;
  subtitle: string;
  shellBrand: string;
  shellTagline: string;
  searchPlaceholder: string;
  searchNoResults: string;
  compactSidebar: string;
  compactSidebarExpand: string;
  navGroupCapture: string;
  navGroupInput: string;
  navGroupProductivity: string;
  navGroupSystem: string;
  navGroupSoon: string;
  navHome: string;
  navWirec: string;
  navClick: string;
  navRemote: string;
  navBoard: string;
  navDraw: string;
  navButton: string;
  navBooster: string;
  navCalc: string;
  navClock: string;
  navNotes: string;
  navRate: string;
  navWeather: string;
  navSystem: string;
  navDimmer: string;
  navTranslate: string;
  navNetest: string;
  navCam: string;
  navColor: string;
  navWidget: string;
  navView: string;
  navDevice: string;
  homeTitle: string;
  homeSubtitle: string;
  homeRecommended: string;
  homeRecommendedHint: string;
  moduleActive: string;
  moduleOff: string;
  moduleSoon: string;
  appEnable: string;
  descWirec: string;
  descClick: string;
  descRemote: string;
  descBoard: string;
  descDraw: string;
  descButton: string;
  descBooster: string;
  descCalc: string;
  descClock: string;
  descNotes: string;
  descRate: string;
  descWeather: string;
  descSystem: string;
  descDimmer: string;
  descTranslate: string;
  descNetest: string;
  descCam: string;
  descColor: string;
  descWidget: string;
  descView: string;
  descDevice: string;
  soonTitle: string;
  soonBody: string;
  wirecSubtitle: string;
  captureSection: string;
  general: string;
  language: string;
  languageEn: string;
  languageEs: string;
  launchAtStartup: string;
  autoSaveCaptures: string;
  saveDirectory: string;
  browseSaveDirectory: string;
  useCaptureSubfolders: string;
  useCaptureSubfoldersHint: string;
  filenameSection: string;
  filenameMode: string;
  filenameModeDatetime: string;
  filenameModeSequential: string;
  filenameDateStyle: string;
  filenameDateIso: string;
  filenameDateLatin: string;
  filenameTimeStyle: string;
  filenameTime24: string;
  filenameTime12: string;
  filenamePreview: string;
  saveAsJpeg: string;
  jpegQuality: string;
  hotkeys: string;
  hotkeysHint: string;
  hotkeyCapture: string;
  hotkeyCaptureFullScreen: string;
  hotkeyColorPicker: string;
  hotkeyColorPickerPanel: string;
  hotkeyScreenRecord: string;
  hotkeyVoiceRecord: string;
  hotkeyArrow: string;
  hotkeyRect: string;
  hotkeySave: string;
  hotkeyCopy: string;
  hotkeyCancel: string;
  hotkeyRecordStart: string;
  hotkeyRecordPause: string;
  hotkeyRecordResume: string;
  hotkeyRecordStop: string;
  recordingSection: string;
  recordFormat: string;
  recordFormatVp9: string;
  recordFormatVp8: string;
  recordFormatWebm: string;
  recordQuality: string;
  recordQualityLow: string;
  recordQualityMedium: string;
  recordQualityHigh: string;
  recordFrameRate: string;
  globalHotkeys: string;
  captureHotkeys: string;
  recordingHotkeys: string;
  pressKeys: string;
  notAssigned: string;
  save: string;
  cancel: string;
  close: string;
  saved: string;
  captureSound: string;
  captureSoundEnabled: string;
  captureSoundPreset: string;
  captureSoundChime: string;
  captureSoundPop: string;
  captureSoundShutter: string;
  captureSoundDing: string;
  hotkeyConflict: string;
  hotkeyInvalid: string;
  hotkeyRequired: string;
  hotkeyNeedsModifierTitle: string;
  hotkeyNeedsModifierBody: string;
  hotkeyTooManyKeys: string;
  hotkeyPrintScreenLinuxTitle: string;
  hotkeyPrintScreenLinuxBody: string;
  conflictInternalTitle: string;
  conflictInternalBody: string;
  conflictExternalTitle: string;
  conflictExternalBody: string;
  conflictClear: string;
  conflictUseAnyway: string;
  conflictCancel: string;
};

type Dictionary = {
  tray: TrayStrings;
  notifications: NotificationStrings;
  errors: ErrorStrings;
  overlay: OverlayStrings;
  snip: SnipStrings;
  colorPicker: ColorPickerStrings;
  recording: RecordingStrings;
  settings: SettingsStrings;
};

const en: Dictionary = {
  tray: {
    capture: 'Capture screen',
    captureFullScreen: 'Capture full screen',
    colorPicker: 'Color picker',
    colorPickerPanel: 'Color picker panel',
    screenRecord: 'Record screen',
    voiceRecord: 'Record voice',
    wiview: 'WI-View (media)',
    settings: 'WI-BTK',
    quit: 'Quit',
    tooltip: 'WI-BTK — {hotkey}',
  },
  notifications: {
    active: 'WI-BTK is running',
    hotkeyUnavailable: '{hotkey} unavailable. Use tray → Capture screen.',
    hotkeyUbuntuConflict: 'Disable the screenshot shortcut in Ubuntu Settings → Keyboard.',
    saved: '{filename}',
    savedHint: 'Saved — click to open folder',
    copied: 'Copied to clipboard',
    copiedAndSaved: '{filename}',
    copiedAndSavedHint: 'Copied and saved — click to open folder',
    fullScreenCaptured: '{filename}',
    fullScreenCapturedHint: 'Full screen saved and copied — click to open folder',
    colorCopied: 'Color copied: {hex}',
    recordingSaved: '{filename}',
    recordingSavedHint: 'Recording saved — click to open folder',
    voiceSaved: '{filename}',
    voiceSavedHint: 'Voice recording saved — click to open folder',
    loomSaved: '{filename}',
    loomSavedHint: 'Loom recording saved — click to open folder',
    trayHintTitle: 'WI-Rec is running',
    trayHintBody:
      'Look for the WI-Rec icon in the system tray (next to the clock). If you do not see it, open the "^" hidden icons menu.\n\nLeft-click the icon to open Settings. Right-click for the menu (Capture, Settings, Quit).',
    alreadyRunningTitle: 'WI-Rec is already running',
    alreadyRunningBody:
      'WI-Rec is already active. Look for the icon in the system tray (next to the clock).',
  },
  errors: {
    captureFailed: 'Could not capture the screen:\n\n{message}',
    startupFailed: 'Could not start WI-Rec:\n\n{message}',
  },
  overlay: {
    arrow: 'Arrow',
    rect: 'Rectangle',
    copy: 'Copy',
    save: 'Save',
    close: 'Close',
  },
  snip: {
    screenshot: 'Screenshot',
    record: 'Record',
    voice: 'Voice',
    loom: 'Loom',
    rectangle: 'Rectangle',
    fullScreen: 'Full screen',
    close: 'Close',
    audio: 'Audio',
  },
  colorPicker: {
    windowTitle: 'WI-Rec (Color Picker)',
    pickHint: 'Click anywhere to pick a color',
    copiedHint: 'Copied to clipboard',
    copy: 'Copy',
    close: 'Close',
    minimize: 'Minimize',
    maximize: 'Maximize',
    advancedOptions: 'Advanced options',
    advancedHide: 'Hide advanced options',
    harmonies: 'Color harmonies',
    variations: 'Variations',
    conversions: 'More formats',
    contrast: 'Contrast checker',
    similarColors: 'Similar colors',
    colorLibrary: 'Color library',
    librarySearch: 'Search by name or code…',
    closestMatch: 'Closest',
    categoryAll: 'All colors',
    categoryRed: 'Red',
    categoryPink: 'Pink',
    categoryOrange: 'Orange',
    categoryYellow: 'Yellow',
    categoryGreen: 'Green',
    categoryBlue: 'Blue',
    categoryPurple: 'Purple',
    categoryBrown: 'Brown',
    categoryWhite: 'White',
    categoryGray: 'Gray',
    onWhite: 'On white',
    onBlack: 'On black',
    pass: 'Pass',
    fail: 'Fail',
    harmonyAnalogous: 'Analogous',
    harmonyComplementary: 'Complementary',
    harmonySplitComplementary: 'Split complementary',
    harmonyTriadic: 'Triadic',
    harmonyTetradic: 'Tetradic',
    harmonyDoubleSplitComplementary: 'Double split complementary',
    harmonyRectangle: 'Rectangle',
    harmonyMonochromatic: 'Monochromatic',
    variationSaturation: 'Saturation',
    variationBrightness: 'Brightness',
    variationTints: 'Tints',
    variationShades: 'Shades',
  },
  recording: {
    title: 'Screen recording',
    desktopAudio: 'Desktop audio',
    microphone: 'Microphone',
    micMute: 'Mute microphone',
    micDefault: 'Default microphone',
    camera: 'Camera',
    cameraMute: 'Hide camera',
    camDefault: 'Default camera',
    voiceFx: 'Voice FX',
    voiceFxLabel: 'Voice effect',
    voiceMonitor: 'Monitor (hear FX)',
    voicePads: 'Soundboard',
    fxNone: 'None',
    fxRobot: 'Robot',
    fxRadio: 'Radio',
    fxEcho: 'Echo',
    fxReverb: 'Reverb / Cave',
    fxDeep: 'Deep voice',
    fxHelium: 'Helium',
    fxMonster: 'Monster',
    fxAlien: 'Alien',
    fullScreen: 'Full screen',
    selectRegion: 'Select region',
    startRecord: 'Start recording',
    showControls: 'Show recording controls',
    hideControls: 'Minimize controls',
    countdown: 'Starting in…',
    cancel: 'Cancel',
    recording: 'Recording',
    paused: 'Paused',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    regionHint: 'Drag to select an area, then start recording',
    selectRegionFirst: 'Select a region first',
  },
  settings: {
    title: 'WI-BTK',
    subtitle: 'Basic toolkit for Windows and Linux',
    shellBrand: 'WI-BTK',
    shellTagline: 'Basic Tool Kit',
    searchPlaceholder: 'Search a tool',
    searchNoResults: 'No tools match your search',
    compactSidebar: 'Icons only',
    compactSidebarExpand: 'Show labels',
    navGroupCapture: 'Capture',
    navGroupInput: 'Input',
    navGroupProductivity: 'Productivity',
    navGroupSystem: 'System',
    navGroupSoon: 'Coming soon',
    navHome: 'Home',
    navWirec: 'WI-Rec',
    navClick: 'WI-Click',
    navRemote: 'WI-Remote',
    navBoard: 'WI-Board',
    navDraw: 'WI-Draw',
    navButton: 'WI-Button',
    navBooster: 'WI-Booster',
    navCalc: 'WI-Calc',
    navClock: 'WI-Clock',
    navNotes: 'WI-Notes',
    navRate: 'WI-Rate',
    navWeather: 'WI-Weather',
    navSystem: 'WI-System',
    navDimmer: 'WI-Dimmer',
    navTranslate: 'WI-Translate',
    navNetest: 'WI-Netest',
    navCam: 'WI-Cam',
    navColor: 'WI-Color',
    navWidget: 'WI-Widget',
    navView: 'WI-View',
    navDevice: 'WI-Device',
    homeTitle: 'Home',
    homeSubtitle: 'All your micro tools in one place',
    homeRecommended: 'Tools',
    homeRecommendedHint: 'Micro software included in WI-BTK',
    moduleActive: 'Active',
    moduleOff: 'Off',
    moduleSoon: 'Coming soon',
    appEnable: 'Enable app',
    descWirec: 'Screenshot, recording, voice and color picker',
    descClick: 'Auto-clicker like OP Auto Clicker',
    descRemote: 'Remote desktop like AnyDesk (LAN)',
    descBoard: 'Virtual whiteboard',
    descDraw: 'Excalidraw-style whiteboard',
    descButton: 'Remap mouse buttons (simple X-Mouse)',
    descBooster: 'CPU, RAM, power plan and display Hz',
    descCalc: 'Calculator',
    descClock: 'Clock, stopwatch, alarms and world times',
    descNotes: 'Quick notes like Google Keep',
    descRate: 'Bs ↔ USD ↔ EUR with custom rates',
    descWeather: 'Current weather and 7-day forecast',
    descSystem: 'PC specs like Speccy (CPU, RAM, GPU, disks…)',
    descDimmer: 'Brightness and warm light like f.lux',
    descTranslate: 'Translate ES / EN / PT — text, speech, images',
    descNetest: 'Internet speed test',
    descCam: 'Webcam toys — filters and snaps',
    descColor: 'Desktop color picker with Colorsbook and tint',
    descWidget: 'Add floating widgets to the Windows desktop',
    descView: 'Image viewer, video and music player',
    descDevice: 'Switch playback, mic and cameras',
    soonTitle: 'Coming soon',
    soonBody: 'This micro software will arrive soon in WI-BTK.',
    wirecSubtitle: 'Capture, recording and color tools',
    captureSection: 'Capture',
    general: 'General',
    language: 'Language',
    languageEn: 'English',
    languageEs: 'Spanish',
    launchAtStartup: 'Launch at system startup',
    autoSaveCaptures: 'Always save captures to disk (including copy)',
    saveDirectory: 'Save folder',
    browseSaveDirectory: 'Browse…',
    useCaptureSubfolders: 'Organize into subfolders (rango / edit / completa)',
    useCaptureSubfoldersHint: 'rango: region only · edit: region with annotations · completa: full screen',
    filenameSection: 'File name',
    filenameMode: 'Naming mode',
    filenameModeDatetime: 'Date and time',
    filenameModeSequential: 'Sequential (WI-Rec-1, 2, 3…)',
    filenameDateStyle: 'Date format',
    filenameDateIso: 'ISO (YYYY-MM-DD)',
    filenameDateLatin: 'Latin (DD-MM-YYYY)',
    filenameTimeStyle: 'Time format',
    filenameTime24: '24 hours (17:45:32)',
    filenameTime12: '12 hours (05:45:32 PM)',
    filenamePreview: 'Example',
    saveAsJpeg: 'Save as JPEG (lighter files)',
    jpegQuality: 'JPEG quality',
    hotkeys: 'Hotkeys',
    hotkeysHint: 'Click a field and press the desired key combination.',
    hotkeyCapture: 'Capture with region selection',
    hotkeyCaptureFullScreen: 'Capture full screen (save + clipboard)',
    hotkeyColorPicker: 'Color picker (eyedropper)',
    hotkeyColorPickerPanel: 'Color picker panel (direct)',
    hotkeyScreenRecord: 'Record screen',
    hotkeyVoiceRecord: 'Record voice',
    hotkeyArrow: 'Arrow tool',
    hotkeyRect: 'Rectangle tool',
    hotkeySave: 'Save screenshot',
    hotkeyCopy: 'Copy to clipboard',
    hotkeyCancel: 'Cancel / close overlay',
    hotkeyRecordStart: 'Start recording',
    hotkeyRecordPause: 'Pause recording',
    hotkeyRecordResume: 'Resume recording',
    hotkeyRecordStop: 'Stop and save recording',
    recordingSection: 'Screen recording',
    recordFormat: 'File format',
    recordFormatVp9: 'WebM (VP9 + Opus)',
    recordFormatVp8: 'WebM (VP8 + Opus)',
    recordFormatWebm: 'WebM (default codecs)',
    recordQuality: 'Video quality',
    recordQualityLow: 'Low (smaller file)',
    recordQualityMedium: 'Medium (balanced)',
    recordQualityHigh: 'High (best quality)',
    recordFrameRate: 'Frame rate',
    globalHotkeys: 'Global',
    captureHotkeys: 'In capture overlay',
    recordingHotkeys: 'In recording overlay',
    pressKeys: 'Press keys…',
    notAssigned: 'Not assigned',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    saved: 'Saved',
    captureSound: 'Capture sound',
    captureSoundEnabled: 'Play sound on capture',
    captureSoundPreset: 'Sound',
    captureSoundChime: 'Chime',
    captureSoundPop: 'Pop',
    captureSoundShutter: 'Shutter',
    captureSoundDing: 'Ding',
    hotkeyConflict: 'Hotkey already in use: {hotkey}',
    hotkeyInvalid: 'Invalid hotkey: {hotkey}',
    hotkeyRequired: 'Assign a hotkey for: {action}',
    hotkeyNeedsModifierTitle: 'Combination required for global hotkey',
    hotkeyNeedsModifierBody:
      '"{hotkey}" blocks normal typing. Use Ctrl, Alt or Shift for "{target}" (e.g. Ctrl+Shift+S).',
    hotkeyTooManyKeys: 'Use at most 3 keys (e.g. Ctrl+Shift+S).',
    hotkeyPrintScreenLinuxTitle: 'Print Screen may not work',
    hotkeyPrintScreenLinuxBody:
      '{hotkey} was saved, but Print Screen is often captured by the system on Linux and may not trigger WI-Rec. Prefer Ctrl+Shift+S or another combo.',
    conflictInternalTitle: 'Hotkey already assigned in WI-Rec',
    conflictInternalBody:
      '{hotkey} is assigned to "{action}". Clear it and assign to "{target}"?',
    conflictExternalTitle: 'Hotkey may be used elsewhere',
    conflictExternalBody:
      '{hotkey} may be used by the system or another app for "{target}". Use it anyway? You may need to disable the other shortcut in system settings.',
    conflictClear: 'Clear and assign',
    conflictUseAnyway: 'Use anyway',
    conflictCancel: 'Cancel',
  },
};

const es: Dictionary = {
  tray: {
    capture: 'Capturar pantalla',
    captureFullScreen: 'Capturar pantalla completa',
    colorPicker: 'Cuentagotas de color',
    colorPickerPanel: 'Panel de color',
    screenRecord: 'Grabar pantalla',
    voiceRecord: 'Grabar voz',
    wiview: 'WI-View (medios)',
    settings: 'WI-BTK',
    quit: 'Salir',
    tooltip: 'WI-BTK — {hotkey}',
  },
  notifications: {
    active: 'WI-BTK está en ejecución',
    hotkeyUnavailable: '{hotkey} no disponible. Usa bandeja → Capturar pantalla.',
    hotkeyUbuntuConflict: 'Desactiva el atajo de captura en Ajustes de Ubuntu → Teclado.',
    saved: '{filename}',
    savedHint: 'Guardado — clic para abrir carpeta',
    copied: 'Copiado al portapapeles',
    copiedAndSaved: '{filename}',
    copiedAndSavedHint: 'Copiado y guardado — clic para abrir carpeta',
    fullScreenCaptured: '{filename}',
    fullScreenCapturedHint: 'Pantalla completa guardada y copiada — clic para abrir carpeta',
    colorCopied: 'Color copiado: {hex}',
    recordingSaved: '{filename}',
    recordingSavedHint: 'Grabación guardada — clic para abrir carpeta',
    voiceSaved: '{filename}',
    voiceSavedHint: 'Grabación de voz guardada — clic para abrir carpeta',
    loomSaved: '{filename}',
    loomSavedHint: 'Grabación Loom guardada — clic para abrir carpeta',
    trayHintTitle: 'WI-Rec está activo',
    trayHintBody:
      'Busca el icono de WI-Rec en la bandeja del sistema (junto al reloj). Si no lo ves, abre el menú "^" de iconos ocultos.\n\nClic izquierdo: Configuración. Clic derecho: menú (Capturar, Configuración, Salir).',
    alreadyRunningTitle: 'WI-Rec ya está en ejecución',
    alreadyRunningBody:
      'WI-Rec ya está activo. Busca el icono en la bandeja del sistema (junto al reloj).',
  },
  errors: {
    captureFailed: 'No se pudo capturar la pantalla:\n\n{message}',
    startupFailed: 'No se pudo iniciar WI-Rec:\n\n{message}',
  },
  overlay: {
    arrow: 'Flecha',
    rect: 'Rectángulo',
    copy: 'Copiar',
    save: 'Guardar',
    close: 'Cerrar',
  },
  snip: {
    screenshot: 'Captura',
    record: 'Grabar',
    voice: 'Voz',
    loom: 'Loom',
    rectangle: 'Rectángulo',
    fullScreen: 'Pantalla completa',
    close: 'Cerrar',
    audio: 'Audio',
  },
  colorPicker: {
    windowTitle: 'WI-Rec (Cuentagotas)',
    pickHint: 'Haz clic en cualquier punto para capturar el color',
    copiedHint: 'Copiado al portapapeles',
    copy: 'Copiar',
    close: 'Cerrar',
    minimize: 'Minimizar',
    maximize: 'Maximizar',
    advancedOptions: 'Opciones avanzadas',
    advancedHide: 'Ocultar opciones avanzadas',
    harmonies: 'Armonías de color',
    variations: 'Variaciones',
    conversions: 'Más formatos',
    contrast: 'Comprobador de contraste',
    similarColors: 'Colores similares',
    colorLibrary: 'Librería de colores',
    librarySearch: 'Buscar por nombre o código…',
    closestMatch: 'Más cercano',
    categoryAll: 'Todos',
    categoryRed: 'Rojos',
    categoryPink: 'Rosas',
    categoryOrange: 'Naranjas',
    categoryYellow: 'Amarillos',
    categoryGreen: 'Verdes',
    categoryBlue: 'Azules',
    categoryPurple: 'Morados',
    categoryBrown: 'Marrones',
    categoryWhite: 'Blancos',
    categoryGray: 'Grises',
    onWhite: 'Sobre blanco',
    onBlack: 'Sobre negro',
    pass: 'Cumple',
    fail: 'No cumple',
    harmonyAnalogous: 'Análogos',
    harmonyComplementary: 'Complementario',
    harmonySplitComplementary: 'Complementario dividido',
    harmonyTriadic: 'Triádico',
    harmonyTetradic: 'Tetrádico',
    harmonyDoubleSplitComplementary: 'Doble complementario dividido',
    harmonyRectangle: 'Rectángulo',
    harmonyMonochromatic: 'Monocromático',
    variationSaturation: 'Saturación',
    variationBrightness: 'Brillo',
    variationTints: 'Tintes',
    variationShades: 'Sombras',
  },
  recording: {
    title: 'Grabación de pantalla',
    desktopAudio: 'Audio del escritorio',
    microphone: 'Micrófono',
    micMute: 'Silenciar micrófono',
    micDefault: 'Micrófono predeterminado',
    camera: 'Cámara',
    cameraMute: 'Ocultar cámara',
    camDefault: 'Cámara predeterminada',
    voiceFx: 'Efectos de voz',
    voiceFxLabel: 'Efecto de voz',
    voiceMonitor: 'Monitorear (oír FX)',
    voicePads: 'Soundboard',
    fxNone: 'Ninguno',
    fxRobot: 'Robot',
    fxRadio: 'Radio',
    fxEcho: 'Eco',
    fxReverb: 'Reverb / Cueva',
    fxDeep: 'Voz grave',
    fxHelium: 'Helio',
    fxMonster: 'Monstruo',
    fxAlien: 'Alienígena',
    fullScreen: 'Pantalla completa',
    selectRegion: 'Seleccionar región',
    startRecord: 'Iniciar grabación',
    showControls: 'Mostrar controles de grabación',
    hideControls: 'Minimizar controles',
    countdown: 'Comienza en…',
    cancel: 'Cancelar',
    recording: 'Grabando',
    paused: 'En pausa',
    pause: 'Pausar',
    resume: 'Reanudar',
    stop: 'Detener',
    regionHint: 'Arrastra para elegir un área y luego inicia la grabación',
    selectRegionFirst: 'Selecciona una región primero',
  },
  settings: {
    title: 'WI-BTK',
    subtitle: 'Kit de herramientas básicas para Windows y Linux',
    shellBrand: 'WI-BTK',
    shellTagline: 'Basic Tool Kit',
    searchPlaceholder: 'Buscar una herramienta',
    searchNoResults: 'Ninguna herramienta coincide',
    compactSidebar: 'Solo iconos',
    compactSidebarExpand: 'Mostrar nombres',
    navGroupCapture: 'Captura',
    navGroupInput: 'Entrada',
    navGroupProductivity: 'Productividad',
    navGroupSystem: 'Sistema',
    navGroupSoon: 'Próximamente',
    navHome: 'Inicio',
    navWirec: 'WI-Rec',
    navClick: 'WI-Click',
    navRemote: 'WI-Remote',
    navBoard: 'WI-Board',
    navDraw: 'WI-Draw',
    navButton: 'WI-Button',
    navBooster: 'WI-Booster',
    navCalc: 'WI-Calc',
    navClock: 'WI-Clock',
    navNotes: 'WI-Notes',
    navRate: 'WI-Rate',
    navWeather: 'WI-Weather',
    navSystem: 'WI-System',
    navDimmer: 'WI-Dimmer',
    navTranslate: 'WI-Translate',
    navNetest: 'WI-Netest',
    navCam: 'WI-Cam',
    navColor: 'WI-Color',
    navWidget: 'WI-Widget',
    navView: 'WI-View',
    navDevice: 'WI-Device',
    homeTitle: 'Inicio',
    homeSubtitle: 'Todos tus micro softwares en un solo lugar',
    homeRecommended: 'Herramientas',
    homeRecommendedHint: 'Micro software incluidos en WI-BTK',
    moduleActive: 'Activo',
    moduleOff: 'Inactivo',
    moduleSoon: 'Próximamente',
    appEnable: 'Activar app',
    descWirec: 'Captura, grabación, voz y cuentagotas',
    descClick: 'Auto-clicker estilo OP Auto Clicker',
    descRemote: 'Escritorio remoto estilo AnyDesk (LAN)',
    descBoard: 'Pizarra virtual',
    descDraw: 'Whiteboard estilo Excalidraw',
    descButton: 'Remapear botones del mouse (X-Mouse simple)',
    descBooster: 'CPU, RAM, plan de energía y Hz',
    descCalc: 'Calculadora',
    descClock: 'Reloj, cronómetro, alarmas y zonas',
    descNotes: 'Notas rápidas estilo Google Keep',
    descRate: 'Bs ↔ USD ↔ EUR con tasa personalizada',
    descWeather: 'Clima actual y pronóstico a 7 días',
    descSystem: 'Info del PC estilo Speccy (CPU, RAM, GPU, discos…)',
    descDimmer: 'Brillo y luz cálida estilo f.lux',
    descTranslate: 'Traduce ES / EN / PT — texto, voz e imágenes',
    descNetest: 'Prueba de velocidad de internet',
    descCam: 'Webcam toys — filtros y fotos',
    descColor: 'Color picker de escritorio con Colorsbook y tint',
    descWidget: 'Agrega widgets flotantes al escritorio de Windows',
    descView: 'Visor de imágenes, video y música',
    descDevice: 'Cambiar salida, micrófono y cámaras',
    soonTitle: 'Próximamente',
    soonBody: 'Este micro software llegará pronto a WI-BTK.',
    wirecSubtitle: 'Captura, grabación y color',
    captureSection: 'Captura',
    general: 'General',
    language: 'Idioma',
    languageEn: 'Inglés',
    languageEs: 'Español',
    launchAtStartup: 'Iniciar al arrancar el sistema',
    autoSaveCaptures: 'Guardar siempre las capturas en disco (también al copiar)',
    saveDirectory: 'Carpeta de guardado',
    browseSaveDirectory: 'Examinar…',
    useCaptureSubfolders: 'Organizar en subcarpetas (rango / edit / completa)',
    useCaptureSubfoldersHint: 'rango: solo región · edit: región con anotaciones · completa: pantalla completa',
    filenameSection: 'Nombre de archivo',
    filenameMode: 'Modo de nombre',
    filenameModeDatetime: 'Fecha y hora',
    filenameModeSequential: 'Enumerado (WI-Rec-1, 2, 3…)',
    filenameDateStyle: 'Formato de fecha',
    filenameDateIso: 'ISO (AAAA-MM-DD)',
    filenameDateLatin: 'Latino (DD-MM-AAAA)',
    filenameTimeStyle: 'Formato de hora',
    filenameTime24: '24 horas (17:45:32)',
    filenameTime12: '12 horas (05:45:32 PM)',
    filenamePreview: 'Ejemplo',
    saveAsJpeg: 'Guardar como JPEG (archivos más livianos)',
    jpegQuality: 'Calidad JPEG',
    hotkeys: 'Atajos de teclado',
    hotkeysHint: 'Haz clic en un campo y pulsa la combinación deseada.',
    hotkeyCapture: 'Capturar con selección de región',
    hotkeyCaptureFullScreen: 'Capturar pantalla completa (guardar + portapapeles)',
    hotkeyColorPicker: 'Cuentagotas de color',
    hotkeyColorPickerPanel: 'Panel de color (directo)',
    hotkeyScreenRecord: 'Grabar pantalla',
    hotkeyVoiceRecord: 'Grabar voz',
    hotkeyArrow: 'Herramienta flecha',
    hotkeyRect: 'Herramienta rectángulo',
    hotkeySave: 'Guardar captura',
    hotkeyCopy: 'Copiar al portapapeles',
    hotkeyCancel: 'Cancelar / cerrar overlay',
    hotkeyRecordStart: 'Iniciar grabación',
    hotkeyRecordPause: 'Pausar grabación',
    hotkeyRecordResume: 'Reanudar grabación',
    hotkeyRecordStop: 'Detener y guardar grabación',
    recordingSection: 'Grabación de pantalla',
    recordFormat: 'Formato de archivo',
    recordFormatVp9: 'WebM (VP9 + Opus)',
    recordFormatVp8: 'WebM (VP8 + Opus)',
    recordFormatWebm: 'WebM (códecs predeterminados)',
    recordQuality: 'Calidad de video',
    recordQualityLow: 'Baja (archivo pequeño)',
    recordQualityMedium: 'Media (equilibrada)',
    recordQualityHigh: 'Alta (mejor calidad)',
    recordFrameRate: 'Cuadros por segundo',
    globalHotkeys: 'Global',
    captureHotkeys: 'Dentro del overlay de captura',
    recordingHotkeys: 'Dentro del overlay de grabación',
    pressKeys: 'Pulsa teclas…',
    notAssigned: 'Sin asignar',
    save: 'Guardar',
    cancel: 'Cancelar',
    close: 'Cerrar',
    saved: 'Guardado',
    captureSound: 'Sonido de captura',
    captureSoundEnabled: 'Reproducir sonido al capturar',
    captureSoundPreset: 'Sonido',
    captureSoundChime: 'Campanilla',
    captureSoundPop: 'Pop',
    captureSoundShutter: 'Obturador',
    captureSoundDing: 'Ding',
    hotkeyConflict: 'Atajo ya en uso: {hotkey}',
    hotkeyInvalid: 'Atajo inválido: {hotkey}',
    hotkeyRequired: 'Asigna un atajo para: {action}',
    hotkeyNeedsModifierTitle: 'Combinación obligatoria para atajo global',
    hotkeyNeedsModifierBody:
      '"{hotkey}" bloquea teclas normales. Usa Ctrl, Alt o Shift para "{target}" (ej. Ctrl+Shift+S).',
    hotkeyTooManyKeys: 'Máximo 3 teclas (ej. Ctrl+Shift+S).',
    hotkeyPrintScreenLinuxTitle: 'Print Screen puede no funcionar',
    hotkeyPrintScreenLinuxBody:
      '{hotkey} se guardó, pero en Linux el sistema suele capturar Print Screen y WI-Rec puede no responder. Mejor Ctrl+Shift+S u otra combinación.',
    conflictInternalTitle: 'Atajo ya asignado en WI-Rec',
    conflictInternalBody:
      '{hotkey} está asignado a "{action}". ¿Quitarlo y asignarlo a "{target}"?',
    conflictExternalTitle: 'La tecla puede estar en uso',
    conflictExternalBody:
      '{hotkey} puede estar usada por el sistema u otro programa para "{target}". ¿Usarla igual? Puede que debas desactivar el otro atajo en ajustes del sistema.',
    conflictClear: 'Quitar y asignar',
    conflictUseAnyway: 'Usar igual',
    conflictCancel: 'Cancelar',
  },
};

const dictionaries: Record<Language, Dictionary> = { en, es };

export function t(
  language: Language,
  key: string,
  vars: Record<string, string> = {},
): string {
  const parts = key.split('.');
  let value: unknown = dictionaries[language];

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  return value.replace(/\{(\w+)\}/g, (_match, name: string) => vars[name] ?? `{${name}}`);
}

export function hotkeyLabel(language: Language, action: HotkeyAction): string {
  const map: Record<HotkeyAction, string> = {
    capture: 'settings.hotkeyCapture',
    captureFullScreen: 'settings.hotkeyCaptureFullScreen',
    colorPicker: 'settings.hotkeyColorPicker',
    colorPickerPanel: 'settings.hotkeyColorPickerPanel',
    screenRecord: 'settings.hotkeyScreenRecord',
    voiceRecord: 'settings.hotkeyVoiceRecord',
    arrow: 'settings.hotkeyArrow',
    rect: 'settings.hotkeyRect',
    save: 'settings.hotkeySave',
    copy: 'settings.hotkeyCopy',
    cancel: 'settings.hotkeyCancel',
    recordStart: 'settings.hotkeyRecordStart',
    recordPause: 'settings.hotkeyRecordPause',
    recordResume: 'settings.hotkeyRecordResume',
    recordStop: 'settings.hotkeyRecordStop',
  };
  return t(language, map[action]);
}

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language];
}
