const en = {
    tray: {
        capture: 'Capture screen',
        settings: 'Settings',
        quit: 'Quit',
        tooltip: 'WI-Rec — {hotkey}',
    },
    notifications: {
        active: 'Active. {hotkey} or tray click.',
        hotkeyUnavailable: '{hotkey} unavailable. Use tray → Capture screen.',
        saved: 'Saved to {path}',
        copied: 'Copied to clipboard',
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
        hotkeyCapture: 'Capture screen',
        hotkeySave: 'Save screenshot',
        hotkeyCopy: 'Copy to clipboard',
        hotkeyCancel: 'Cancel / close overlay',
        pressKeys: 'Press keys…',
        save: 'Save',
        cancel: 'Cancel',
        saved: 'Settings saved',
        hotkeyConflict: 'Hotkey already in use: {hotkey}',
        hotkeyInvalid: 'Invalid hotkey: {hotkey}',
    },
};
const es = {
    tray: {
        capture: 'Capturar pantalla',
        settings: 'Configuración',
        quit: 'Salir',
        tooltip: 'WI-Rec — {hotkey}',
    },
    notifications: {
        active: 'Activo. {hotkey} o click en bandeja.',
        hotkeyUnavailable: '{hotkey} no disponible. Usa bandeja → Capturar pantalla.',
        saved: 'Guardado en {path}',
        copied: 'Copiado al portapapeles',
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
        hotkeyCapture: 'Capturar pantalla',
        hotkeySave: 'Guardar captura',
        hotkeyCopy: 'Copiar al portapapeles',
        hotkeyCancel: 'Cancelar / cerrar overlay',
        pressKeys: 'Pulsa teclas…',
        save: 'Guardar',
        cancel: 'Cancelar',
        saved: 'Configuración guardada',
        hotkeyConflict: 'Atajo ya en uso: {hotkey}',
        hotkeyInvalid: 'Atajo inválido: {hotkey}',
    },
};
const dictionaries = { en, es };
export function t(language, key, vars = {}) {
    const parts = key.split('.');
    let value = dictionaries[language];
    for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
            value = value[part];
        }
        else {
            return key;
        }
    }
    if (typeof value !== 'string') {
        return key;
    }
    return value.replace(/\{(\w+)\}/g, (_match, name) => vars[name] ?? `{${name}}`);
}
export function hotkeyLabel(language, action) {
    const map = {
        capture: 'settings.hotkeyCapture',
        save: 'settings.hotkeySave',
        copy: 'settings.hotkeyCopy',
        cancel: 'settings.hotkeyCancel',
    };
    return t(language, map[action]);
}
export function getDictionary(language) {
    return dictionaries[language];
}
//# sourceMappingURL=i18n.js.map