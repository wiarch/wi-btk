import type { WidgetInstance, WidgetType, WiwidgetSettings } from '../../../shared/settings/wiwidget.js';
import type { WiWidgetApi } from './wiWidgetApi.js';

export {};

const listEl = document.getElementById('list') as HTMLDivElement;
const emptyEl = document.getElementById('empty') as HTMLParagraphElement;
const countEl = document.getElementById('count') as HTMLSpanElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const restoreInput = document.getElementById('restore') as HTMLInputElement;

let settings: WiwidgetSettings | null = null;
let reqId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function bridgeCall(method: string, args: unknown[] = []): Promise<unknown> {
  if (window.wiWidget && typeof (window.wiWidget as Record<string, unknown>)[method] === 'function') {
    return Promise.resolve(
      (window.wiWidget as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args),
    );
  }
  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ channel: 'wi-widget', id, method, args }, '*');
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('WI-Widget bridge timeout'));
      }
    }, 12_000);
  });
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as {
    channel?: string;
    id?: number;
    result?: unknown;
    error?: string;
    settings?: WiwidgetSettings;
  };
  if (data?.channel === 'wi-widget-response' && typeof data.id === 'number') {
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.error) entry.reject(new Error(data.error));
    else entry.resolve(data.result);
    return;
  }
  if (data?.channel === 'wi-widget-settings' && data.settings) {
    applySettings(data.settings);
  }
});

async function api(): Promise<WiWidgetApi> {
  if (window.wiWidget) return window.wiWidget;
  return {
    getSettings: () => bridgeCall('getSettings') as Promise<WiwidgetSettings>,
    saveSettings: (s) =>
      bridgeCall('saveSettings', [s]) as Promise<{
        ok: boolean;
        settings?: WiwidgetSettings;
        error?: string;
      }>,
    add: (p) => bridgeCall('add', [p]) as Promise<{ ok: boolean; settings?: WiwidgetSettings }>,
    remove: (id) => bridgeCall('remove', [id]) as Promise<{ ok: boolean; settings?: WiwidgetSettings }>,
    show: (id) => bridgeCall('show', [id]) as Promise<{ ok: boolean; settings?: WiwidgetSettings }>,
    hide: (id) => bridgeCall('hide', [id]) as Promise<{ ok: boolean; settings?: WiwidgetSettings }>,
    focus: (id) => bridgeCall('focus', [id]) as Promise<{ ok: boolean }>,
    update: (payload) => bridgeCall('update', [payload]),
    getInstance: (id) => bridgeCall('getInstance', [id]) as Promise<WidgetInstance | null>,
    openIds: () => bridgeCall('openIds') as Promise<string[]>,
    stats: () =>
      bridgeCall('stats') as Promise<{ cpu: number; ramUsed: number; ramTotal: number; ramPct: number }>,
    closeSelf: () => {
      void bridgeCall('closeSelf');
    },
    notify: (message) => {
      void bridgeCall('notify', [message]);
    },
  };
}

function typeIcon(type: WidgetInstance['type']): string {
  if (type === 'note') return '📝';
  if (type === 'stats') return '⌁';
  return '⏱';
}

function typeLabel(type: WidgetInstance['type']): string {
  if (type === 'note') return 'Nota';
  if (type === 'stats') return 'Stats';
  return 'Reloj';
}

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function render(): void {
  if (!settings) return;
  listEl.innerHTML = '';
  countEl.textContent = String(settings.widgets.length);
  emptyEl.hidden = settings.widgets.length > 0;
  restoreInput.checked = settings.restoreOnLaunch;

  for (const widget of settings.widgets) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `
      <div class="badge">${typeIcon(widget.type)}</div>
      <div>
        <strong>${widget.title}</strong>
        <small>${typeLabel(widget.type)} · ${widget.visible ? 'visible' : 'oculto'}</small>
      </div>
      <div class="row-actions"></div>
    `;
    const actions = row.querySelector('.row-actions') as HTMLDivElement;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'btn';
    toggle.textContent = widget.visible ? 'Ocultar' : 'Mostrar';
    toggle.addEventListener('click', async () => {
      const client = await api();
      const result = widget.visible ? await client.hide(widget.id) : await client.show(widget.id);
      if (result.settings) applySettings(result.settings);
    });

    const focus = document.createElement('button');
    focus.type = 'button';
    focus.className = 'btn';
    focus.textContent = 'Enfocar';
    focus.addEventListener('click', async () => {
      const client = await api();
      await client.focus(widget.id);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn danger';
    remove.textContent = 'Quitar';
    remove.addEventListener('click', async () => {
      const client = await api();
      const result = await client.remove(widget.id);
      if (result.settings) applySettings(result.settings);
      setStatus('Widget eliminado');
    });

    actions.append(toggle, focus, remove);
    listEl.append(row);
  }
}

function applySettings(next: WiwidgetSettings): void {
  settings = next;
  render();
}

for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-type]')) {
  btn.addEventListener('click', async () => {
    const type = btn.dataset.type as WidgetType;
    const client = await api();
    const result = await client.add({ type });
    if (result.settings) {
      applySettings(result.settings);
      setStatus(`Agregado: ${typeLabel(type)}`);
    }
  });
}

restoreInput.addEventListener('change', async () => {
  if (!settings) return;
  const client = await api();
  const result = await client.saveSettings({
    ...settings,
    restoreOnLaunch: restoreInput.checked,
  });
  if (result.settings) applySettings(result.settings);
});

async function boot(): Promise<void> {
  const client = await api();
  applySettings(await client.getSettings());
  client.onSettingsChanged?.(applySettings);
}

void boot().catch((error) => {
  setStatus(error instanceof Error ? error.message : String(error));
});
