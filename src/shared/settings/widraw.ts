export type WidrawSettings = {
  hotkey: string;
  hotkeyEnabled: boolean;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
};

export const DEFAULT_WIDRAW_SETTINGS: WidrawSettings = {
  hotkey: 'Control+Alt+D',
  hotkeyEnabled: true,
  strokeColor: '#1e1e1e',
  backgroundColor: '#ffffff',
  strokeWidth: 2,
};

export const WIDRAW_APP_ID = 'widraw';

export function mergeWidrawSettings(partial?: Partial<WidrawSettings> | null): WidrawSettings {
  const base = { ...DEFAULT_WIDRAW_SETTINGS };
  if (!partial) {
    return base;
  }
  return {
    hotkey: String(partial.hotkey ?? base.hotkey).trim() || base.hotkey,
    hotkeyEnabled: partial.hotkeyEnabled ?? base.hotkeyEnabled,
    strokeColor: String(partial.strokeColor ?? base.strokeColor) || base.strokeColor,
    backgroundColor: String(partial.backgroundColor ?? base.backgroundColor) || base.backgroundColor,
    strokeWidth: Math.min(12, Math.max(1, Math.trunc(Number(partial.strokeWidth) || base.strokeWidth))),
  };
}
