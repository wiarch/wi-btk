import type { WidgetInstance } from '../../../shared/settings/wiwidget.js';
import type { StatsPayload, WiWidgetApi } from './wiWidgetApi.js';

export {};

const root = document.getElementById('root') as HTMLDivElement;
const titleEl = document.getElementById('title') as HTMLElement;
const bodyEl = document.getElementById('body') as HTMLElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;

const params = new URLSearchParams(window.location.search);
const widgetId = params.get('id') ?? '';

let widget: WidgetInstance | null = null;
let clockTimer: ReturnType<typeof setInterval> | 0 = 0;
let statsTimer: ReturnType<typeof setInterval> | 0 = 0;
let noteSaveTimer: ReturnType<typeof setTimeout> | null = null;

function getApi(): WiWidgetApi {
  if (!window.wiWidget) {
    throw new Error('wiWidget API unavailable');
  }
  return window.wiWidget;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(1)} GB`;
}

function renderClock(): void {
  if (!widget) return;
  const now = new Date();
  const time = now.toLocaleTimeString(undefined, {
    hour12: widget.config.clockFormat === '12',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const date = now.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  bodyEl.innerHTML = `<div class="clock-time">${time}</div><div class="clock-date">${date}</div>`;
}

function renderNote(): void {
  if (!widget) return;
  bodyEl.innerHTML = '';
  const area = document.createElement('textarea');
  area.className = 'note-area';
  area.value = widget.config.noteText;
  area.placeholder = 'Escribe una nota…';
  area.addEventListener('input', () => {
    if (!widget) return;
    widget = {
      ...widget,
      config: { ...widget.config, noteText: area.value },
    };
    if (noteSaveTimer) clearTimeout(noteSaveTimer);
    noteSaveTimer = setTimeout(() => {
      void getApi().update({
        id: widget!.id,
        config: widget!.config,
      });
    }, 400);
  });
  bodyEl.append(area);
}

function renderStatsShell(): void {
  bodyEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat">
        <div class="stat-label"><span>CPU</span><strong id="cpu-val">—</strong></div>
        <div class="bar"><span id="cpu-bar"></span></div>
      </div>
      <div class="stat">
        <div class="stat-label"><span>RAM</span><strong id="ram-val">—</strong></div>
        <div class="bar"><span id="ram-bar"></span></div>
      </div>
    </div>
  `;
}

async function refreshStats(): Promise<void> {
  const stats = await getApi().stats();
  const cpuVal = document.getElementById('cpu-val');
  const ramVal = document.getElementById('ram-val');
  const cpuBar = document.getElementById('cpu-bar');
  const ramBar = document.getElementById('ram-bar');
  if (cpuVal) cpuVal.textContent = `${stats.cpu}%`;
  if (ramVal) ramVal.textContent = `${stats.ramPct}% · ${formatBytes(stats.ramUsed)}`;
  if (cpuBar) cpuBar.style.width = `${stats.cpu}%`;
  if (ramBar) ramBar.style.width = `${stats.ramPct}%`;
}

function clearTimers(): void {
  if (clockTimer) clearInterval(clockTimer);
  if (statsTimer) clearInterval(statsTimer);
  clockTimer = 0;
  statsTimer = 0;
}

function applyWidget(next: WidgetInstance): void {
  const typeChanged = !widget || widget.type !== next.type;
  widget = next;
  titleEl.textContent = next.title;
  root.dataset.type = next.type;
  root.classList.remove('theme-glass', 'theme-dark', 'theme-light');
  root.classList.add(`theme-${next.config.theme}`);

  if (typeChanged) {
    clearTimers();
    if (next.type === 'clock') {
      renderClock();
      clockTimer = setInterval(renderClock, 1000);
    } else if (next.type === 'note') {
      renderNote();
    } else {
      renderStatsShell();
      void refreshStats();
      statsTimer = setInterval(() => {
        void refreshStats();
      }, 1500);
    }
  } else if (next.type === 'clock') {
    renderClock();
  } else if (next.type === 'note') {
    const area = bodyEl.querySelector('textarea');
    if (area && document.activeElement !== area) {
      area.value = next.config.noteText;
    }
  }
}

closeBtn.addEventListener('click', () => {
  getApi().closeSelf();
});

async function boot(): Promise<void> {
  if (!widgetId) {
    bodyEl.textContent = 'Missing widget id';
    return;
  }
  const api = getApi();
  api.onInstance?.(applyWidget);
  const instance = await api.getInstance(widgetId);
  if (!instance) {
    bodyEl.textContent = 'Widget not found';
    return;
  }
  applyWidget(instance);
}

void boot();
