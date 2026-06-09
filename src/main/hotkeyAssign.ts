import { dialog, globalShortcut } from 'electron';
import { hotkeyLabel, t } from '../shared/i18n';
import type { AppSettings, HotkeyAction, Language } from '../shared/settings';
import { GLOBAL_HOTKEY_ACTIONS } from '../shared/settings';
import { isSafeGlobalAccelerator, isValidAccelerator, normalizeAccelerator } from './hotkeys';

function formatHotkeyForUi(accelerator: string): string {
  return accelerator.replace(/CommandOrControl/g, 'Ctrl').replace(/PrintScreen/g, 'Print Screen');
}

function findInternalConflict(
  hotkeys: AppSettings['hotkeys'],
  action: HotkeyAction,
  accelerator: string,
): HotkeyAction | null {
  const normalized = normalizeAccelerator(accelerator);

  for (const [otherAction, otherAccelerator] of Object.entries(hotkeys) as [
    HotkeyAction,
    string,
  ][]) {
    if (otherAction === action) {
      continue;
    }

    if (!otherAccelerator) {
      continue;
    }

    if (normalizeAccelerator(otherAccelerator) === normalized) {
      return otherAction;
    }
  }

  return null;
}

function isBlockedByExternalApp(accelerator: string): boolean {
  const normalized = normalizeAccelerator(accelerator);
  const wasRegistered = globalShortcut.isRegistered(normalized);

  if (wasRegistered) {
    globalShortcut.unregister(normalized);
  }

  const registered = globalShortcut.register(normalized, () => undefined);
  if (registered) {
    globalShortcut.unregister(normalized);
    return false;
  }

  return true;
}

export type AssignHotkeyResult =
  | { ok: true; hotkeys: AppSettings['hotkeys'] }
  | { ok: false; reason: 'cancelled' | 'invalid' };

export async function assignHotkeyWithConflictCheck(
  language: Language,
  action: HotkeyAction,
  accelerator: string,
  hotkeys: AppSettings['hotkeys'],
): Promise<AssignHotkeyResult> {
  const normalized = normalizeAccelerator(accelerator);
  if (!isValidAccelerator(normalized)) {
    return { ok: false, reason: 'invalid' };
  }

  if (GLOBAL_HOTKEY_ACTIONS.includes(action) && !isSafeGlobalAccelerator(normalized)) {
    const response = await dialog.showMessageBox({
      type: 'warning',
      buttons: [t(language, 'settings.conflictCancel')],
      title: 'WI-Print',
      message: t(language, 'settings.hotkeyNeedsModifierTitle'),
      detail: t(language, 'settings.hotkeyNeedsModifierBody', {
        hotkey: formatHotkeyForUi(normalized),
        target: hotkeyLabel(language, action),
      }),
    });
    void response;
    return { ok: false, reason: 'invalid' };
  }

  const nextHotkeys = { ...hotkeys, [action]: normalized };
  const conflictingAction = findInternalConflict(nextHotkeys, action, normalized);

  if (conflictingAction) {
    const response = await dialog.showMessageBox({
      type: 'question',
      buttons: [
        t(language, 'settings.conflictClear'),
        t(language, 'settings.conflictCancel'),
      ],
      defaultId: 0,
      cancelId: 1,
      title: 'WI-Print',
      message: t(language, 'settings.conflictInternalTitle'),
      detail: t(language, 'settings.conflictInternalBody', {
        hotkey: formatHotkeyForUi(normalized),
        action: hotkeyLabel(language, conflictingAction),
        target: hotkeyLabel(language, action),
      }),
    });

    if (response.response !== 0) {
      return { ok: false, reason: 'cancelled' };
    }

    nextHotkeys[conflictingAction] = '';
  }

  if (GLOBAL_HOTKEY_ACTIONS.includes(action) && isBlockedByExternalApp(normalized)) {
    const response = await dialog.showMessageBox({
      type: 'warning',
      buttons: [
        t(language, 'settings.conflictUseAnyway'),
        t(language, 'settings.conflictCancel'),
      ],
      defaultId: 1,
      cancelId: 1,
      title: 'WI-Print',
      message: t(language, 'settings.conflictExternalTitle'),
      detail: t(language, 'settings.conflictExternalBody', {
        hotkey: formatHotkeyForUi(normalized),
        target: hotkeyLabel(language, action),
      }),
    });

    if (response.response !== 0) {
      return { ok: false, reason: 'cancelled' };
    }
  }

  return { ok: true, hotkeys: nextHotkeys };
}
