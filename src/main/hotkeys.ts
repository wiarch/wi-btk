import { globalShortcut } from 'electron';
import {
  MAX_ACCELERATOR_PARTS,
  normalizeAcceleratorKey,
} from '../shared/accelerator';
import type { AppSettings, HotkeyAction } from '../shared/settings';
import { GLOBAL_HOTKEY_ACTIONS } from '../shared/settings';

const MODIFIER_KEYS = new Set([
  'Control',
  'Alt',
  'Shift',
  'Meta',
  'Command',
  'OS',
  'AltGraph',
]);

export { MAX_ACCELERATOR_PARTS };

export function normalizeAccelerator(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => normalizeAcceleratorKey(part))
    .join('+');
}

export function normalizeForElectron(accelerator: string): string {
  return normalizeAccelerator(accelerator)
    .split('+')
    .map((part) => {
      if (/^print\s*screen$/i.test(part) || /^snapshot$/i.test(part)) {
        return 'PrintScreen';
      }
      return part;
    })
    .join('+');
}

export function isValidAccelerator(accelerator: string): boolean {
  const normalized = normalizeAccelerator(accelerator);
  if (!normalized) {
    return false;
  }

  const parts = normalized.split('+');
  const key = parts[parts.length - 1];
  if (!key || MODIFIER_KEYS.has(key)) {
    return false;
  }

  if (parts.length > MAX_ACCELERATOR_PARTS) {
    return false;
  }

  return parts.length >= 1;
}

export function usesPrintScreen(accelerator: string): boolean {
  return normalizeAccelerator(accelerator)
    .split('+')
    .some((part) => part === 'PrintScreen');
}

export function findDuplicateHotkeys(hotkeys: AppSettings['hotkeys']): string | null {
  const seen = new Map<string, HotkeyAction>();

  for (const [action, accelerator] of Object.entries(hotkeys) as [HotkeyAction, string][]) {
    if (!accelerator) {
      continue;
    }

    const normalized = normalizeAccelerator(accelerator);
    if (!isValidAccelerator(normalized)) {
      return normalized;
    }

    const existing = seen.get(normalized);
    if (existing) {
      return normalized;
    }
    seen.set(normalized, action);
  }

  return null;
}

export function isHotkeyAvailable(accelerator: string, current?: string): boolean {
  const normalized = normalizeAccelerator(accelerator);
  if (!isValidAccelerator(normalized)) {
    return false;
  }

  if (current && normalizeAccelerator(current) === normalized) {
    return true;
  }

  return !globalShortcut.isRegistered(normalized);
}

const GLOBAL_STANDALONE_KEYS = new Set([
  'PrintScreen',
  'Pause',
  'Scrolllock',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
]);

export function isSafeGlobalAccelerator(accelerator: string): boolean {
  const parts = normalizeAccelerator(accelerator).split('+');
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  const hasModifier = modifiers.some((part) =>
    ['CommandOrControl', 'Control', 'Command', 'Alt', 'Shift', 'Meta', 'Super'].includes(part),
  );

  if (hasModifier) {
    return true;
  }

  return GLOBAL_STANDALONE_KEYS.has(key);
}

export function getUnsafeGlobalAction(
  hotkeys: AppSettings['hotkeys'],
): { action: HotkeyAction; accelerator: string } | null {
  for (const action of GLOBAL_HOTKEY_ACTIONS) {
    const accelerator = hotkeys[action];
    if (!accelerator || !isValidAccelerator(accelerator)) {
      continue;
    }

    if (!isSafeGlobalAccelerator(accelerator)) {
      return { action, accelerator };
    }
  }

  return null;
}
