import {
  formatAcceleratorForDisplay,
  keyboardEventToAccelerator,
  previewAccelerator,
} from '../../../shared/hotkeyInput.js';

export {};

type MouseButton = 'left' | 'right' | 'middle';
type ClickType = 'single' | 'double';
type RepeatMode = 'count' | 'untilStopped';
type PositionMode = 'current' | 'fixed';

type WiclickSettings = {
  intervalHours: number;
  intervalMins: number;
  intervalSecs: number;
  intervalMs: number;
  mouseButton: MouseButton;
  clickType: ClickType;
  repeatMode: RepeatMode;
  repeatCount: number;
  positionMode: PositionMode;
  posX: number;
  posY: number;
  hotkey: string;
};

type ClickerStatus = {
  running: boolean;
  clicks: number;
  message: string;
};

type WiClickApi = {
  getSettings(): Promise<WiclickSettings>;
  saveSettings(
    settings: WiclickSettings,
  ): Promise<{ ok: true; settings: WiclickSettings } | { ok: false; error: string }>;
  start(settings?: WiclickSettings): Promise<{ ok: boolean; error?: string }>;
  stop(): Promise<{ ok: boolean }>;
  toggle(settings?: WiclickSettings): Promise<{ ok: boolean; error?: string; running: boolean }>;
  status(): Promise<ClickerStatus>;
  getCursor(): Promise<{ x: number; y: number }>;
  pickLocation(): Promise<{ x: number; y: number }>;
  notify(message: string): void;
  onStatus(listener: (status: ClickerStatus) => void): () => void;
};

declare global {
  interface Window {
    wiClick?: WiClickApi;
  }
}

