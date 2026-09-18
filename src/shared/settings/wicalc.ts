export type WicalcSettings = {
  /** unused for now — reserved */
  lastExpression: string;
};

export const DEFAULT_WICALC_SETTINGS: WicalcSettings = {
  lastExpression: '',
};

export const WICALC_APP_ID = 'wicalc';

export function mergeWicalcSettings(partial?: Partial<WicalcSettings> | null): WicalcSettings {
  return {
    lastExpression: String(partial?.lastExpression ?? ''),
  };
}
