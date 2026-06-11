export const MAX_ACCELERATOR_PARTS = 3;

export const MODIFIER_ONLY = new Set([
  'Control',
  'Alt',
  'Shift',
  'Meta',
  'Command',
  'OS',
  'AltGraph',
]);

/** Maps KeyboardEvent.code → Electron accelerator key name */
export const CODE_TO_ACCEL_KEY: Record<string, string> = {
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
  Snapshot: 'PrintScreen',
  Pause: 'Pause',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
};

export function normalizeAcceleratorKey(key: string): string {
  if (key.length === 1) {
    return key.toUpperCase();
  }

  if (CODE_TO_ACCEL_KEY[key]) {
    return CODE_TO_ACCEL_KEY[key];
  }

  if (/^print\s*screen$/i.test(key) || /^snapshot$/i.test(key)) {
    return 'PrintScreen';
  }

  if (/^F\d{1,2}$/i.test(key)) {
    return key.toUpperCase();
  }

  return key;
}

export function keyFromKeyboardEvent(event: Pick<KeyboardEvent, 'key' | 'code'>): string | null {
  if (MODIFIER_ONLY.has(event.key)) {
    return null;
  }

  if (event.code && CODE_TO_ACCEL_KEY[event.code]) {
    return CODE_TO_ACCEL_KEY[event.code];
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

  if (event.key === 'Dead' || event.key === 'Unidentified' || event.key === '') {
    return null;
  }

  return normalizeAcceleratorKey(event.key);
}

export function modifierPartsFromEvent(event: Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): string[] {
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

export function buildAcceleratorFromEvent(event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): string | null {
  const key = keyFromKeyboardEvent(event);
  if (!key) {
    return null;
  }

  const parts = modifierPartsFromEvent(event);
  parts.push(key);

  if (parts.length > MAX_ACCELERATOR_PARTS) {
    return null;
  }

  return parts.join('+');
}

export function countAcceleratorParts(accelerator: string): number {
  return accelerator
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean).length;
}

export function isWithinPartLimit(accelerator: string): boolean {
  return countAcceleratorParts(accelerator) <= MAX_ACCELERATOR_PARTS;
}

export function formatAcceleratorForDisplay(accelerator: string): string {
  return accelerator
    .replace(/CommandOrControl/g, 'Ctrl')
    .replace(/PrintScreen/g, 'Print Screen');
}
