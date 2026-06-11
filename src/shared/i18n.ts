import type { HotkeyAction, Language } from './settings';

type TrayStrings = {
  capture: string;
  captureFullScreen: string;
  colorPicker: string;
  colorPickerPanel: string;
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

type OverlayStrings = {
  arrow: string;
  rect: string;
  copy: string;
  save: string;
  close: string;
};

type SettingsStrings = {
  title: string;
  subtitle: string;
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
  hotkeyArrow: string;
  hotkeyRect: string;
  hotkeySave: string;
  hotkeyCopy: string;
  hotkeyCancel: string;
  globalHotkeys: string;
  captureHotkeys: string;
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
  colorPicker: ColorPickerStrings;
  settings: SettingsStrings;
};

const en: Dictionary = {
  tray: {
    capture: 'Capture screen',
    captureFullScreen: 'Capture full screen',
    colorPicker: 'Color picker',
    colorPickerPanel: 'Color picker panel',
    settings: 'Settings',
    quit: 'Quit',
    tooltip: 'WI-Rec — {hotkey}',
  },
  notifications: {
    active: 'Active. {hotkey} or tray click.',
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
    trayHintTitle: 'WI-Rec is running',
    trayHintBody:
      'Look for the WI-Rec icon in the system tray (next to the clock). If you do not see it, open the "^" hidden icons menu.\n\nRight-click the icon for Settings and Quit. Left-click to capture.',
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
  settings: {
    title: 'Settings',
    subtitle: 'Hotkeys, startup and language',
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
    hotkeyArrow: 'Arrow tool',
    hotkeyRect: 'Rectangle tool',
    hotkeySave: 'Save screenshot',
    hotkeyCopy: 'Copy to clipboard',
    hotkeyCancel: 'Cancel / close overlay',
    globalHotkeys: 'Global',
    captureHotkeys: 'In capture overlay',
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
    settings: 'Configuración',
    quit: 'Salir',
    tooltip: 'WI-Rec — {hotkey}',
  },
  notifications: {
    active: 'Activo. {hotkey} o click en bandeja.',
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
    trayHintTitle: 'WI-Rec está activo',
    trayHintBody:
      'Busca el icono de WI-Rec en la bandeja del sistema (junto al reloj). Si no lo ves, abre el menú "^" de iconos ocultos.\n\nClic derecho: Configuración y Salir. Clic izquierdo: capturar.',
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
  settings: {
    title: 'Configuración',
    subtitle: 'Atajos, inicio con el sistema e idioma',
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
    hotkeyArrow: 'Herramienta flecha',
    hotkeyRect: 'Herramienta rectángulo',
    hotkeySave: 'Guardar captura',
    hotkeyCopy: 'Copiar al portapapeles',
    hotkeyCancel: 'Cancelar / cerrar overlay',
    globalHotkeys: 'Global',
    captureHotkeys: 'Dentro del overlay de captura',
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
    arrow: 'settings.hotkeyArrow',
    rect: 'settings.hotkeyRect',
    save: 'settings.hotkeySave',
    copy: 'settings.hotkeyCopy',
    cancel: 'settings.hotkeyCancel',
  };
  return t(language, map[action]);
}

export function getDictionary(language: Language): Dictionary {
  return dictionaries[language];
}
