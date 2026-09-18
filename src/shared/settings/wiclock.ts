export type ClockAlarm = {
  id: string;
  label: string;
  hour: number;
  minute: number;
  enabled: boolean;
  lastFiredDate: string;
};

export type WorldClock = {
  id: string;
  label: string;
  timeZone: string;
};

export type WiclockSettings = {
  alarms: ClockAlarm[];
  worldClocks: WorldClock[];
  use24h: boolean;
};

export const DEFAULT_WICLOCK_SETTINGS: WiclockSettings = {
  alarms: [],
  worldClocks: [
    { id: 'local', label: 'Local', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' },
    { id: 'nyc', label: 'New York', timeZone: 'America/New_York' },
    { id: 'lon', label: 'London', timeZone: 'Europe/London' },
    { id: 'tok', label: 'Tokyo', timeZone: 'Asia/Tokyo' },
  ],
  use24h: true,
};

export const WICLOCK_APP_ID = 'wiclock';

export function mergeWiclockSettings(partial?: Partial<WiclockSettings> | null): WiclockSettings {
  const base: WiclockSettings = {
    alarms: [],
    worldClocks: DEFAULT_WICLOCK_SETTINGS.worldClocks.map((item) => ({ ...item })),
    use24h: DEFAULT_WICLOCK_SETTINGS.use24h,
  };
  if (!partial) {
    return base;
  }
  base.use24h = partial.use24h ?? base.use24h;
  if (Array.isArray(partial.alarms)) {
    base.alarms = partial.alarms
      .map((alarm) => ({
        id: String(alarm.id || `${Date.now()}`),
        label: String(alarm.label || 'Alarm'),
        hour: Math.min(23, Math.max(0, Math.trunc(Number(alarm.hour) || 0))),
        minute: Math.min(59, Math.max(0, Math.trunc(Number(alarm.minute) || 0))),
        enabled: Boolean(alarm.enabled),
        lastFiredDate: String(alarm.lastFiredDate || ''),
      }))
      .slice(0, 20);
  }
  if (Array.isArray(partial.worldClocks) && partial.worldClocks.length > 0) {
    base.worldClocks = partial.worldClocks
      .map((clock) => ({
        id: String(clock.id || `${Date.now()}`),
        label: String(clock.label || 'Clock'),
        timeZone: String(clock.timeZone || 'UTC'),
      }))
      .slice(0, 12);
  }
  return base;
}
