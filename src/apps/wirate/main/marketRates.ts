import { net } from 'electron';
import { loadWirateSettings, saveWirateSettings } from './settingsStore';
import { mergeWirateSettings, type WirateSettings } from '../../../shared/settings/wirate';

async function fetchJson(url: string): Promise<unknown> {
  if (!net.isOnline()) {
    throw new Error('Offline');
  }
  const response = await net.fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

/** Refresh EUR↔USD from Frankfurter (ECB). Bs stays custom. */
export async function refreshMarketRates(): Promise<
  { ok: true; settings: WirateSettings } | { ok: false; error: string }
> {
  try {
    const data = (await fetchJson('https://api.frankfurter.app/latest?from=EUR&to=USD')) as {
      rates?: { USD?: number };
    };
    const usdPerEur = Number(data?.rates?.USD);
    if (!Number.isFinite(usdPerEur) || usdPerEur <= 0) {
      return { ok: false, error: 'Invalid market response' };
    }

    const current = await loadWirateSettings();
    const next = mergeWirateSettings({
      ...current,
      usdPerEur: current.lockUsdPerEur ? current.usdPerEur : usdPerEur,
      lastFetchedAt: new Date().toISOString(),
      // keep bs custom; optionally sync bsPerEur from bsPerUsd * usdPerEur if user wants — leave independent
    });
    await saveWirateSettings(next);
    return { ok: true, settings: next };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
