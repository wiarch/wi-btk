export {};

type ClockAlarm = {
  id: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
  lastFiredDate: string;
};

type WorldClock = { id: string; label: string; timeZone: string };

type WiclockSettings = {
  alarms: ClockAlarm[];
  worldClocks: WorldClock[];
  use24h: boolean;
};

type WiClockApi = {
  getSettings(): Promise<WiclockSettings>;
  saveSettings(settings: WiclockSettings): Promise<{ ok: boolean; settings?: WiclockSettings }>;
  addAlarm(partial: Partial<ClockAlarm>): Promise<{ ok: boolean; settings?: WiclockSettings }>;
  notify(message: string): void;
  onSettingsChanged(listener: (settings: WiclockSettings) => void): () => void;
};

type ShellApi = {
  openPopout(appId: string): Promise<{ ok: boolean }>;
};

const ZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Caracas',
  'Europe/London',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function getClockApi(): WiClockApi {
  const existing = (window as unknown as { wiClock?: WiClockApi }).wiClock;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e?: unknown) => void }>();
  const listeners = new Set<(s: WiclockSettings) => void>();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
      settings?: WiclockSettings;
    };
    if (data?.channel === 'wi-clock-settings' && data.settings) {
      for (const listener of listeners) {
        listener(data.settings);
      }
      return;
    }
    if (data?.channel !== 'wi-clock-response' || data.id == null) {
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
      pending.set(id, { resolve: (v) => resolve(v as T), reject });
      window.parent.postMessage({ channel: 'wi-clock', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    saveSettings: (settings) => call('saveSettings', settings),
    addAlarm: (partial) => call('addAlarm', partial),
    notify: (message) => {
      window.parent.postMessage({ channel: 'wi-clock', method: 'notify', args: [message] }, '*');
    },
    onSettingsChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function getShellApi(): ShellApi | null {
  const direct = (window as unknown as { wiShell?: ShellApi }).wiShell;
  if (direct) {
    return direct;
  }
  if (window.parent === window) {
    return null;
  }
  return {
    openPopout: (appId) =>
      new Promise((resolve) => {
        const id = Date.now();
        const handler = (event: MessageEvent) => {
          const data = event.data as { channel?: string; id?: number; result?: { ok: boolean } };
          if (data?.channel === 'wi-shell-response' && data.id === id) {
            window.removeEventListener('message', handler);
            resolve(data.result ?? { ok: false });
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ channel: 'wi-shell', id, method: 'openPopout', args: [appId] }, '*');
      }),
  };
}

const api = getClockApi();
const localTime = document.getElementById('local-time') as HTMLDivElement;
const localDate = document.getElementById('local-date') as HTMLParagraphElement;
const use24hEl = document.getElementById('use-24h') as HTMLInputElement;
const stopTime = document.getElementById('stop-time') as HTMLDivElement;
const stopToggle = document.getElementById('stop-toggle') as HTMLButtonElement;
const stopReset = document.getElementById('stop-reset') as HTMLButtonElement;
const alarmList = document.getElementById('alarm-list') as HTMLDivElement;
const alarmAdd = document.getElementById('alarm-add') as HTMLButtonElement;
const alarmLabel = document.getElementById('alarm-label') as HTMLInputElement;
const alarmHour = document.getElementById('alarm-hour') as HTMLInputElement;
const alarmMinute = document.getElementById('alarm-minute') as HTMLInputElement;
const worldList = document.getElementById('world-list') as HTMLDivElement;
const worldAdd = document.getElementById('world-add') as HTMLButtonElement;
const worldLabel = document.getElementById('world-label') as HTMLInputElement;
const worldTz = document.getElementById('world-tz') as HTMLSelectElement;
const popoutBtn = document.getElementById('popout-btn') as HTMLButtonElement;

let settings: WiclockSettings | null = null;
let stopRunning = false;
let stopStarted = 0;
let stopAccum = 0;
let stopTimer: ReturnType<typeof setInterval> | null = null;

for (const zone of ZONES) {
  const opt = document.createElement('option');
  opt.value = zone;
  opt.textContent = zone;
  worldTz.append(opt);
}

function formatTime(date: Date, timeZone?: string, hour12 = false): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12,
    timeZone,
  }).format(date);
}

function tickClock(): void {
  const now = new Date();
  const hour12 = !(settings?.use24h ?? true);
  localTime.textContent = formatTime(now, undefined, hour12);
  localDate.textContent = now.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  renderWorld();
}

