import {
  formatAcceleratorForDisplay,
  keyboardEventToAccelerator,
  previewAccelerator,
} from '../../../shared/hotkeyInput.js';

export {};

type MouseButtonId = 'middle' | 'x1' | 'x2';
type ButtonActionType =
  | 'default'
  | 'disabled'
  | 'keystroke'
  | 'copy'
  | 'paste'
  | 'cut'
  | 'undo'
  | 'redo'
  | 'volumeUp'
  | 'volumeDown'
  | 'volumeMute'
  | 'mediaPlayPause';

type ButtonBinding = {
  action: ButtonActionType;
  keystroke: string;
};

type WibuttonSettings = {
  remappingEnabled: boolean;
  toggleHotkey: string;
  bindings: Record<MouseButtonId, ButtonBinding>;
};

type RemapStatus = {
  active: boolean;
  message: string;
};

type WiButtonApi = {
  getSettings(): Promise<WibuttonSettings>;
  saveSettings(
    settings: WibuttonSettings,
  ): Promise<{ ok: true; settings: WibuttonSettings } | { ok: false; error: string }>;
  status(): Promise<RemapStatus>;
  toggleRemap(): Promise<{ ok: true; settings: WibuttonSettings }>;
  notify(message: string): void;
  onStatus(listener: (status: RemapStatus) => void): () => void;
  onSettingsChanged(listener: (settings: WibuttonSettings) => void): () => void;
};

const BUTTONS: Array<{ id: MouseButtonId; label: string }> = [
  { id: 'middle', label: 'Middle button' },
  { id: 'x1', label: 'Mouse 4 (Back)' },
  { id: 'x2', label: 'Mouse 5 (Forward)' },
];

const ACTIONS: Array<{ value: ButtonActionType; label: string }> = [
  { value: 'default', label: 'Default (no change)' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'keystroke', label: 'Simulated keystroke…' },
  { value: 'copy', label: 'Copy (Ctrl+C)' },
  { value: 'paste', label: 'Paste (Ctrl+V)' },
  { value: 'cut', label: 'Cut (Ctrl+X)' },
  { value: 'undo', label: 'Undo (Ctrl+Z)' },
  { value: 'redo', label: 'Redo (Ctrl+Y)' },
  { value: 'volumeUp', label: 'Volume up' },
  { value: 'volumeDown', label: 'Volume down' },
  { value: 'volumeMute', label: 'Volume mute' },
  { value: 'mediaPlayPause', label: 'Play / Pause' },
];

function getApi(): WiButtonApi {
  const existing = (window as unknown as { wiButton?: WiButtonApi }).wiButton;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();
  const statusListeners = new Set<(status: RemapStatus) => void>();
  const settingsListeners = new Set<(settings: WibuttonSettings) => void>();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
      status?: RemapStatus;
      settings?: WibuttonSettings;
    };
    if (data?.channel === 'wi-button-status' && data.status) {
      for (const listener of statusListeners) {
        listener(data.status);
      }
      return;
    }
    if (data?.channel === 'wi-button-settings' && data.settings) {
      for (const listener of settingsListeners) {
        listener(data.settings);
      }
      return;
    }
    if (data?.channel !== 'wi-button-response' || data.id == null) {
      return;
    }
    const entry = pending.get(data.id);
    if (!entry) {
      return;
    }
    pending.delete(data.id);
    if (data.error) {
      entry.reject(new Error(data.error));
      return;
    }
    entry.resolve(data.result);
  });

  const call = async <T>(method: string, ...args: unknown[]): Promise<T> => {
    const id = (seq += 1);
    return new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      window.parent.postMessage({ channel: 'wi-button', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    saveSettings: (settings) => call('saveSettings', settings),
    status: () => call('status'),
    toggleRemap: () => call('toggleRemap'),
    notify: (message) => {
      window.parent.postMessage({ channel: 'wi-button', method: 'notify', args: [message] }, '*');
    },
    onStatus: (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    onSettingsChanged: (listener) => {
      settingsListeners.add(listener);
      return () => settingsListeners.delete(listener);
    },
  };
}

const api = getApi();
const remapEnabledEl = document.getElementById('remap-enabled') as HTMLInputElement;
const toggleHotkeyEl = document.getElementById('toggle-hotkey') as HTMLInputElement;
const bindTable = document.getElementById('bind-table') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

let draft: WibuttonSettings | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let recordingToggle = false;
let recordingKeyFor: MouseButtonId | null = null;

function setStatus(status: RemapStatus): void {
  statusEl.textContent = status.message;
  statusEl.classList.toggle('is-on', status.active);
}

function schedulePersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persist();
  }, 250);
}