function getApi(): WiClickApi {
  if (window.wiClick) {
    return window.wiClick;
  }

  let seq = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();
  const statusListeners = new Set<(status: ClickerStatus) => void>();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
      status?: ClickerStatus;
    };
    if (data?.channel === 'wi-click-status' && data.status) {
      for (const listener of statusListeners) {
        listener(data.status);
      }
      return;
    }
    if (data?.channel !== 'wi-click-response' || data.id == null) {
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
      window.parent.postMessage({ channel: 'wi-click', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    saveSettings: (settings) => call('saveSettings', settings),
    start: (settings) => call('start', settings),
    stop: () => call('stop'),
    toggle: (settings) => call('toggle', settings),
    status: () => call('status'),
    getCursor: () => call('getCursor'),
    pickLocation: () => call('pickLocation'),
    notify: (message) => {
      window.parent.postMessage({ channel: 'wi-click', method: 'notify', args: [message] }, '*');
    },
    onStatus: (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
  };
}

const api = getApi();

const hoursEl = document.getElementById('hours') as HTMLInputElement;
const minsEl = document.getElementById('mins') as HTMLInputElement;
const secsEl = document.getElementById('secs') as HTMLInputElement;
const msEl = document.getElementById('ms') as HTMLInputElement;
const mouseButtonEl = document.getElementById('mouse-button') as HTMLSelectElement;
const clickTypeEl = document.getElementById('click-type') as HTMLSelectElement;
const repeatCountRadio = document.getElementById('repeat-count') as HTMLInputElement;
const repeatUntilRadio = document.getElementById('repeat-until') as HTMLInputElement;
const repeatTimesEl = document.getElementById('repeat-times') as HTMLInputElement;
const posCurrentRadio = document.getElementById('pos-current') as HTMLInputElement;
const posFixedRadio = document.getElementById('pos-fixed') as HTMLInputElement;
const posXEl = document.getElementById('pos-x') as HTMLInputElement;
const posYEl = document.getElementById('pos-y') as HTMLInputElement;
const pickBtn = document.getElementById('pick-btn') as HTMLButtonElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
const hotkeyBtn = document.getElementById('hotkey-btn') as HTMLButtonElement;
const helpBtn = document.getElementById('help-btn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const hotkeyDialog = document.getElementById('hotkey-dialog') as HTMLDialogElement;
const hotkeyInput = document.getElementById('hotkey-input') as HTMLInputElement;
const hotkeySave = document.getElementById('hotkey-save') as HTMLButtonElement;

let draft: WiclickSettings | null = null;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let recordingHotkey = false;
let pendingHotkey = 'F6';

function num(el: HTMLInputElement, fallback = 0): number {
  const value = Number.parseInt(el.value, 10);
  return Number.isFinite(value) ? value : fallback;
}

function readForm(): WiclickSettings {
  return {
    intervalHours: num(hoursEl),
    intervalMins: num(minsEl),
    intervalSecs: num(secsEl),
    intervalMs: num(msEl, 100),
    mouseButton: mouseButtonEl.value as MouseButton,
    clickType: clickTypeEl.value as ClickType,
    repeatMode: repeatCountRadio.checked ? 'count' : 'untilStopped',
    repeatCount: Math.max(1, num(repeatTimesEl, 1)),
    positionMode: posFixedRadio.checked ? 'fixed' : 'current',
    posX: num(posXEl),
    posY: num(posYEl),
    hotkey: draft?.hotkey ?? 'F6',
  };
}

function applyForm(settings: WiclickSettings): void {
  hoursEl.value = String(settings.intervalHours);
  minsEl.value = String(settings.intervalMins);
  secsEl.value = String(settings.intervalSecs);
  msEl.value = String(settings.intervalMs);
  mouseButtonEl.value = settings.mouseButton;
  clickTypeEl.value = settings.clickType;
  repeatCountRadio.checked = settings.repeatMode === 'count';
  repeatUntilRadio.checked = settings.repeatMode !== 'count';
  repeatTimesEl.value = String(settings.repeatCount);
  posCurrentRadio.checked = settings.positionMode !== 'fixed';
  posFixedRadio.checked = settings.positionMode === 'fixed';
  posXEl.value = String(settings.posX);
  posYEl.value = String(settings.posY);
  pendingHotkey = settings.hotkey;
  hotkeyInput.value = formatAcceleratorForDisplay(settings.hotkey);
  updateActionLabels(settings.hotkey);
}

function updateActionLabels(hotkey: string): void {
  const label = formatAcceleratorForDisplay(hotkey) || hotkey;
  startBtn.textContent = `Start (${label})`;
  stopBtn.textContent = `Stop (${label})`;
}

function setStatus(status: ClickerStatus): void {
  statusEl.textContent = status.message;
  statusEl.classList.toggle('is-running', status.running);
  startBtn.disabled = status.running;
  stopBtn.disabled = !status.running;
}

function schedulePersist(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persist();
  }, 350);
}

async function persist(): Promise<void> {
  draft = readForm();
  const result = await api.saveSettings(draft);
  if (result.ok) {
    draft = result.settings;
    applyForm(draft);
  }
}

async function init(): Promise<void> {
  draft = await api.getSettings();
  applyForm(draft);
  setStatus(await api.status());
  api.onStatus(setStatus);

  const onChange = () => {
    draft = readForm();
    schedulePersist();
  };

  for (const el of [
    hoursEl,
    minsEl,
    secsEl,
    msEl,
    mouseButtonEl,
    clickTypeEl,
    repeatCountRadio,
    repeatUntilRadio,
    repeatTimesEl,
    posCurrentRadio,
    posFixedRadio,
    posXEl,
    posYEl,
  ]) {
    el.addEventListener('change', onChange);
    el.addEventListener('input', onChange);
  }

  pickBtn.addEventListener('click', async () => {
    posFixedRadio.checked = true;
    const point = await api.pickLocation();
    posXEl.value = String(point.x);
    posYEl.value = String(point.y);
    draft = readForm();
    await persist();
  });

  startBtn.addEventListener('click', async () => {
    draft = readForm();
    const result = await api.start(draft);
    if (!result.ok && result.error) {
      statusEl.textContent = result.error;
    }
  });

  stopBtn.addEventListener('click', async () => {
    await api.stop();
  });

  helpBtn.addEventListener('click', () => {
    api.notify(
      'Set interval → options → Start. Hotkey toggles Start/Stop. Pick location captures cursor after 2s.',
    );
  });

  hotkeyBtn.addEventListener('click', () => {
    pendingHotkey = draft?.hotkey ?? 'F6';
    hotkeyInput.value = formatAcceleratorForDisplay(pendingHotkey);
    hotkeyDialog.showModal();
    hotkeyInput.focus();
  });

  hotkeyInput.addEventListener('focus', () => {
    recordingHotkey = true;
    hotkeyInput.classList.add('recording');
    hotkeyInput.value = 'Press keys…';
  });

  hotkeyInput.addEventListener('blur', () => {
    recordingHotkey = false;
    hotkeyInput.classList.remove('recording');
    hotkeyInput.value = formatAcceleratorForDisplay(pendingHotkey);
  });

  hotkeyInput.addEventListener('keydown', (event) => {
    if (!recordingHotkey) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      hotkeyDialog.close();
      return;
    }
    const preview = previewAccelerator(event);
    if (preview && !preview.endsWith('+…')) {
      pendingHotkey = preview;
      hotkeyInput.value = formatAcceleratorForDisplay(preview);
      return;
    }
    const accelerator = keyboardEventToAccelerator(event);
    if (accelerator) {
      pendingHotkey = accelerator;
      hotkeyInput.value = formatAcceleratorForDisplay(accelerator);
      return;
    }
    if (preview) {
      hotkeyInput.value = formatAcceleratorForDisplay(preview);
    }
  });

  hotkeySave.addEventListener('click', async () => {
    if (!draft) {
      return;
    }
    draft = { ...readForm(), hotkey: pendingHotkey };
    const result = await api.saveSettings(draft);
    if (result.ok) {
      draft = result.settings;
      applyForm(draft);
    }
    hotkeyDialog.close();
  });
}

void init();
