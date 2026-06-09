function normalizeKey(key) {
    if (key.length === 1) {
        return key.toUpperCase();
    }
    const map = {
        ' ': 'Space',
        ArrowUp: 'Up',
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
        Escape: 'Escape',
        Enter: 'Enter',
        Backspace: 'Backspace',
        Delete: 'Delete',
        Tab: 'Tab',
        Home: 'Home',
        End: 'End',
        PageUp: 'PageUp',
        PageDown: 'PageDown',
        Insert: 'Insert',
        CapsLock: 'Capslock',
        NumLock: 'Numlock',
        ScrollLock: 'Scrolllock',
        PrintScreen: 'PrintScreen',
        Pause: 'Pause',
    };
    if (map[key]) {
        return map[key];
    }
    if (/^F\d{1,2}$/i.test(key)) {
        return key.toUpperCase();
    }
    return key;
}
export function eventMatchesAccelerator(event, accelerator) {
    const parts = accelerator
        .split('+')
        .map((part) => part.trim())
        .filter(Boolean);
    if (parts.length === 0) {
        return false;
    }
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);
    const wantsCtrl = modifiers.some((part) => ['CommandOrControl', 'Control', 'Command'].includes(part));
    const wantsAlt = modifiers.includes('Alt');
    const wantsShift = modifiers.includes('Shift');
    const hasCtrl = event.ctrlKey || event.metaKey;
    if (wantsCtrl !== hasCtrl) {
        return false;
    }
    if (wantsAlt !== event.altKey) {
        return false;
    }
    if (wantsShift !== event.shiftKey) {
        return false;
    }
    return normalizeKey(event.key) === key;
}
//# sourceMappingURL=hotkeyMatch.js.map