function formatStop(ms: number): string {
  const total = Math.max(0, ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = Math.floor((total % 1000) / 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function renderStop(): void {
  const elapsed = stopAccum + (stopRunning ? Date.now() - stopStarted : 0);
  stopTime.textContent = formatStop(elapsed);
}

function renderAlarms(): void {
  if (!settings) {
    return;
  }
  alarmList.innerHTML = '';
  for (const alarm of settings.alarms) {
    const row = document.createElement('div');
    row.className = 'item';
    const copy = document.createElement('div');
    copy.innerHTML = `<strong>${alarm.label}</strong><small>${String(alarm.hour).padStart(2, '0')}:${String(alarm.minute).padStart(2, '0')}</small>`;
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '6px';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn';
    toggle.textContent = alarm.enabled ? 'On' : 'Off';
    toggle.addEventListener('click', async () => {
      alarm.enabled = !alarm.enabled;
      const result = await api.saveSettings(settings!);
      if (result.settings) {
        settings = result.settings;
        renderAlarms();
      }
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn danger';
    del.textContent = '✕';
    del.addEventListener('click', async () => {
      settings!.alarms = settings!.alarms.filter((item) => item.id !== alarm.id);
      const result = await api.saveSettings(settings!);
      if (result.settings) {
        settings = result.settings;
        renderAlarms();
      }
    });
    actions.append(toggle, del);
    row.append(copy, actions);
    alarmList.append(row);
  }
}

function renderWorld(): void {
  if (!settings) {
    return;
  }
  const hour12 = !settings.use24h;
  worldList.innerHTML = '';
  for (const clock of settings.worldClocks) {
    const row = document.createElement('div');
    row.className = 'item';
    let time = '—';
    try {
      time = formatTime(new Date(), clock.timeZone, hour12);
    } catch {
      time = 'Invalid TZ';
    }
    const copy = document.createElement('div');
    copy.innerHTML = `<strong>${clock.label}</strong><small>${clock.timeZone}</small>`;
    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.alignItems = 'center';
    right.style.gap = '8px';
    const timeEl = document.createElement('strong');
    timeEl.textContent = time;
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn danger';
    del.textContent = '✕';
    del.addEventListener('click', async () => {
      settings!.worldClocks = settings!.worldClocks.filter((item) => item.id !== clock.id);
      const result = await api.saveSettings(settings!);
      if (result.settings) {
        settings = result.settings;
        renderWorld();
      }
    });
    right.append(timeEl, del);
    row.append(copy, right);
    worldList.append(row);
  }
}

for (const tab of document.querySelectorAll<HTMLButtonElement>('.tab')) {
  tab.addEventListener('click', () => {
    const id = tab.dataset.tab;
    for (const t of document.querySelectorAll('.tab')) {
      t.classList.toggle('active', t === tab);
    }
    for (const panel of document.querySelectorAll<HTMLElement>('.panel')) {
      const active = panel.id === `tab-${id}`;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    }
  });
}

use24hEl.addEventListener('change', async () => {
  if (!settings) {
    return;
  }
  settings.use24h = use24hEl.checked;
  const result = await api.saveSettings(settings);
  if (result.settings) {
    settings = result.settings;
  }
  tickClock();
});

stopToggle.addEventListener('click', () => {
  if (stopRunning) {
    stopAccum += Date.now() - stopStarted;
    stopRunning = false;
    if (stopTimer) {
      clearInterval(stopTimer);
      stopTimer = null;
    }
    stopToggle.textContent = 'Start';
  } else {
    stopStarted = Date.now();
    stopRunning = true;
    stopToggle.textContent = 'Stop';
    stopTimer = setInterval(renderStop, 30);
  }
  renderStop();
});

stopReset.addEventListener('click', () => {
  stopRunning = false;
  stopAccum = 0;
  stopStarted = 0;
  if (stopTimer) {
    clearInterval(stopTimer);
    stopTimer = null;
  }
  stopToggle.textContent = 'Start';
  renderStop();
});

alarmAdd.addEventListener('click', async () => {
  const result = await api.addAlarm({
    label: alarmLabel.value.trim() || 'Alarm',
    hour: Number.parseInt(alarmHour.value, 10) || 0,
    minute: Number.parseInt(alarmMinute.value, 10) || 0,
    enabled: true,
  });
  if (result.settings) {
    settings = result.settings;
    renderAlarms();
  }
});

worldAdd.addEventListener('click', async () => {
  if (!settings) {
    return;
  }
  settings.worldClocks.push({
    id: `${Date.now()}`,
    label: worldLabel.value.trim() || worldTz.value,
    timeZone: worldTz.value,
  });
  const result = await api.saveSettings(settings);
  if (result.settings) {
    settings = result.settings;
    worldLabel.value = '';
    renderWorld();
  }
});

popoutBtn.addEventListener('click', async () => {
  if (window.parent === window) {
    return;
  }
  await getShellApi()?.openPopout('wiclock');
});

async function init(): Promise<void> {
  settings = await api.getSettings();
  use24hEl.checked = settings.use24h;
  renderAlarms();
  renderWorld();
  tickClock();
  setInterval(tickClock, 1000);
  api.onSettingsChanged((next) => {
    settings = next;
    use24hEl.checked = next.use24h;
    renderAlarms();
    renderWorld();
  });
}

void init();
