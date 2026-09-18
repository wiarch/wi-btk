/** Absolute gamma floor (1%). Below SAFE is critical and needs confirm. */
export const BRIGHTNESS_MIN = 0.01;
/** Safe floor restored if critical confirm is rejected / ignored. */
export const BRIGHTNESS_SAFE_MIN = 0.5;
export const BRIGHTNESS_MAX = 1;
/** Delay before critical confirm dialog. */
export const CRITICAL_CONFIRM_MS = 3000;
/** Auto-restore if user does not accept critical brightness. */
export const CRITICAL_ACCEPT_MS = 5000;

/**
 * Map UI brightness → visual gain.
 * ≥SAFE stays linear; below SAFE drops steeply toward near-black.
 */
export function brightnessToGammaGain(uiBrightness: number): number {
  const b = Number.isFinite(uiBrightness) ? Math.min(BRIGHTNESS_MAX, Math.max(0, uiBrightness)) : 1;
  if (b >= BRIGHTNESS_SAFE_MIN) {
    return b;
  }
  const span = BRIGHTNESS_SAFE_MIN - BRIGHTNESS_MIN;
  const t = span <= 0 ? 0 : (b - BRIGHTNESS_MIN) / span;
  const floor = 0.002;
  return floor + Math.pow(Math.max(0, Math.min(1, t)), 3.6) * (BRIGHTNESS_SAFE_MIN - floor);
}

export type MonitorOverride = {
  /** Include this monitor when applying */
  included: boolean;
  /** Per-monitor brightness BRIGHTNESS_MIN–1 (used when linkAll is false) */
  brightness: number;
};

export type WidimmerSettings = {
  enabled: boolean;
  /** Software brightness BRIGHTNESS_MIN–1.0 applied via gamma (global when linkAll) */
  brightness: number;
  /** Color temperature Kelvin 1900–6500 (lower = warmer / less blue) */
  kelvin: number;
  /** Also try hardware backlight (WMI) when available */
  useHardwareBrightness: boolean;
  /** One brightness for all included monitors */
  linkAll: boolean;
  /** Per deviceName override */
  monitors: Record<string, MonitorOverride>;
  autoSchedule: boolean;
  dayKelvin: number;
  nightKelvin: number;
  dayBrightness: number;
  nightBrightness: number;
  /** "HH:MM" local — night mode starts */
  nightStart: string;
  /** "HH:MM" local — day mode starts */
  dayStart: string;
};

export const DEFAULT_WIDIMMER_SETTINGS: WidimmerSettings = {
  enabled: true,
  brightness: 1,
  kelvin: 6500,
  useHardwareBrightness: false,
  linkAll: true,
  monitors: {},
  autoSchedule: false,
  dayKelvin: 6500,
  nightKelvin: 3400,
  dayBrightness: 1,
  nightBrightness: 0.85,
  nightStart: '20:00',
  dayStart: '07:00',
};

export const WIDIMMER_APP_ID = 'widimmer';

export function mergeWidimmerSettings(partial?: Partial<WidimmerSettings> | null): WidimmerSettings {
  const base = { ...DEFAULT_WIDIMMER_SETTINGS };
  if (!partial) {
    return base;
  }
  const monitors: Record<string, MonitorOverride> = {
    ...(partial.monitors && typeof partial.monitors === 'object' ? {} : base.monitors),
  };
  const sourceMonitors =
    partial.monitors && typeof partial.monitors === 'object' ? partial.monitors : base.monitors;
  for (const [id, value] of Object.entries(sourceMonitors)) {
    monitors[id] = {
      included: Boolean(value?.included ?? true),
      brightness: clamp(
        Number(value?.brightness ?? partial.brightness ?? base.brightness),
        BRIGHTNESS_MIN,
        BRIGHTNESS_MAX,
      ),
    };
  }
  return {
    enabled: Boolean(partial.enabled ?? base.enabled),
    brightness: clamp(Number(partial.brightness ?? base.brightness), BRIGHTNESS_MIN, BRIGHTNESS_MAX),
    kelvin: Math.round(clamp(Number(partial.kelvin ?? base.kelvin), 1900, 6500)),
    useHardwareBrightness: Boolean(partial.useHardwareBrightness ?? base.useHardwareBrightness),
    linkAll: Boolean(partial.linkAll ?? base.linkAll),
    monitors,
    autoSchedule: Boolean(partial.autoSchedule ?? base.autoSchedule),
    dayKelvin: Math.round(clamp(Number(partial.dayKelvin ?? base.dayKelvin), 1900, 6500)),
    nightKelvin: Math.round(clamp(Number(partial.nightKelvin ?? base.nightKelvin), 1900, 6500)),
    dayBrightness: clamp(
      Number(partial.dayBrightness ?? base.dayBrightness),
      BRIGHTNESS_MIN,
      BRIGHTNESS_MAX,
    ),
    nightBrightness: clamp(
      Number(partial.nightBrightness ?? base.nightBrightness),
      BRIGHTNESS_MIN,
      BRIGHTNESS_MAX,
    ),
    nightStart: normalizeTime(partial.nightStart, base.nightStart),
    dayStart: normalizeTime(partial.dayStart, base.dayStart),
  };
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) {
    return min;
  }
  return Math.min(max, Math.max(min, n));
}

