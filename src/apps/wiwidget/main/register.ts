import { BrowserWindow, ipcMain } from 'electron';
import * as os from 'node:os';
import { notifySimple } from '../../shell/main/notifications';
import { loadWiwidgetSettings, saveWiwidgetSettings } from './settingsStore';
import {
  closeAllWidgetWindows,
  closeWidgetWindow,
  focusWidgetWindow,
  isWidgetOpen,
  listOpenWidgetIds,
  openWidgetWindow,
  sendWidgetInstance,
} from './widgetWindows';
import {
  createWidgetId,
  defaultSizeForType,
  defaultTitleForType,
  mergeWiwidgetSettings,
  type WidgetInstance,
  type WidgetType,
  type WiwidgetSettings,
} from '../../../shared/settings/wiwidget';

let appEnabled = true;
let cpuSample = { idle: 0, total: 0, usage: 0 };
const windowIds = new WeakMap<BrowserWindow, string>();

function broadcastSettings(settings: WiwidgetSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('wiwidget:settingsChanged', settings);
    }
  }
}

async function persist(settings: WiwidgetSettings): Promise<WiwidgetSettings> {
  const next = mergeWiwidgetSettings(settings);
  await saveWiwidgetSettings(next);
  broadcastSettings(next);
  return next;
}

async function updateWidget(
  id: string,
  patch: Partial<WidgetInstance>,
): Promise<{ settings: WiwidgetSettings; widget: WidgetInstance | null }> {
  const settings = await loadWiwidgetSettings();
  let updated: WidgetInstance | null = null;
  const widgets = settings.widgets.map((widget) => {
    if (widget.id !== id) {
      return widget;
    }
    updated = mergeWiwidgetSettings({ widgets: [{ ...widget, ...patch, id }] }).widgets[0]!;
    return updated;
  });
  const next = await persist({ ...settings, widgets });
  return { settings: next, widget: updated };
}

async function saveBounds(
  id: string,
  bounds: { x: number; y: number; width: number; height: number },
): Promise<void> {
  await updateWidget(id, {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  });
}

function readCpuUsage(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total +=
      cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  const idleDiff = idle - cpuSample.idle;
  const totalDiff = total - cpuSample.total;
  cpuSample = { idle, total, usage: cpuSample.usage };
  if (totalDiff <= 0) {
    return cpuSample.usage;
  }
  const usage = Math.max(0, Math.min(100, (1 - idleDiff / totalDiff) * 100));
  cpuSample.usage = usage;
  return usage;
}

export function setWiwidgetAppEnabled(enabled: boolean): void {
  appEnabled = enabled;
  if (!enabled) {
    closeAllWidgetWindows();
  }
}

export async function restoreWiwidgetWindows(): Promise<void> {
  if (!appEnabled) {
    return;
  }
  const settings = await loadWiwidgetSettings();
  if (!settings.restoreOnLaunch) {
    return;
  }
  for (const widget of settings.widgets) {
    if (!widget.visible) {
      continue;
    }
    const win = await openWidgetWindow(widget, (id, bounds) => {
      void saveBounds(id, bounds);
    });
    windowIds.set(win, widget.id);
  }
}

