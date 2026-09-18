import {
  formatAcceleratorForDisplay,
  keyboardEventToAccelerator,
  previewAccelerator,
} from '../../../shared/hotkeyInput.js';

export {};

type WidrawSettings = {
  hotkey: string;
  hotkeyEnabled: boolean;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
};

type SettingsDrawApi = {
  getSettings(): Promise<WidrawSettings>;
  saveSettings(
    settings: WidrawSettings,
  ): Promise<{ ok: true; settings: WidrawSettings } | { ok: false; error: string }>;
  isOpen(): Promise<{ open: boolean }>;
  open(): Promise<{ open: boolean }>;
  close(): Promise<{ open: boolean }>;
  toggle(): Promise<{ open: boolean }>;
  notify(message: string): void;
  onOpenState(listener: (state: { open: boolean }) => void): () => void;
};

function getApi(): SettingsDrawApi {
  const existing = (window as unknown as { wiDraw?: SettingsDrawApi }).wiDraw;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();
  const openListeners = new Set<(state: { open: boolean }) => void>();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
      open?: boolean;
    };
    if (data?.channel === 'wi-draw-open' && typeof data.open === 'boolean') {
      for (const listener of openListeners) {
        listener({ open: data.open });
      }
      return;
    }
    if (data?.channel !== 'wi-draw-response' || data.id == null) {
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
      window.parent.postMessage({ channel: 'wi-draw', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    saveSettings: (settings) => call('saveSettings', settings),
    isOpen: () => call('isOpen'),
    open: () => call('open'),
    close: () => call('close'),
    toggle: () => call('toggle'),
    notify: (message) => {
      window.parent.postMessage({ channel: 'wi-draw', method: 'notify', args: [message] }, '*');
    },
    onOpenState: (listener) => {
      openListeners.add(listener);
      return () => openListeners.delete(listener);
    },
  };
}

const api = getApi();
const hotkeyEnabledEl = document.getElementById('hotkey-enabled') as HTMLInputElement;
const hotkeyEl = document.getElementById('hotkey') as HTMLInputElement;
const strokeColorEl = document.getElementById('stroke-color') as HTMLInputElement;
const bgColorEl = document.getElementById('bg-color') as HTMLInputElement;
const strokeWidthEl = document.getElementById('stroke-width') as HTMLInputElement;
const strokeWidthValueEl = document.getElementById('stroke-width-value') as HTMLSpanElement;
const toggleBtn = document.getElementById('toggle-btn') as HTMLButtonElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

let draft: WidrawSettings | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let recording = false;

function applyForm(settings: WidrawSettings): void {
  hotkeyEnabledEl.checked = settings.hotkeyEnabled;
  hotkeyEl.value = formatAcceleratorForDisplay(settings.hotkey);
  strokeColorEl.value = settings.strokeColor;
  bgColorEl.value = settings.backgroundColor;
  strokeWidthEl.value = String(settings.strokeWidth);
  strokeWidthValueEl.textContent = String(settings.strokeWidth);
}

function readForm(): WidrawSettings {
  return {
    hotkey: draft?.hotkey ?? 'Control+Alt+D',
    hotkeyEnabled: hotkeyEnabledEl.checked,
    strokeColor: strokeColorEl.value,
    backgroundColor: bgColorEl.value,
    strokeWidth: Number.parseInt(strokeWidthEl.value, 10) || 2,
  };
}

function setOpenState(open: boolean): void {
  statusEl.textContent = open ? 'Open' : 'Closed';
  statusEl.classList.toggle('is-open', open);
  toggleBtn.textContent = open ? 'Focus WI-Draw' : 'Open WI-Draw';
  closeBtn.disabled = !open;
}

function schedulePersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persist();
  }, 300);
}

async function persist(): Promise<void> {
  draft = readForm();
  const result = await api.saveSettings(draft);
  if (result.ok && result.settings) {
    draft = result.settings;
    applyForm(draft);
  }
}

async function init(): Promise<void> {
  draft = await api.getSettings();
  applyForm(draft);
  setOpenState((await api.isOpen()).open);
  api.onOpenState((state) => setOpenState(state.open));

  for (const el of [hotkeyEnabledEl, strokeColorEl, bgColorEl, strokeWidthEl]) {
    el.addEventListener('change', () => {
      if (el === strokeWidthEl) {
        strokeWidthValueEl.textContent = strokeWidthEl.value;
      }
      schedulePersist();
    });
    el.addEventListener('input', () => {
      if (el === strokeWidthEl) {
        strokeWidthValueEl.textContent = strokeWidthEl.value;
      }
      schedulePersist();
    });
  }

  hotkeyEl.addEventListener('focus', () => {
    recording = true;
    hotkeyEl.value = 'Press keys…';
  });

  hotkeyEl.addEventListener('blur', () => {
    recording = false;
    if (draft) {
      hotkeyEl.value = formatAcceleratorForDisplay(draft.hotkey);
    }
  });

  hotkeyEl.addEventListener('keydown', (event) => {
    if (!recording || !draft) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const preview = previewAccelerator(event);
    if (preview && !preview.endsWith('+…')) {
      draft = { ...readForm(), hotkey: preview };
      hotkeyEl.value = formatAcceleratorForDisplay(preview);
      void persist();
      hotkeyEl.blur();
      return;
    }
    const accelerator = keyboardEventToAccelerator(event);
    if (accelerator) {
      draft = { ...readForm(), hotkey: accelerator };
      hotkeyEl.value = formatAcceleratorForDisplay(accelerator);
      void persist();
      hotkeyEl.blur();
      return;
    }
    if (preview) {
      hotkeyEl.value = formatAcceleratorForDisplay(preview);
    }
  });

  toggleBtn.addEventListener('click', async () => {
    const state = await api.isOpen();
    if (state.open) {
      await api.open();
    } else {
      setOpenState((await api.open()).open);
    }
  });

  closeBtn.addEventListener('click', async () => {
    setOpenState((await api.close()).open);
  });
}

void init();
