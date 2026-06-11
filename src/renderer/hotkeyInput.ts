import {
  MAX_ACCELERATOR_PARTS,
  MODIFIER_ONLY,
  buildAcceleratorFromEvent,
  formatAcceleratorForDisplay,
  keyFromKeyboardEvent,
  modifierPartsFromEvent,
} from '../shared/accelerator.js';

export { formatAcceleratorForDisplay };

export function previewAccelerator(event: KeyboardEvent): string | null {
  const parts = modifierPartsFromEvent(event);

  if (MODIFIER_ONLY.has(event.key)) {
    return parts.length > 0 ? `${parts.join('+')}+…` : null;
  }

  const key = keyFromKeyboardEvent(event);
  if (!key) {
    return parts.length > 0 ? `${parts.join('+')}+…` : null;
  }

  parts.push(key);
  if (parts.length > MAX_ACCELERATOR_PARTS) {
    return null;
  }

  return parts.join('+');
}

export function keyboardEventToAccelerator(event: KeyboardEvent): string | null {
  return buildAcceleratorFromEvent(event);
}
