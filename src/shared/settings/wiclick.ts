export type MouseButton = 'left' | 'right' | 'middle';
export type ClickType = 'single' | 'double';
export type RepeatMode = 'count' | 'untilStopped';
export type PositionMode = 'current' | 'fixed';

export type WiclickSettings = {
  intervalHours: number;
  intervalMins: number;
  intervalSecs: number;
  intervalMs: number;
  mouseButton: MouseButton;
  clickType: ClickType;
  repeatMode: RepeatMode;
  repeatCount: number;
  positionMode: PositionMode;
  posX: number;
  posY: number;
  hotkey: string;
};

export const DEFAULT_WICLICK_SETTINGS: WiclickSettings = {
  intervalHours: 0,
  intervalMins: 0,
  intervalSecs: 0,
  intervalMs: 100,
  mouseButton: 'left',
  clickType: 'single',
  repeatMode: 'untilStopped',
  repeatCount: 1,
  positionMode: 'current',
  posX: 0,
  posY: 0,
  hotkey: 'F6',
};

export const WICLICK_APP_ID = 'wiclick';

export function intervalToMs(settings: WiclickSettings): number {
  const ms =
    settings.intervalHours * 3_600_000 +
    settings.intervalMins * 60_000 +
    settings.intervalSecs * 1_000 +
    settings.intervalMs;
  return Math.max(1, ms);
}

export function mergeWiclickSettings(partial?: Partial<WiclickSettings> | null): WiclickSettings {
  const base = { ...DEFAULT_WICLICK_SETTINGS };
  if (!partial) {
    return base;
  }
  return {
    intervalHours: clampInt(partial.intervalHours ?? base.intervalHours, 0, 99),
    intervalMins: clampInt(partial.intervalMins ?? base.intervalMins, 0, 59),
    intervalSecs: clampInt(partial.intervalSecs ?? base.intervalSecs, 0, 59),
    intervalMs: clampInt(partial.intervalMs ?? base.intervalMs, 0, 999),
    mouseButton: normalizeButton(partial.mouseButton) ?? base.mouseButton,
    clickType: partial.clickType === 'double' ? 'double' : 'single',
    repeatMode: partial.repeatMode === 'count' ? 'count' : 'untilStopped',
    repeatCount: clampInt(partial.repeatCount ?? base.repeatCount, 1, 999_999),
    positionMode: partial.positionMode === 'fixed' ? 'fixed' : 'current',
    posX: clampInt(partial.posX ?? base.posX, -10_000, 20_000),
    posY: clampInt(partial.posY ?? base.posY, -10_000, 20_000),
    hotkey: String(partial.hotkey ?? base.hotkey).trim() || base.hotkey,
  };
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function normalizeButton(value: unknown): MouseButton | null {
  if (value === 'left' || value === 'right' || value === 'middle') {
    return value;
  }
  return null;
}
