export {};

import {
  fetchPublicIp,
  runSpeedTest,
  type SpeedProgress,
} from './speedEngine.js';

type ConnectionMode = 'multi' | 'single';

type StoredSettings = {
  connectionMode: ConnectionMode;
  lastResult: {
    downloadMbps: number;
    uploadMbps: number;
    pingMs: number;
    jitterMs: number;
    downLatencyMs: number;
    upLatencyMs: number;
    finishedAt: string;
  } | null;
};

const STORAGE_KEY = 'wi-netest-settings-v2';

const app = document.getElementById('netest-app') as HTMLElement;
const viewMain = document.getElementById('view-main') as HTMLElement;
const viewSettings = document.getElementById('view-settings') as HTMLElement;
const viewHistory = document.getElementById('view-history') as HTMLElement;
const runBtn = document.getElementById('run-btn') as HTMLButtonElement;
const runIcon = document.getElementById('run-icon') as HTMLElement;
const speedNum = document.getElementById('speed-num') as HTMLElement;
const phaseLabel = document.getElementById('phase-label') as HTMLElement;
const leadText = document.getElementById('lead-text') as HTMLElement;
const latIdle = document.getElementById('lat-idle') as HTMLElement;
const latLoad = document.getElementById('lat-load') as HTMLElement;
const ulSpeed = document.getElementById('ul-speed') as HTMLElement;
const jitterVal = document.getElementById('jitter-val') as HTMLElement;
const clientIp = document.getElementById('client-ip') as HTMLElement;
const settingsMode = document.getElementById('settings-mode') as HTMLSelectElement;

function loadSettings(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { connectionMode: 'multi', lastResult: null };
    }
    const parsed = JSON.parse(raw) as StoredSettings;
    return {
      connectionMode: parsed.connectionMode === 'single' ? 'single' : 'multi',
      lastResult: parsed.lastResult ?? null,
    };
  } catch {
    return { connectionMode: 'multi', lastResult: null };
  }
}

let settings = loadSettings();
let abortController: AbortController | null = null;
let running = false;
let displayMbps = 0;
let targetMbps = 0;
let raf = 0;

function saveSettings(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function formatMbps(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '—';
  }
  if (value === 0) {
    return '0';
  }
  return value >= 100 ? value.toFixed(0) : value >= 10 ? value.toFixed(1) : value.toFixed(2);
}

function formatMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '—';
  }
  return String(Math.round(value));
}

function setPhase(phase: string): void {
  app.dataset.phase = phase;
}

function paintSpeed(mbps: number): void {
  const text = mbps > 0.05 ? formatMbps(mbps) : running ? formatMbps(mbps) : '—';
  if (speedNum.textContent !== text) {
    speedNum.textContent = text;
    speedNum.classList.remove('is-update');
    void speedNum.offsetWidth;
    speedNum.classList.add('is-update');
  }
}

