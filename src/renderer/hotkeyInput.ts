const MODIFIER_ONLY = new Set([
  'Control',
  'Alt',
  'Shift',
  'Meta',
  'Command',
  'OS',
  'AltGraph',
]);

const CODE_KEY_MAP: Record<string, string> = {
  Space: 'Space',
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
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
};

function normalizeKey(key: string): string {
  if (key.length === 1) {
    return key.toUpperCase();
  }

  if (CODE_KEY_MAP[key]) {
    return CODE_KEY_MAP[key];
  }

  if (/^F\d{1,2}$/i.test(key)) {
    return key.toUpperCase();
  }

  return key;
}

function keyFromEvent(event: KeyboardEvent): string | null {
  if (MODIFIER_ONLY.has(event.key)) {
    return null;
  }

  if (event.code.startsWith('Key') && event.code.length === 4) {
    return event.code.slice(3).toUpperCase();
  }

  if (event.code.startsWith('Digit') && event.code.length === 6) {
    return event.code.slice(5);
  }

  if (event.code.startsWith('F') && /^F\d{1,2}$/.test(event.code)) {
    return event.code.toUpperCase();
  }

  if (CODE_KEY_MAP[event.code]) {
    return CODE_KEY_MAP[event.code];
  }

  if (event.key === 'Dead' || event.key === 'Unidentified') {
    return null;
  }

  return normalizeKey(event.key);
}

function modifierParts(event: KeyboardEvent): string[] {
  const parts: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push('CommandOrControl');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }

  return parts;
}

export function previewAccelerator(event: KeyboardEvent): string | null {
  const parts = modifierParts(event);

  if (MODIFIER_ONLY.has(event.key)) {
    return parts.length > 0 ? `${parts.join('+')}+…` : null;
  }

  const key = keyFromEvent(event);
  if (!key) {
    return parts.length > 0 ? `${parts.join('+')}+…` : null;
  }

  parts.push(key);
  return parts.join('+');
}

export function keyboardEventToAccelerator(event: KeyboardEvent): string | null {
  const key = keyFromEvent(event);
  if (!key) {
    return null;
  }

  const parts = modifierParts(event);
  parts.push(key);
  return parts.join('+');
}

export function formatAcceleratorForDisplay(accelerator: string): string {
  return accelerator
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/PrintScreen/g, 'Print Screen');
}
