export {};

type MonitorOverride = {
  included: boolean;
  brightness: number;
};

type WidimmerSettings = {
  enabled: boolean;
  brightness: number;
  kelvin: number;
  useHardwareBrightness: boolean;
  linkAll: boolean;
  monitors: Record<string, MonitorOverride>;
  autoSchedule: boolean;
  dayKelvin: number;
  nightKelvin: number;
  dayBrightness: number;
  nightBrightness: number;
  nightStart: string;
  dayStart: string;
};

type MonitorInfo = {
  id: string;
  deviceName: string;
  name: string;
  primary: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleFactor: number;
};

type WiDimmerApi = {
  getSettings(): Promise<{
    settings: WidimmerSettings;
    effective: { kelvin: number; brightness: number };
    monitors: MonitorInfo[];
  }>;
  listMonitors(): Promise<MonitorInfo[]>;
  live(settings: Partial<WidimmerSettings>): Promise<{
    ok: boolean;
    kelvin: number;
    brightness: number;
    error?: string;
  }>;
  saveSettings(
    settings: Partial<WidimmerSettings>,
  ): Promise<
    | {
        ok: true;
        settings: WidimmerSettings;
        applied: { ok: boolean; kelvin: number; brightness: number; error?: string };
        monitors: MonitorInfo[];
      }
    | { ok: false; error: string }
  >;
  reset(): Promise<{ ok: boolean; error?: string }>;
  onSettingsChanged(
    listener: (payload: {
      settings: WidimmerSettings;
      monitors?: MonitorInfo[];
      force?: boolean;
    }) => void,
  ): () => void;
};