function setSpeed(mbps: number, immediate = false): void {
  targetMbps = Math.max(0, mbps);
  if (immediate) {
    cancelAnimationFrame(raf);
    displayMbps = targetMbps;
    paintSpeed(displayMbps);
    return;
  }
  cancelAnimationFrame(raf);
  const step = (): void => {
    const delta = targetMbps - displayMbps;
    if (Math.abs(delta) < 0.08) {
      displayMbps = targetMbps;
      paintSpeed(displayMbps);
      return;
    }
    displayMbps += delta * 0.2;
    paintSpeed(displayMbps);
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function showSheet(name: 'main' | 'settings' | 'history'): void {
  viewMain.hidden = name !== 'main';
  viewSettings.hidden = name !== 'settings';
  viewHistory.hidden = name !== 'history';
}

function applyProgress(progress: SpeedProgress): void {
  const { sample, liveMbps, phase } = progress;
  setPhase(phase);

  if (phase === 'ping') {
    leadText.textContent = 'Midiendo latencia…';
    phaseLabel.textContent = 'Latencia';
    runIcon.textContent = '❚❚';
    if (sample.pingMs != null) {
      latIdle.innerHTML = `${formatMs(sample.pingMs)} <small>ms</small>`;
    }
    return;
  }

  if (phase === 'download') {
    leadText.textContent = 'Tu velocidad de internet es';
    phaseLabel.textContent = 'Descarga';
    runIcon.textContent = '❚❚';
    setSpeed(liveMbps || sample.downloadMbps || 0);
    if (sample.downLatencyMs != null) {
      latLoad.innerHTML = `${formatMs(sample.downLatencyMs)} <small>ms</small>`;
    }
    if (sample.pingMs != null) {
      latIdle.innerHTML = `${formatMs(sample.pingMs)} <small>ms</small>`;
    }
    return;
  }

  if (phase === 'upload') {
    phaseLabel.textContent = 'Carga (upload)';
    runIcon.textContent = '❚❚';
    // Keep showing download as hero (FAST.com style)
    if (sample.downloadMbps != null && sample.downloadMbps > 0) {
      setSpeed(sample.downloadMbps);
    }
    const up = sample.uploadMbps && sample.uploadMbps > 0 ? sample.uploadMbps : liveMbps;
    ulSpeed.innerHTML = `${formatMbps(up)} <small>Mbps</small>`;
    if (sample.upLatencyMs != null) {
      // keep loaded latency from download if present
    }
    return;
  }

  if (phase === 'done') {
    phaseLabel.textContent = 'Listo · pulsa ▶ para repetir';
    runIcon.textContent = '▶';
    setSpeed(sample.downloadMbps || liveMbps || 0, true);
    if (sample.uploadMbps != null) {
      ulSpeed.innerHTML = `${formatMbps(sample.uploadMbps)} <small>Mbps</small>`;
    }
    if (sample.pingMs != null) {
      latIdle.innerHTML = `${formatMs(sample.pingMs)} <small>ms</small>`;
    }
    if (sample.downLatencyMs != null) {
      latLoad.innerHTML = `${formatMs(sample.downLatencyMs)} <small>ms</small>`;
    }
    if (sample.jitterMs != null) {
      jitterVal.innerHTML = `${formatMs(sample.jitterMs)} <small>ms</small>`;
    }
  }
}

async function startTest(): Promise<void> {
  if (running) {
    abortController?.abort();
    running = false;
    runIcon.textContent = '▶';
    phaseLabel.textContent = 'Cancelado';
    setPhase('idle');
    return;
  }

  abortController?.abort();
  abortController = new AbortController();
  running = true;
  runIcon.textContent = '❚❚';
  setPhase('ping');
  leadText.textContent = 'Midiendo…';
  phaseLabel.textContent = 'Preparando';
  setSpeed(0, true);
  latIdle.innerHTML = '— <small>ms</small>';
  latLoad.innerHTML = '— <small>ms</small>';
  ulSpeed.innerHTML = '— <small>Mbps</small>';
  jitterVal.innerHTML = '— <small>ms</small>';

  try {
    const result = await runSpeedTest(
      settings.connectionMode,
      applyProgress,
      abortController.signal,
    );
    running = false;
    setPhase('done');
    runIcon.textContent = '▶';
    leadText.textContent = 'Tu velocidad de internet es';
    phaseLabel.textContent = 'Listo · pulsa ▶ para repetir';
    setSpeed(result.downloadMbps, true);
    latIdle.innerHTML = `${formatMs(result.pingMs)} <small>ms</small>`;
    latLoad.innerHTML = `${formatMs(result.downLatencyMs)} <small>ms</small>`;
    ulSpeed.innerHTML = `${formatMbps(result.uploadMbps)} <small>Mbps</small>`;
    jitterVal.innerHTML = `${formatMs(result.jitterMs)} <small>ms</small>`;
    settings.lastResult = { ...result, finishedAt: new Date().toISOString() };
    saveSettings();
    refreshHistory();
  } catch (error) {
    running = false;
    runIcon.textContent = '▶';
    setPhase('idle');
    if ((error as Error).name === 'AbortError') {
      phaseLabel.textContent = 'Cancelado';
      return;
    }
    phaseLabel.textContent = error instanceof Error ? error.message.slice(0, 80) : 'Error';
    speedNum.textContent = '—';
  }
}

function refreshHistory(): void {
  const empty = document.getElementById('history-empty') as HTMLElement;
  const card = document.getElementById('history-card') as HTMLElement;
  const last = settings.lastResult;
  if (!last) {
    empty.hidden = false;
    card.hidden = true;
    return;
  }
  empty.hidden = true;
  card.hidden = false;
  (document.getElementById('hist-dl') as HTMLElement).textContent =
    `${formatMbps(last.downloadMbps)} Mbps`;
  (document.getElementById('hist-ul') as HTMLElement).textContent =
    `${formatMbps(last.uploadMbps)} Mbps`;
  (document.getElementById('hist-ping') as HTMLElement).textContent =
    `${formatMs(last.pingMs)} ms`;
  (document.getElementById('hist-jitter') as HTMLElement).textContent =
    `${formatMs(last.jitterMs)} ms`;
  (document.getElementById('hist-when') as HTMLElement).textContent = new Date(
    last.finishedAt,
  ).toLocaleString();
}

async function init(): Promise<void> {
  settingsMode.value = settings.connectionMode;
  refreshHistory();
  showSheet('main');

  try {
    clientIp.textContent = await fetchPublicIp();
  } catch {
    clientIp.textContent = '—';
  }

  runBtn.addEventListener('click', () => {
    void startTest();
  });

  // Click big speed number also starts/stops
  speedNum.style.cursor = 'pointer';
  speedNum.title = 'Iniciar prueba';
  speedNum.addEventListener('click', () => {
    void startTest();
  });

  settingsMode.addEventListener('change', () => {
    settings.connectionMode = settingsMode.value === 'single' ? 'single' : 'multi';
    saveSettings();
  });

  document.getElementById('btn-settings')?.addEventListener('click', () => showSheet('settings'));
  document.getElementById('btn-results')?.addEventListener('click', () => {
    refreshHistory();
    showSheet('history');
  });
  document.getElementById('settings-back')?.addEventListener('click', () => showSheet('main'));
  document.getElementById('history-back')?.addEventListener('click', () => showSheet('main'));
}

void init();
