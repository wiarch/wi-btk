import type { HotkeyAction, Language } from './settings';

type TrayStrings = {
  capture: string;
  settings: string;
  quit: string;
  tooltip: string;
};

type NotificationStrings = {
  active: string;
  hotkeyUnavailable: string;
  hotkeyUbuntuConflict: string;
  saved: string;
  copied: string;
  fullScreenCaptured: string;
};

type ErrorStrings = {
  captureFailed: string;
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
  hotkeys: string;
  hotkeysHint: string;
  hotkeyCapture: string;
  hotkeyCaptureFullScreen: string;
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
  saved: string;
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
  settings: SettingsStrings;
};

const en: Dictionary = {
  tray: {
    capture: 'Capture screen',
    settings: 'Settings',
    quit: 'Quit',
    tooltip: 'WI-Print — {hotkey}',
  },
  notifications: {
    active: 'Active. {hotkey} or tray click.',
    hotkeyUnavailable: '{hotkey} unavailable. Use tray → Capture screen.',
    hotkeyUbuntuConflict: 'Disable the screenshot shortcut in Ubuntu Settings → Keyboard.',
    saved: 'Saved to {path}',
    copied: 'Copied to clipboard',
    fullScreenCaptured: 'Full screen saved to {path} and copied to clipboard',
  },
  errors: {
    captureFailed: 'Could not capture the screen:\n\n{message}',
  },
  overlay: {
    arrow: 'Arrow',
    rect: 'Rectangle',
    copy: 'Copy',
    save: 'Save',
    close: 'Close',
  },
  settings: {
    title: 'Settings',
    subtitle: 'Hotkeys, startup and language',
    general: 'General',
    language: 'Language',
    languageEn: 'English',
    languageEs: 'Spanish',
    launchAtStartup: 'Launch at system startup',
    hotkeys: 'Hotkeys',
    hotkeysHint: 'Click a field and press the desired key combination.',
    hotkeyCapture: 'Capture with region selection',
    hotkeyCaptureFullScreen: 'Capture full screen (save + clipboard)',
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
    saved: 'Settings saved',
    hotkeyConflict: 'Hotkey already in use: {hotkey}',
    hotkeyInvalid: 'Invalid hotkey: {hotkey}',
    hotkeyRequired: 'Assign a hotkey for: {action}',
    hotkeyNeedsModifierTitle: 'Combination required for global hotkey',
    hotkeyNeedsModifierBody:
      '"{hotkey}" blocks normal typing. Use Ctrl, Alt or Shift for "{target}" (e.g. Ctrl+Shift+S).',
    conflictInternalTitle: 'Hotkey already assigned in WI-Print',
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
    settings: 'Configuración',
    quit: 'Salir',
    tooltip: 'WI-Print — {hotkey}',
  },
  notifications: {
    active: 'Activo. {hotkey} o click en bandeja.',
    hotkeyUnavailable: '{hotkey} no disponible. Usa bandeja → Capturar pantalla.',
    hotkeyUbuntuConflict: 'Desactiva el atajo de captura en Ajustes de Ubuntu → Teclado.',
    saved: 'Guardado en {path}',
    copied: 'Copiado al portapapeles',
    fullScreenCaptured: 'Pantalla completa guardada en {path} y copiada al portapapeles',
  },
  errors: {
    captureFailed: 'No se pudo capturar la pantalla:\n\n{message}',
  },
  overlay: {
    arrow: 'Flecha',
    rect: 'Rectángulo',
    copy: 'Copiar',
    save: 'Guardar',
    close: 'Cerrar',
  },
  settings: {
    title: 'Configuración',
    subtitle: 'Atajos, inicio con el sistema e idioma',
    general: 'General',
    language: 'Idioma',
    languageEn: 'Inglés',
    languageEs: 'Español',
    launchAtStartup: 'Iniciar al arrancar el sistema',
    hotkeys: 'Atajos de teclado',
    hotkeysHint: 'Haz clic en un campo y pulsa la combinación deseada.',
    hotkeyCapture: 'Capturar con selección de región',
    hotkeyCaptureFullScreen: 'Capturar pantalla completa (guardar + portapapeles)',
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
    saved: 'Configuración guardada',
    hotkeyConflict: 'Atajo ya en uso: {hotkey}',
    hotkeyInvalid: 'Atajo inválido: {hotkey}',
    hotkeyRequired: 'Asigna un atajo para: {action}',
    hotkeyNeedsModifierTitle: 'Combinación obligatoria para atajo global',
    hotkeyNeedsModifierBody:
      '"{hotkey}" bloquea teclas normales. Usa Ctrl, Alt o Shift para "{target}" (ej. Ctrl+Shift+S).',
    conflictInternalTitle: 'Atajo ya asignado en WI-Print',
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
