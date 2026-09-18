import { BrowserWindow, ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import { loadWiclockSettings, saveWiclockSettings } from './settingsStore';
import {
  mergeWiclockSettings,
  type ClockAlarm,
  type WiclockSettings,
} from '../../../shared/settings/wiclock';

let timer: ReturnType<typeof setInterval> | null = null;
let appEnabled = true;

function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function broadcastSettings(settings: WiclockSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('wiclock:settingsChanged', settings);
    }
  }
}

async function tickAlarms(): Promise<void> {
  if (!appEnabled) {
    return;
  }
  const settings = await loadWiclockSettings();
  const now = new Date();
  const key = todayKey(now);
  let changed = false;

  for (const alarm of settings.alarms) {
    if (!alarm.enabled) {
      continue;
    }
    if (alarm.hour !== now.getHours() || alarm.minute !== now.getMinutes()) {
      continue;
    }
    if (alarm.lastFiredDate === key) {
      continue;
    }
    alarm.lastFiredDate = key;
    changed = true;
    notifySimple('WI-Clock', alarm.label || 'Alarm');
  }

  if (changed) {
    await saveWiclockSettings(settings);
    broadcastSettings(settings);
  }
}

export function setWiclockAppEnabled(enabled: boolean): void {
  appEnabled = enabled;
}

export function startWiclockAlarmLoop(): void {
  if (timer) {
    return;
  }
  timer = setInterval(() => {
    void tickAlarms();
  }, 15_000);
  void tickAlarms();
}

export function stopWiclockAlarmLoop(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function setupWiclockIpc(): void {
  startWiclockAlarmLoop();

  ipcMain.handle('wiclock:getSettings', async () => loadWiclockSettings());

  ipcMain.handle('wiclock:saveSettings', async (_event, raw: Partial<WiclockSettings>) => {
    try {
      const settings = mergeWiclockSettings(raw);
      await saveWiclockSettings(settings);
      broadcastSettings(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('wiclock:addAlarm', async (_event, partial: Partial<ClockAlarm>) => {
    const settings = await loadWiclockSettings();
    const alarm: ClockAlarm = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: String(partial.label || 'Alarm'),
      hour: Math.min(23, Math.max(0, Math.trunc(Number(partial.hour) || 0))),
      minute: Math.min(59, Math.max(0, Math.trunc(Number(partial.minute) || 0))),
      enabled: partial.enabled !== false,
      lastFiredDate: '',
    };
    settings.alarms.push(alarm);
    await saveWiclockSettings(settings);
    broadcastSettings(settings);
    return { ok: true as const, settings };
  });

  ipcMain.on('wiclock:notify', (_event, message: string) => {
    notifySimple('WI-Clock', String(message));
  });
}

export function teardownWiclock(): void {
  stopWiclockAlarmLoop();
}
