export {};

type PowerPlan = {
  guid: string;
  name: string;
  active: boolean;
};

type DisplayInfo = {
  width: number;
  height: number;
  frequency: number;
  modes: Array<{ width: number; height: number; frequency: number }>;
};

type BootLimits = {
  numProcessors: number | null;
  maxMemoryMb: number | null;
};

type SystemSnapshot = {
  platform: string;
  logicalProcessors: number;
  totalMemoryMb: number;
  freeMemoryMb: number;
  boot: BootLimits;
  powerPlans: PowerPlan[];
  display: DisplayInfo | null;
  adminHint: string;
};

type WiboosterSettings = {
  preferredProcessors: number;
  preferredMemoryMb: number;
};

type WiBoosterApi = {
  getSettings(): Promise<WiboosterSettings>;
  saveSettings(
    settings: WiboosterSettings,
  ): Promise<{ ok: true; settings: WiboosterSettings } | { ok: false; error: string }>;
  snapshot(): Promise<SystemSnapshot>;
  setPowerPlan(guid: string): Promise<{ ok: boolean; error?: string }>;
  setRefreshRate(frequency: number): Promise<{ ok: boolean; error?: string }>;
  setBootLimits(payload: {
    processors: number;
    memoryMb: number;
  }): Promise<{ ok: boolean; error?: string; needsReboot?: boolean }>;
  notify(message: string): void;
};