async function persist(): Promise<void> {
  if (!draft) {
    return;
  }
  const result = await api.saveSettings(draft);
  if (result.ok) {
    draft = result.settings;
    renderBindings();
  }
}

function renderBindings(): void {
  if (!draft) {
    return;
  }
  bindTable.innerHTML = '';
  for (const button of BUTTONS) {
    const binding = draft.bindings[button.id];
    const row = document.createElement('div');
    row.className = 'bind-row';

    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = button.label;

    const select = document.createElement('select');
    for (const action of ACTIONS) {
      const option = document.createElement('option');
      option.value = action.value;
      option.textContent = action.label;
      if (action.value === binding.action) {
        option.selected = true;
      }
      select.append(option);
    }
    select.addEventListener('change', () => {
      if (!draft) {
        return;
      }
      draft.bindings[button.id] = {
        ...draft.bindings[button.id],
        action: select.value as ButtonActionType,
      };
      renderBindings();
      schedulePersist();
    });

    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.readOnly = true;
    keyInput.placeholder = 'Click, then press keys';
    keyInput.value = binding.keystroke
      ? formatAcceleratorForDisplay(binding.keystroke)
      : '';
    keyInput.classList.toggle('is-disabled', binding.action !== 'keystroke');
    keyInput.addEventListener('focus', () => {
      if (!draft || draft.bindings[button.id].action !== 'keystroke') {
        keyInput.blur();
        return;
      }
      recordingKeyFor = button.id;
      keyInput.value = 'Press keys…';
    });
    keyInput.addEventListener('blur', () => {
      if (recordingKeyFor === button.id) {
        recordingKeyFor = null;
      }
      if (draft) {
        keyInput.value = draft.bindings[button.id].keystroke
          ? formatAcceleratorForDisplay(draft.bindings[button.id].keystroke)
          : '';
      }
    });
    keyInput.addEventListener('keydown', (event) => {
      if (recordingKeyFor !== button.id || !draft) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const preview = previewAccelerator(event);
      if (preview && !preview.endsWith('+…')) {
        draft.bindings[button.id].keystroke = preview;
        keyInput.value = formatAcceleratorForDisplay(preview);
        recordingKeyFor = null;
        keyInput.blur();
        schedulePersist();
        return;
      }
      const accelerator = keyboardEventToAccelerator(event);
      if (accelerator) {
        draft.bindings[button.id].keystroke = accelerator;
        keyInput.value = formatAcceleratorForDisplay(accelerator);
        recordingKeyFor = null;
        keyInput.blur();
        schedulePersist();
        return;
      }
      if (preview) {
        keyInput.value = formatAcceleratorForDisplay(preview);
      }
    });

    row.append(label, select, keyInput);
    bindTable.append(row);
  }
}

function applySettings(settings: WibuttonSettings): void {
  draft = settings;
  remapEnabledEl.checked = settings.remappingEnabled;
  toggleHotkeyEl.value = formatAcceleratorForDisplay(settings.toggleHotkey);
  renderBindings();
}

async function init(): Promise<void> {
  applySettings(await api.getSettings());
  setStatus(await api.status());
  api.onStatus(setStatus);
  api.onSettingsChanged(applySettings);

  remapEnabledEl.addEventListener('change', () => {
    if (!draft) {
      return;
    }
    draft.remappingEnabled = remapEnabledEl.checked;
    schedulePersist();
  });

  toggleHotkeyEl.addEventListener('focus', () => {
    recordingToggle = true;
    toggleHotkeyEl.value = 'Press keys…';
  });
  toggleHotkeyEl.addEventListener('blur', () => {
    recordingToggle = false;
    if (draft) {
      toggleHotkeyEl.value = formatAcceleratorForDisplay(draft.toggleHotkey);
    }
  });
  toggleHotkeyEl.addEventListener('keydown', (event) => {
    if (!recordingToggle || !draft) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const preview = previewAccelerator(event);
    if (preview && !preview.endsWith('+…')) {
      draft.toggleHotkey = preview;
      toggleHotkeyEl.value = formatAcceleratorForDisplay(preview);
      recordingToggle = false;
      toggleHotkeyEl.blur();
      schedulePersist();
      return;
    }
    const accelerator = keyboardEventToAccelerator(event);
    if (accelerator) {
      draft.toggleHotkey = accelerator;
      toggleHotkeyEl.value = formatAcceleratorForDisplay(accelerator);
      recordingToggle = false;
      toggleHotkeyEl.blur();
      schedulePersist();
      return;
    }
    if (preview) {
      toggleHotkeyEl.value = formatAcceleratorForDisplay(preview);
    }
  });
}

void init();
