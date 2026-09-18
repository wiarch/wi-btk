export const MOUSE_BUTTON_IDS = ['middle', 'x1', 'x2'] as const;
export type MouseButtonId = (typeof MOUSE_BUTTON_IDS)[number];

export const BUTTON_ACTION_TYPES = [
  'default',
  'disabled',
  'keystroke',
  'copy',
  'paste',
  'cut',
  'undo',
  'redo',
  'volumeUp',
  'volumeDown',
  'volumeMute',
  'mediaPlayPause',
] as const;
export type ButtonActionType = (typeof BUTTON_ACTION_TYPES)[number];

export type ButtonBinding = {
  action: ButtonActionType;
  /** Electron-style accelerator when action === 'keystroke' (e.g. Control+C) */
  keystroke: string;
};

export type WibuttonSettings = {
  /** Master remap on/off */
  remappingEnabled: boolean;
  toggleHotkey: string;
  bindings: Record<MouseButtonId, ButtonBinding>;
};

export const DEFAULT_BUTTON_BINDING: ButtonBinding = {
  action: 'default',
  keystroke: '',
};

export const DEFAULT_WIBUTTON_SETTINGS: WibuttonSettings = {
  remappingEnabled: true,
  toggleHotkey: 'Control+Alt+B',
  bindings: {
    middle: { action: 'default', keystroke: '' },
    x1: { action: 'default', keystroke: '' },
    x2: { action: 'default', keystroke: '' },
  },
};

export const WIBUTTON_APP_ID = 'wibutton';

export function mergeWibuttonSettings(partial?: Partial<WibuttonSettings> | null): WibuttonSettings {
  const base: WibuttonSettings = {
    remappingEnabled: DEFAULT_WIBUTTON_SETTINGS.remappingEnabled,
    toggleHotkey: DEFAULT_WIBUTTON_SETTINGS.toggleHotkey,
    bindings: {
      middle: { ...DEFAULT_WIBUTTON_SETTINGS.bindings.middle },
      x1: { ...DEFAULT_WIBUTTON_SETTINGS.bindings.x1 },
      x2: { ...DEFAULT_WIBUTTON_SETTINGS.bindings.x2 },
    },
  };

  if (!partial) {
    return base;
  }

  base.remappingEnabled = partial.remappingEnabled ?? base.remappingEnabled;
  base.toggleHotkey = String(partial.toggleHotkey ?? base.toggleHotkey).trim() || base.toggleHotkey;

  for (const id of MOUSE_BUTTON_IDS) {
    const incoming = partial.bindings?.[id];
    if (!incoming) {
      continue;
    }
    const action = BUTTON_ACTION_TYPES.includes(incoming.action as ButtonActionType)
      ? (incoming.action as ButtonActionType)
      : 'default';
    base.bindings[id] = {
      action,
      keystroke: String(incoming.keystroke ?? '').trim(),
    };
  }

  return base;
}

export function buttonLabel(id: MouseButtonId): string {
  switch (id) {
    case 'middle':
      return 'Middle button';
    case 'x1':
      return 'Mouse 4 (Back)';
    case 'x2':
      return 'Mouse 5 (Forward)';
    default:
      return id;
  }
}

export function actionLabel(action: ButtonActionType): string {
  switch (action) {
    case 'default':
      return 'Default (no change)';
    case 'disabled':
      return 'Disabled';
    case 'keystroke':
      return 'Simulated keystroke';
    case 'copy':
      return 'Copy (Ctrl+C)';
    case 'paste':
      return 'Paste (Ctrl+V)';
    case 'cut':
      return 'Cut (Ctrl+X)';
    case 'undo':
      return 'Undo (Ctrl+Z)';
    case 'redo':
      return 'Redo (Ctrl+Y)';
    case 'volumeUp':
      return 'Volume up';
    case 'volumeDown':
      return 'Volume down';
    case 'volumeMute':
      return 'Volume mute';
    case 'mediaPlayPause':
      return 'Play / Pause';
    default:
      return action;
  }
}