function getDimmerApi(): WiDimmerApi {
  const existing = (window as unknown as { wiDimmer?: WiDimmerApi }).wiDimmer;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e?: unknown) => void }>();
  const listeners = new Set<
    (p: { settings: WidimmerSettings; monitors?: MonitorInfo[]; force?: boolean }) => void
  >();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
      payload?: { settings: WidimmerSettings; monitors?: MonitorInfo[]; force?: boolean };
      settings?: WidimmerSettings;
    };
    if (data?.channel === 'wi-dimmer-settings') {
      const payload = data.payload ?? (data.settings ? { settings: data.settings } : null);
      if (payload?.settings) {
        const enriched = {
          ...payload,
          force: Boolean(
            (data as { force?: boolean }).force ?? (payload as { force?: boolean }).force,
          ),
        };
        for (const listener of listeners) {
          listener(enriched);
        }
      }
      return;
    }
    if (data?.channel !== 'wi-dimmer-response' || data.id == null) {
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
      window.parent.postMessage({ channel: 'wi-dimmer', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    listMonitors: () => call('listMonitors'),
    live: (settings) => call('live', settings),
    saveSettings: (settings) => call('saveSettings', settings),
    reset: () => call('reset'),
    onSettingsChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const dimmerApi = getDimmerApi();
const appEl = document.getElementById('dimmer-app') as HTMLElement;
const enabledEl = document.getElementById('enabled') as HTMLInputElement;
const enabledLabel = document.getElementById('enabled-label') as HTMLElement;
const kelvinEl = document.getElementById('kelvin') as HTMLInputElement;
const kelvinVal = document.getElementById('kelvin-val') as HTMLElement;
const briEl = document.getElementById('brightness') as HTMLInputElement;
const briVal = document.getElementById('bri-val') as HTMLElement;
const hwBriEl = document.getElementById('hw-bri') as HTMLInputElement;
const linkAllEl = document.getElementById('link-all') as HTMLInputElement;
const monitorsEl = document.getElementById('monitors') as HTMLElement;
const autoEl = document.getElementById('auto') as HTMLInputElement;
const scheduleEl = document.getElementById('schedule') as HTMLElement;
const dayStartEl = document.getElementById('day-start') as HTMLInputElement;
const nightStartEl = document.getElementById('night-start') as HTMLInputElement;
const dayKEl = document.getElementById('day-k') as HTMLInputElement;
const nightKEl = document.getElementById('night-k') as HTMLInputElement;
const dayBEl = document.getElementById('day-b') as HTMLInputElement;
const nightBEl = document.getElementById('night-b') as HTMLInputElement;
const previewSky = document.querySelector('.preview-sky') as HTMLElement;
const previewLabel = document.getElementById('preview-label') as HTMLElement;
const statusEl = document.getElementById('status') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const refreshMonitorsBtn = document.getElementById('refresh-monitors') as HTMLButtonElement;

let settings: WidimmerSettings | null = null;
let monitors: MonitorInfo[] = [];
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let liveTimer: ReturnType<typeof setTimeout> | null = null;
/** Live draft so UI doesn't snap back while apply runs */
let draftMonitors: Record<string, MonitorOverride> = {};
let draftBrightness = 1;
let draftKelvin = 6500;
let liveInFlight = false;
let liveQueued: Partial<WidimmerSettings> | null = null;

function kelvinLabel(k: number): string {
  if (k <= 2200) return 'Candle';
  if (k <= 3000) return 'Warm';
  if (k <= 3800) return 'Evening';
  if (k <= 5000) return 'Office';
  return 'Daylight';
}

const SAFE_MIN_PCT = 50;

function setStatus(message: string, kind: '' | 'ok' | 'error' | 'warn' = ''): void {
  statusEl.textContent = message;
  statusEl.className = `status${kind ? ` is-${kind}` : ''}`;
}

function paintCriticalHint(brightnessPct: number): void {
  const critical = brightnessPct < SAFE_MIN_PCT;
  briEl.classList.toggle('is-critical', critical);
  if (critical) {
    setStatus(`Crítico <${SAFE_MIN_PCT}% · confirma en 5s o vuelve a ${SAFE_MIN_PCT}%`, 'warn');
  }
}

function paintPreview(kelvin: number, brightness: number): void {
  const warm = Math.min(1, Math.max(0, (6500 - kelvin) / (6500 - 1900)));
  // Amber bias like overlay (not lemon yellow)
  const r = Math.round(255);
  const g = Math.round(255 - warm * 120);
  const b = Math.round(255 - warm * 200);
  previewSky.style.background = `rgb(${r},${g},${b})`;
  const safe = SAFE_MIN_PCT / 100;
  const gain =
    brightness >= safe
      ? brightness
      : 0.002 + Math.pow(Math.max(0, (brightness - 0.01) / (safe - 0.01)), 3.6) * (safe - 0.002);
  previewSky.style.filter = `brightness(${Math.max(0.02, gain)})`;
  previewLabel.textContent = `${kelvin} K · ${kelvinLabel(kelvin)} · ${Math.round(brightness * 100)}%`;
}

function monitorState(deviceName: string): MonitorOverride {
  const existing = draftMonitors[deviceName] ?? settings?.monitors?.[deviceName];
  return {
    included: existing?.included ?? true,
    brightness: existing?.brightness ?? draftBrightness,
  };
}

function renderMonitors(): void {
  if (!monitors.length) {
    monitorsEl.innerHTML = '<p class="monitor-meta">No hay pantallas</p>';
    return;
  }
  monitorsEl.innerHTML = monitors
    .map((m) => {
      const state = monitorState(m.deviceName);
      const bri = Math.round(state.brightness * 100);
      return `<article class="monitor ${state.included ? '' : 'is-off'}" data-mid="${m.id}">
        <div class="monitor-top">
          <div>
            <div class="monitor-name">${m.name}</div>
            <div class="monitor-meta">${m.width}×${m.height}</div>
          </div>
          <label class="check">
            <input type="checkbox" class="mon-include" data-mid="${m.id}" ${state.included ? 'checked' : ''} />
            <span>Usar</span>
          </label>
        </div>
        <label class="field">
          <div class="field-head">
            <span>Brillo</span>
            <strong class="mon-bri-val">${bri}%</strong>
          </div>
          <input class="mon-bri" data-mid="${m.id}" type="range" min="1" max="100" step="1" value="${bri}" ${linkAllEl.checked ? 'disabled' : ''} />
        </label>
      </article>`;
    })
    .join('');

  for (const el of monitorsEl.querySelectorAll<HTMLInputElement>('.mon-include, .mon-bri')) {
    el.addEventListener('input', () => {
      if (el.classList.contains('mon-bri')) {
        const card = el.closest('.monitor');
        const val = card?.querySelector('.mon-bri-val');
        if (val) {
          val.textContent = `${el.value}%`;
        }
      }
      syncDraftFromDom();
      scheduleSave();
    });
    el.addEventListener('change', () => {
      syncDraftFromDom();
      scheduleSave();
    });
  }
}

function syncDraftFromDom(): void {
  draftKelvin = Number(kelvinEl.value);
  draftBrightness = Number(briEl.value) / 100;
  const next: Record<string, MonitorOverride> = { ...draftMonitors };
  for (const m of monitors) {
    const card = monitorsEl.querySelector<HTMLElement>(`.monitor[data-mid="${m.id}"]`);
    const include = card?.querySelector<HTMLInputElement>('.mon-include');
    const bri = card?.querySelector<HTMLInputElement>('.mon-bri');
    next[m.deviceName] = {
      included: include?.checked ?? true,
      brightness: bri ? Number(bri.value) / 100 : draftBrightness,
    };
  }
  draftMonitors = next;
}

function forceBrightnessSliders(brightness: number, mon?: Record<string, MonitorOverride>): void {
  draftBrightness = brightness;
  if (mon) {
    draftMonitors = { ...mon };
  }
  const pct = Math.round(brightness * 100);
  briEl.value = String(pct);
  briVal.textContent = `${pct}%`;
  paintCriticalHint(pct);
  paintPreview(draftKelvin, draftBrightness);
  for (const el of monitorsEl.querySelectorAll<HTMLInputElement>('.mon-bri')) {
    const card = el.closest('.monitor');
    const mid = el.dataset.mid;
    const monitor = monitors.find((m) => m.id === mid);
    const bri = monitor
      ? Math.round((draftMonitors[monitor.deviceName]?.brightness ?? brightness) * 100)
      : pct;
    el.value = String(bri);
    const label = card?.querySelector('.mon-bri-val');
    if (label) {
      label.textContent = `${bri}%`;
    }
  }
}

function applyToForm(s: WidimmerSettings, nextMonitors?: MonitorInfo[], keepDraft = false): void {
  settings = s;
  if (nextMonitors) {
    monitors = nextMonitors;
  }
  if (!keepDraft) {
    draftBrightness = s.brightness;
    draftKelvin = s.kelvin;
    draftMonitors = { ...s.monitors };
  }
  enabledEl.checked = s.enabled;
  enabledLabel.textContent = s.enabled ? 'On' : 'Off';
  kelvinEl.value = String(keepDraft ? draftKelvin : s.kelvin);
  kelvinVal.textContent = `${keepDraft ? draftKelvin : s.kelvin} K`;
  briEl.value = String(Math.round((keepDraft ? draftBrightness : s.brightness) * 100));
  briVal.textContent = `${Math.round((keepDraft ? draftBrightness : s.brightness) * 100)}%`;
  hwBriEl.checked = s.useHardwareBrightness;
  linkAllEl.checked = s.linkAll;
  appEl.classList.toggle('per-monitor', !s.linkAll);
  autoEl.checked = s.autoSchedule;
  scheduleEl.hidden = !s.autoSchedule;
  dayStartEl.value = s.dayStart;
  nightStartEl.value = s.nightStart;
  dayKEl.value = String(s.dayKelvin);
  nightKEl.value = String(s.nightKelvin);
  dayBEl.value = String(Math.round(s.dayBrightness * 100));
  nightBEl.value = String(Math.round(s.nightBrightness * 100));
  paintPreview(keepDraft ? draftKelvin : s.kelvin, keepDraft ? draftBrightness : s.brightness);
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.preset')) {
    btn.classList.toggle('active', Number(btn.dataset.k) === (keepDraft ? draftKelvin : s.kelvin));
  }
  renderMonitors();
  if (!keepDraft) {
    forceBrightnessSliders(s.brightness, s.monitors);
  }
}

function readForm(): Partial<WidimmerSettings> {
  syncDraftFromDom();
  return {
    enabled: enabledEl.checked,
    kelvin: draftKelvin,
    brightness: draftBrightness,
    useHardwareBrightness: hwBriEl.checked,
    linkAll: linkAllEl.checked,
    monitors: draftMonitors,
    autoSchedule: autoEl.checked,
    dayStart: dayStartEl.value,
    nightStart: nightStartEl.value,
    dayKelvin: Number(dayKEl.value),
    nightKelvin: Number(nightKEl.value),
    dayBrightness: Number(dayBEl.value) / 100,
    nightBrightness: Number(nightBEl.value) / 100,
  };
}

function scheduleSave(): void {
  syncDraftFromDom();
  paintPreview(draftKelvin, draftBrightness);
  kelvinVal.textContent = `${draftKelvin} K`;
  briVal.textContent = `${Math.round(draftBrightness * 100)}%`;
  paintCriticalHint(Math.round(draftBrightness * 100));
  enabledLabel.textContent = enabledEl.checked ? 'On' : 'Off';
  scheduleEl.hidden = !autoEl.checked;
  appEl.classList.toggle('per-monitor', !linkAllEl.checked);
  for (const el of monitorsEl.querySelectorAll<HTMLInputElement>('.mon-bri')) {
    el.disabled = linkAllEl.checked;
  }

  const partial = readForm();
  scheduleLive(partial);

  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    void persist(partial);
  }, 450);
}

