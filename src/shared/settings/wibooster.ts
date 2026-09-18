export type WiboosterSettings = {
  /** Remember last chosen processor count (0 = all / no limit) */
  preferredProcessors: number;
  /** Remember last chosen max memory MB (0 = all / no limit) */
  preferredMemoryMb: number;
};

export const DEFAULT_WIBOOSTER_SETTINGS: WiboosterSettings = {
  preferredProcessors: 0,
  preferredMemoryMb: 0,
};

export const WIBOOSTER_APP_ID = 'wibooster';

export function mergeWiboosterSettings(
  partial?: Partial<WiboosterSettings> | null,
): WiboosterSettings {
  return {
    preferredProcessors: Math.max(0, Math.trunc(Number(partial?.preferredProcessors) || 0)),
    preferredMemoryMb: Math.max(0, Math.trunc(Number(partial?.preferredMemoryMb) || 0)),
  };
}
