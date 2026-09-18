export type WirateSettings = {
  /** Bolívares por 1 USD (tasa personalizada) */
  bsPerUsd: number;
  /** Bolívares por 1 EUR (tasa personalizada) */
  bsPerEur: number;
  /** USD por 1 EUR (mercado o personalizado) */
  usdPerEur: number;
  /** Si true, no sobrescribe usdPerEur al refrescar mercado */
  lockUsdPerEur: boolean;
  lastFetchedAt: string;
};

export const DEFAULT_WIRATE_SETTINGS: WirateSettings = {
  bsPerUsd: 36.5,
  bsPerEur: 40,
  usdPerEur: 1.08,
  lockUsdPerEur: false,
  lastFetchedAt: '',
};

export const WIRATE_APP_ID = 'wirate';

export function mergeWirateSettings(partial?: Partial<WirateSettings> | null): WirateSettings {
  const base = { ...DEFAULT_WIRATE_SETTINGS };
  if (!partial) {
    return base;
  }
  return {
    bsPerUsd: positive(partial.bsPerUsd, base.bsPerUsd),
    bsPerEur: positive(partial.bsPerEur, base.bsPerEur),
    usdPerEur: positive(partial.usdPerEur, base.usdPerEur),
    lockUsdPerEur: Boolean(partial.lockUsdPerEur ?? base.lockUsdPerEur),
    lastFetchedAt: String(partial.lastFetchedAt ?? base.lastFetchedAt),
  };
}

function positive(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return n;
}

export type RateCurrency = 'VES' | 'USD' | 'EUR';

/** Convert amount using settings rates. */
export function convertAmount(
  amount: number,
  from: RateCurrency,
  to: RateCurrency,
  rates: Pick<WirateSettings, 'bsPerUsd' | 'bsPerEur' | 'usdPerEur'>,
): number {
  if (!Number.isFinite(amount) || from === to) {
    return amount;
  }
  // Prefer direct Bs↔EUR when both involve VES and EUR for user's custom bsPerEur
  if (from === 'VES' && to === 'EUR') {
    return amount / rates.bsPerEur;
  }
  if (from === 'EUR' && to === 'VES') {
    return amount * rates.bsPerEur;
  }
  if (from === 'VES' && to === 'USD') {
    return amount / rates.bsPerUsd;
  }
  if (from === 'USD' && to === 'VES') {
    return amount * rates.bsPerUsd;
  }
  if (from === 'USD' && to === 'EUR') {
    return amount / rates.usdPerEur;
  }
  if (from === 'EUR' && to === 'USD') {
    return amount * rates.usdPerEur;
  }
  return amount;
}
