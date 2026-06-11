import { keyFromKeyboardEvent, modifierPartsFromEvent, normalizeAcceleratorKey } from '../shared/accelerator.js';

export function eventMatchesAccelerator(event: KeyboardEvent, accelerator: string): boolean {
  const parts = accelerator
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  const wantsCtrl = modifiers.some((part) =>
    ['CommandOrControl', 'Control', 'Command'].includes(part),
  );
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

  const fromEvent = keyFromKeyboardEvent(event);
  if (fromEvent && fromEvent === key) {
    return true;
  }

  return normalizeAcceleratorKey(event.key) === key;
}

export function modifierPartsMatch(event: KeyboardEvent, accelerator: string): boolean {
  const parts = accelerator
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return false;
  }

  const modifiers = parts.slice(0, -1);
  const wantsCtrl = modifiers.some((part) =>
    ['CommandOrControl', 'Control', 'Command'].includes(part),
  );
  const wantsAlt = modifiers.includes('Alt');
  const wantsShift = modifiers.includes('Shift');
  const hasCtrl = event.ctrlKey || event.metaKey;

  return wantsCtrl === hasCtrl && wantsAlt === event.altKey && wantsShift === event.shiftKey;
}

export { modifierPartsFromEvent };