function getApi(): WiBoosterApi {
  const existing = (window as unknown as { wiBooster?: WiBoosterApi }).wiBooster;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
    };
    if (data?.channel !== 'wi-booster-response' || data.id == null) {
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
      window.parent.postMessage({ channel: 'wi-booster', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    saveSettings: (settings) => call('saveSettings', settings),
    snapshot: () => call('snapshot'),
    setPowerPlan: (guid) => call('setPowerPlan', guid),
    setRefreshRate: (frequency) => call('setRefreshRate', frequency),
    setBootLimits: (payload) => call('setBootLimits', payload),
    notify: (message) => {
      window.parent.postMessage({ channel: 'wi-booster', method: 'notify', args: [message] }, '*');
    },
  };
}

const api = getApi();
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const statCores = document.getElementById('stat-cores') as HTMLElement;
const statRam = document.getElementById('stat-ram') as HTMLElement;
const statFree = document.getElementById('stat-free') as HTMLElement;
const bootProcessors = document.getElementById('boot-processors') as HTMLSelectElement;
const bootMemory = document.getElementById('boot-memory') as HTMLInputElement;
const bootCurrent = document.getElementById('boot-current') as HTMLParagraphElement;
const bootHint = document.getElementById('boot-hint') as HTMLParagraphElement;
const bootApply = document.getElementById('boot-apply') as HTMLButtonElement;
const planList = document.getElementById('plan-list') as HTMLDivElement;
const planEmpty = document.getElementById('plan-empty') as HTMLParagraphElement;
const displayCurrent = document.getElementById('display-current') as HTMLParagraphElement;
const displayHz = document.getElementById('display-hz') as HTMLSelectElement;
const displayApply = document.getElementById('display-apply') as HTMLButtonElement;

let snapshot: SystemSnapshot | null = null;

function setStatus(message: string, kind: '' | 'ok' | 'error' = ''): void {
  statusEl.textContent = message;
  statusEl.className = `status${kind ? ` is-${kind}` : ''}`;
}

function fillBootControls(data: SystemSnapshot, settings: WiboosterSettings): void {
  bootProcessors.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value = '0';
  allOpt.textContent = `All (${data.logicalProcessors})`;
  bootProcessors.append(allOpt);
  for (let i = 1; i <= data.logicalProcessors; i += 1) {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = String(i);
    bootProcessors.append(opt);
  }

  const currentProc = data.boot.numProcessors ?? 0;
  const preferredProc = settings.preferredProcessors || currentProc;
  bootProcessors.value = String(
    preferredProc > 0 && preferredProc <= data.logicalProcessors ? preferredProc : 0,
  );

  bootMemory.max = String(data.totalMemoryMb);
  bootMemory.placeholder = `0 = all (max ${data.totalMemoryMb})`;
  const currentMem = data.boot.maxMemoryMb ?? 0;
  const preferredMem = settings.preferredMemoryMb || currentMem;
  bootMemory.value = String(preferredMem > 0 ? preferredMem : 0);

  const procText = data.boot.numProcessors
    ? `${data.boot.numProcessors} processors`
    : 'all processors';
  const memText = data.boot.maxMemoryMb ? `${data.boot.maxMemoryMb} MB` : 'all memory';
  bootCurrent.textContent = `Current BCD: ${procText} / ${memText}`;
  bootHint.textContent = data.adminHint;
}

function fillPlans(data: SystemSnapshot): void {
  planList.innerHTML = '';
  planEmpty.hidden = data.powerPlans.length > 0;
  for (const plan of data.powerPlans) {
    const row = document.createElement('div');
    row.className = `plan-row${plan.active ? ' active' : ''}`;
    const name = document.createElement('strong');
    name.textContent = plan.name + (plan.active ? ' · active' : '');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn';
    btn.textContent = plan.active ? 'Active' : 'Set active';
    btn.disabled = plan.active;
    btn.addEventListener('click', async () => {
      setStatus('Applying power plan…');
      const result = await api.setPowerPlan(plan.guid);
      if (!result.ok) {
        setStatus(result.error ?? 'Failed', 'error');
        return;
      }
      setStatus('Power plan applied', 'ok');
      await load();
    });
    row.append(name, btn);
    planList.append(row);
  }
}

function fillDisplay(data: SystemSnapshot): void {
  displayHz.innerHTML = '';
  if (!data.display) {
    displayCurrent.textContent = 'Display info unavailable';
    displayApply.disabled = true;
    return;
  }
  displayApply.disabled = false;
  displayCurrent.textContent = `${data.display.width}×${data.display.height} @ ${data.display.frequency} Hz`;
  const freqs = data.display.modes.map((mode) => mode.frequency);
  const list = freqs.length > 0 ? freqs : [data.display.frequency];
  for (const hz of list) {
    const opt = document.createElement('option');
    opt.value = String(hz);
    opt.textContent = `${hz} Hz`;
    if (hz === data.display.frequency) {
      opt.selected = true;
    }
    displayHz.append(opt);
  }
}

async function load(): Promise<void> {
  setStatus('Loading…');
  const [settings, data] = await Promise.all([api.getSettings(), api.snapshot()]);
  snapshot = data;
  statCores.textContent = String(data.logicalProcessors);
  statRam.textContent = `${data.totalMemoryMb} MB`;
  statFree.textContent = `${data.freeMemoryMb} MB`;
  fillBootControls(data, settings);
  fillPlans(data);
  fillDisplay(data);
  setStatus(data.platform === 'win32' ? '' : data.adminHint);
}

refreshBtn.addEventListener('click', () => {
  void load();
});

bootApply.addEventListener('click', async () => {
  if (!snapshot) {
    return;
  }
  const processors = Number.parseInt(bootProcessors.value, 10) || 0;
  const memoryMb = Number.parseInt(bootMemory.value, 10) || 0;
  setStatus('Requesting Administrator…');
  const result = await api.setBootLimits({ processors, memoryMb });
  if (!result.ok) {
    setStatus(result.error ?? 'Failed', 'error');
    return;
  }
  setStatus('Saved. Reboot to apply CPU/RAM limits.', 'ok');
  await load();
});

displayApply.addEventListener('click', async () => {
  const hz = Number.parseInt(displayHz.value, 10);
  setStatus(`Setting ${hz} Hz…`);
  const result = await api.setRefreshRate(hz);
  if (!result.ok) {
    setStatus(result.error ?? 'Failed', 'error');
    return;
  }
  setStatus(`Display @ ${hz} Hz`, 'ok');
  await load();
});

void load();