export function setupWiwidgetIpc(): void {
  readCpuUsage();

  ipcMain.handle('wiwidget:getSettings', async () => loadWiwidgetSettings());

  ipcMain.handle('wiwidget:saveSettings', async (_event, raw: Partial<WiwidgetSettings>) => {
    try {
      const settings = await persist(mergeWiwidgetSettings(raw));
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle(
    'wiwidget:add',
    async (_event, payload: { type?: WidgetType; title?: string } = {}) => {
      const type: WidgetType =
        payload.type === 'note' || payload.type === 'stats' || payload.type === 'clock'
          ? payload.type
          : 'clock';
      const size = defaultSizeForType(type);
      const settings = await loadWiwidgetSettings();
      const offset = settings.widgets.length * 28;
      const widget = mergeWiwidgetSettings({
        widgets: [
          {
            id: createWidgetId(),
            type,
            title: payload.title?.trim() || defaultTitleForType(type),
            x: 80 + offset,
            y: 80 + offset,
            width: size.width,
            height: size.height,
            visible: true,
            alwaysOnTop: true,
            opacity: 0.96,
            config: {
              noteText: type === 'note' ? 'Nueva nota…' : '',
              clockFormat: '24',
              theme: 'glass',
            },
          },
        ],
      }).widgets[0]!;

      const next = await persist({
        ...settings,
        widgets: [...settings.widgets, widget],
      });

      if (appEnabled) {
        const win = await openWidgetWindow(widget, (id, bounds) => {
          void saveBounds(id, bounds);
        });
        windowIds.set(win, widget.id);
      }

      return { ok: true as const, settings: next, widget };
    },
  );

  ipcMain.handle('wiwidget:remove', async (_event, id: string) => {
    closeWidgetWindow(id);
    const settings = await loadWiwidgetSettings();
    const next = await persist({
      ...settings,
      widgets: settings.widgets.filter((widget) => widget.id !== id),
    });
    return { ok: true as const, settings: next };
  });

  ipcMain.handle('wiwidget:show', async (_event, id: string) => {
    const { settings, widget } = await updateWidget(id, { visible: true });
    if (widget && appEnabled) {
      const win = await openWidgetWindow(widget, (widgetId, bounds) => {
        void saveBounds(widgetId, bounds);
      });
      windowIds.set(win, widget.id);
    }
    return { ok: true as const, settings };
  });

  ipcMain.handle('wiwidget:hide', async (_event, id: string) => {
    closeWidgetWindow(id);
    const { settings } = await updateWidget(id, { visible: false });
    return { ok: true as const, settings };
  });

  ipcMain.handle('wiwidget:focus', async (_event, id: string) => {
    if (!isWidgetOpen(id)) {
      const settings = await loadWiwidgetSettings();
      const widget = settings.widgets.find((item) => item.id === id);
      if (widget && appEnabled) {
        const win = await openWidgetWindow({ ...widget, visible: true }, (widgetId, bounds) => {
          void saveBounds(widgetId, bounds);
        });
        windowIds.set(win, widget.id);
        await updateWidget(id, { visible: true });
      }
    }
    focusWidgetWindow(id);
    return { ok: true as const };
  });

  ipcMain.handle(
    'wiwidget:update',
    async (_event, payload: Partial<WidgetInstance> & { id: string }) => {
      const { settings, widget } = await updateWidget(payload.id, payload);
      if (widget) {
        sendWidgetInstance(widget);
        if (widget.visible && appEnabled && !isWidgetOpen(widget.id)) {
          const win = await openWidgetWindow(widget, (widgetId, bounds) => {
            void saveBounds(widgetId, bounds);
          });
          windowIds.set(win, widget.id);
        }
        if (!widget.visible) {
          closeWidgetWindow(widget.id);
        }
      }
      return { ok: true as const, settings };
    },
  );

  ipcMain.handle('wiwidget:getInstance', async (_event, id: string) => {
    const settings = await loadWiwidgetSettings();
    return settings.widgets.find((widget) => widget.id === id) ?? null;
  });

  ipcMain.handle('wiwidget:openIds', async () => listOpenWidgetIds());

  ipcMain.handle('wiwidget:stats', async () => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return {
      cpu: Math.round(readCpuUsage()),
      ramUsed: usedMem,
      ramTotal: totalMem,
      ramPct: Math.round((usedMem / totalMem) * 100),
    };
  });

  ipcMain.on('wiwidget:notify', (_event, message: string) => {
    notifySimple('WI-Widget', String(message));
  });

  ipcMain.on('wiwidget:closeSelf', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) {
      return;
    }
    const id = windowIds.get(win);
    win.close();
    if (id) {
      void updateWidget(id, { visible: false });
    }
  });
}

export function teardownWiwidget(): void {
  closeAllWidgetWindows();
}