function normalizeTime(value: unknown, fallback: string): string {
  const s = String(value ?? '').trim();
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }
  return fallback;
}

/** True when local time is in the night window (crosses midnight OK). */
export function isNightNow(settings: Pick<WidimmerSettings, 'nightStart' | 'dayStart'>, now = new Date()): boolean {
  const mins = now.getHours() * 60 + now.getMinutes();
  const night = parseHm(settings.nightStart);
  const day = parseHm(settings.dayStart);
  if (night === day) {
    return false;
  }
  if (night < day) {
    return mins >= night && mins < day;
  }
  return mins >= night || mins < day;
}

function parseHm(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

export function effectiveDimmer(
  settings: WidimmerSettings,
  now = new Date(),
): { kelvin: number; brightness: number } {
  if (!settings.autoSchedule) {
    return { kelvin: settings.kelvin, brightness: settings.brightness };
  }
  if (isNightNow(settings, now)) {
    return { kelvin: settings.nightKelvin, brightness: settings.nightBrightness };
  }
  return { kelvin: settings.dayKelvin, brightness: settings.dayBrightness };
}

export function brightnessForMonitor(
  settings: WidimmerSettings,
  deviceName: string,
  globalBrightness: number,
): number {
  if (settings.linkAll) {
    return globalBrightness;
  }
  const override = settings.monitors[deviceName];
  if (!override) {
    return globalBrightness;
  }
  return clamp(override.brightness, BRIGHTNESS_MIN, BRIGHTNESS_MAX);
}

export function isMonitorIncluded(settings: WidimmerSettings, deviceName: string): boolean {
  const override = settings.monitors[deviceName];
  if (!override) {
    return true;
  }
  return Boolean(override.included);
}

/** True when any active brightness is below the safe floor. */
export function isCriticalBrightness(settings: WidimmerSettings): boolean {
  if (!settings.enabled) {
    return false;
  }
  const eff = effectiveDimmer(settings);
  if (settings.linkAll || settings.autoSchedule) {
    return eff.brightness < BRIGHTNESS_SAFE_MIN;
  }
  const overrides = Object.values(settings.monitors);
  if (!overrides.length) {
    return settings.brightness < BRIGHTNESS_SAFE_MIN;
  }
  return overrides.some((m) => m.included && m.brightness < BRIGHTNESS_SAFE_MIN);
}

/** Raise all brightness fields below SAFE up to SAFE. */
export function withSafeBrightnessFloor(settings: WidimmerSettings): WidimmerSettings {
  const monitors: Record<string, MonitorOverride> = {};
  for (const [id, m] of Object.entries(settings.monitors)) {
    monitors[id] = {
      ...m,
      brightness: Math.max(m.brightness, BRIGHTNESS_SAFE_MIN),
    };
  }
  return {
    ...settings,
    brightness: Math.max(settings.brightness, BRIGHTNESS_SAFE_MIN),
    dayBrightness: Math.max(settings.dayBrightness, BRIGHTNESS_SAFE_MIN),
    nightBrightness: Math.max(settings.nightBrightness, BRIGHTNESS_SAFE_MIN),
    monitors,
  };
}
