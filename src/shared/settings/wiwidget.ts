export type WidgetType = 'clock' | 'note' | 'stats';

export type WidgetTheme = 'dark' | 'light' | 'glass';

export type WidgetConfig = {
  noteText: string;
  clockFormat: '24' | '12';
  theme: WidgetTheme;
};

export type WidgetInstance = {
  id: string;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  alwaysOnTop: boolean;
  opacity: number;
  config: WidgetConfig;
};

export type WiwidgetSettings = {
  widgets: WidgetInstance[];
  restoreOnLaunch: boolean;
};

export const WIWIDGET_APP_ID = 'wiwidget';

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  noteText: '',
  clockFormat: '24',
  theme: 'glass',
};

export const DEFAULT_WIWIDGET_SETTINGS: WiwidgetSettings = {
  widgets: [],
  restoreOnLaunch: true,
};

export function createWidgetId(): string {
  return `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultSizeForType(type: WidgetType): { width: number; height: number } {
  switch (type) {
    case 'clock':
      return { width: 260, height: 140 };
    case 'note':
      return { width: 240, height: 220 };
    case 'stats':
      return { width: 220, height: 160 };
    default:
      return { width: 240, height: 160 };
  }
}

export function defaultTitleForType(type: WidgetType): string {
  switch (type) {
    case 'clock':
      return 'Clock';
    case 'note':
      return 'Note';
    case 'stats':
      return 'Stats';
    default:
      return 'Widget';
  }
}

export function mergeWiwidgetSettings(partial?: Partial<WiwidgetSettings> | null): WiwidgetSettings {
  if (!partial) {
    return { ...DEFAULT_WIWIDGET_SETTINGS, widgets: [] };
  }
  return {
    restoreOnLaunch: partial.restoreOnLaunch !== false,
    widgets: Array.isArray(partial.widgets)
      ? partial.widgets.map(mergeWidget).filter((item): item is WidgetInstance => Boolean(item))
      : [],
  };
}

function mergeWidget(raw: unknown): WidgetInstance | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const item = raw as Partial<WidgetInstance>;
  const type: WidgetType =
    item.type === 'note' || item.type === 'stats' || item.type === 'clock' ? item.type : 'clock';
  const size = defaultSizeForType(type);
  const configRaw = (item.config ?? {}) as Partial<WidgetConfig>;
  return {
    id: String(item.id ?? '').trim() || createWidgetId(),
    type,
    title: String(item.title ?? defaultTitleForType(type)).trim() || defaultTitleForType(type),
    x: clampInt(Number(item.x), -4000, 8000, 80),
    y: clampInt(Number(item.y), -4000, 8000, 80),
    width: clampInt(Number(item.width), 160, 800, size.width),
    height: clampInt(Number(item.height), 100, 800, size.height),
    visible: item.visible !== false,
    alwaysOnTop: item.alwaysOnTop !== false,
    opacity: clampNum(Number(item.opacity), 0.4, 1, 0.96),
    config: {
      noteText: String(configRaw.noteText ?? ''),
      clockFormat: configRaw.clockFormat === '12' ? '12' : '24',
      theme:
        configRaw.theme === 'dark' || configRaw.theme === 'light' || configRaw.theme === 'glass'
          ? configRaw.theme
          : 'glass',
    },
  };
}

function clampInt(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function clampNum(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}