function scheduleLive(partial: Partial<WidimmerSettings>): void {
  liveQueued = partial;
  if (liveTimer) {
    clearTimeout(liveTimer);
  }
  // ~1 frame — feels instant, coalesces rapid slider events
  liveTimer = setTimeout(() => {
    void flushLive();
  }, 16);
}

async function flushLive(): Promise<void> {
  if (liveInFlight) {
    return;
  }
  const partial = liveQueued;
  liveQueued = null;
  if (!partial) {
    return;
  }
  liveInFlight = true;
  try {
    const result = await dimmerApi.live(partial);
    if (!result.ok) {
      setStatus(result.error || 'Live apply failed', 'error');
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    liveInFlight = false;
    if (liveQueued) {
      void flushLive();
    }
  }
}

async function persist(partial: Partial<WidimmerSettings>): Promise<void> {
  const result = await dimmerApi.saveSettings(partial);
  if (!result.ok) {
    setStatus(result.error, 'error');
    return;
  }
  // Keep user's draft values in UI; only refresh monitor list metadata
  settings = result.settings;
  if (result.monitors) {
    monitors = result.monitors;
  }
  draftMonitors = { ...result.settings.monitors, ...draftMonitors };
  if (partial.brightness != null) {
    draftBrightness = Number(partial.brightness);
  }
  if (partial.kelvin != null) {
    draftKelvin = Number(partial.kelvin);
  }
  if (!result.applied.ok) {
    setStatus(result.applied.error || 'Apply failed', 'error');
    return;
  }
  setStatus(
    `OK · ${draftKelvin} K · brillo ${Math.round(draftBrightness * 100)}%`,
    'ok',
  );
}

for (const el of [
  enabledEl,
  kelvinEl,
  briEl,
  hwBriEl,
  linkAllEl,
  autoEl,
  dayStartEl,
  nightStartEl,
  dayKEl,
  nightKEl,
  dayBEl,
  nightBEl,
]) {
  el.addEventListener('input', scheduleSave);
  el.addEventListener('change', scheduleSave);
}

document.querySelectorAll<HTMLButtonElement>('.preset').forEach((btn) => {
  btn.addEventListener('click', () => {
    kelvinEl.value = String(btn.dataset.k);
    draftKelvin = Number(btn.dataset.k);
    scheduleSave();
  });
});

resetBtn.addEventListener('click', async () => {
  const result = await dimmerApi.reset();
  if (!result.ok) {
    setStatus(result.error || 'Reset failed', 'error');
    return;
  }
  setStatus('Gamma restaurado', 'ok');
});

refreshMonitorsBtn.addEventListener('click', async () => {
  monitors = await dimmerApi.listMonitors();
  renderMonitors();
  setStatus(`${monitors.length} pantalla(s)`, 'ok');
});

async function init(): Promise<void> {
  const { settings: s, monitors: m } = await dimmerApi.getSettings();
  applyToForm(s, m, false);
  dimmerApi.onSettingsChanged((payload) => {
    const force = Boolean(
      (payload as { force?: boolean }).force,
    );
    const remoteBri = Math.round(payload.settings.brightness * 100);
    const localBri = Math.round(draftBrightness * 100);
    const forcedSafe =
      remoteBri >= SAFE_MIN_PCT && localBri < SAFE_MIN_PCT && remoteBri !== localBri;
    const sync = force || forcedSafe;
    if (sync) {
      if (saveTimer) {
        clearTimeout(saveTimer);
        saveTimer = null;
      }
      if (liveTimer) {
        clearTimeout(liveTimer);
        liveTimer = null;
      }
      liveQueued = null;
      applyToForm(payload.settings, payload.monitors, false);
      forceBrightnessSliders(payload.settings.brightness, payload.settings.monitors);
      setStatus(`Restaurado · brillo ${remoteBri}%`, 'ok');
      return;
    }
    applyToForm(payload.settings, payload.monitors, true);
  });
}

void init();
