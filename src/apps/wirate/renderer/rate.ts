export {};

type RateCurrency = 'VES' | 'USD' | 'EUR';
type WirateSettings = {
  bsPerUsd: number;
  bsPerEur: number;
  usdPerEur: number;
  lockUsdPerEur: boolean;
  lastFetchedAt: string;
};

type WiRateApi = {
  getSettings(): Promise<WirateSettings>;
  saveSettings(
    settings: WirateSettings,
  ): Promise<{ ok: true; settings: WirateSettings } | { ok: false; error: string }>;
  convert(payload: {
    amount: number;
    from: RateCurrency;
    to: RateCurrency;
  }): Promise<{ ok: true; value: number; settings: WirateSettings }>;
  refreshMarket(): Promise<
    { ok: true; settings: WirateSettings } | { ok: false; error: string }
  >;
  onSettingsChanged(listener: (settings: WirateSettings) => void): () => void;
};

function getApi(): WiRateApi {
  const existing = (window as unknown as { wiRate?: WiRateApi }).wiRate;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e?: unknown) => void }>();
  const listeners = new Set<(s: WirateSettings) => void>();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
      settings?: WirateSettings;
    };
    if (data?.channel === 'wi-rate-settings' && data.settings) {
      for (const listener of listeners) {
        listener(data.settings);
      }
      return;
    }
    if (data?.channel !== 'wi-rate-response' || data.id == null) {
      return;
    }
    const entry = pending.get(data.id);
    if (!entry) {
      return;
    }
    pending.delete(data.id);
    if (data.error) {
      entry.reject(new Error(data.error));
      return;
    }
    entry.resolve(data.result);
  });

  const call = async <T>(method: string, ...args: unknown[]): Promise<T> => {
    const id = (seq += 1);
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: (v) => resolve(v as T), reject });
      window.parent.postMessage({ channel: 'wi-rate', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    saveSettings: (settings) => call('saveSettings', settings),
    convert: (payload) => call('convert', payload),
    refreshMarket: () => call('refreshMarket'),
    onSettingsChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const api = getApi();
const amountEl = document.getElementById('amount') as HTMLInputElement;
const fromEl = document.getElementById('from') as HTMLSelectElement;
const toEl = document.getElementById('to') as HTMLSelectElement;
const resultEl = document.getElementById('result') as HTMLElement;
const bsUsdEl = document.getElementById('bs-usd') as HTMLInputElement;
const bsEurEl = document.getElementById('bs-eur') as HTMLInputElement;
const usdEurEl = document.getElementById('usd-eur') as HTMLInputElement;
const lockEurEl = document.getElementById('lock-eur') as HTMLInputElement;
const saveRatesBtn = document.getElementById('save-rates') as HTMLButtonElement;
const refreshBtn = document.getElementById('refresh-market') as HTMLButtonElement;
const fetchedEl = document.getElementById('fetched') as HTMLParagraphElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const swapBtn = document.getElementById('swap-btn') as HTMLButtonElement;
const popoutBtn = document.getElementById('popout-btn') as HTMLButtonElement;

let settings: WirateSettings | null = null;
let convertTimer: ReturnType<typeof setTimeout> | null = null;

function setStatus(message: string, kind: '' | 'ok' | 'error' = ''): void {
  statusEl.textContent = message;
  statusEl.className = `status${kind ? ` is-${kind}` : ''}`;
}

function label(currency: RateCurrency): string {
  switch (currency) {
    case 'VES':
      return 'Bs';
    case 'USD':
      return 'USD';
    case 'EUR':
      return 'EUR';
    default:
      return currency;
  }
}

function formatValue(value: number, currency: RateCurrency): string {
  if (!Number.isFinite(value)) {
    return '—';
  }
  const digits = currency === 'VES' ? 2 : 4;
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })} ${label(currency)}`;
}

function applySettings(next: WirateSettings): void {
  settings = next;
  bsUsdEl.value = String(next.bsPerUsd);
  bsEurEl.value = String(next.bsPerEur);
  usdEurEl.value = String(next.usdPerEur);
  lockEurEl.checked = next.lockUsdPerEur;
  fetchedEl.textContent = next.lastFetchedAt
    ? `Market EUR/USD updated: ${new Date(next.lastFetchedAt).toLocaleString()}`
    : 'Market EUR/USD not fetched yet';
}

async function runConvert(): Promise<void> {
  const amount = Number.parseFloat(amountEl.value);
  const from = fromEl.value as RateCurrency;
  const to = toEl.value as RateCurrency;
  if (!Number.isFinite(amount)) {
    resultEl.textContent = '—';
    return;
  }
  const result = await api.convert({ amount, from, to });
  resultEl.textContent = formatValue(result.value, to);
}

function scheduleConvert(): void {
  if (convertTimer) {
    clearTimeout(convertTimer);
  }
  convertTimer = setTimeout(() => {
    void runConvert();
  }, 120);
}

amountEl.addEventListener('input', scheduleConvert);
fromEl.addEventListener('change', scheduleConvert);
toEl.addEventListener('change', scheduleConvert);

swapBtn.addEventListener('click', () => {
  const from = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = from;
  scheduleConvert();
});

saveRatesBtn.addEventListener('click', async () => {
  const next: WirateSettings = {
    bsPerUsd: Number.parseFloat(bsUsdEl.value) || 1,
    bsPerEur: Number.parseFloat(bsEurEl.value) || 1,
    usdPerEur: Number.parseFloat(usdEurEl.value) || 1,
    lockUsdPerEur: lockEurEl.checked,
    lastFetchedAt: settings?.lastFetchedAt ?? '',
  };
  const result = await api.saveSettings(next);
  if (!result.ok) {
    setStatus(result.error, 'error');
    return;
  }
  applySettings(result.settings);
  setStatus('Rates saved', 'ok');
  await runConvert();
});

refreshBtn.addEventListener('click', async () => {
  setStatus('Refreshing EUR/USD…');
  const result = await api.refreshMarket();
  if (!result.ok) {
    setStatus(result.error, 'error');
    return;
  }
  applySettings(result.settings);
  setStatus('EUR/USD updated', 'ok');
  await runConvert();
});

popoutBtn.addEventListener('click', async () => {
  if (window.parent === window) {
    return;
  }
  const id = Date.now();
  await new Promise<void>((resolve) => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { channel?: string; id?: number };
      if (data?.channel === 'wi-shell-response' && data.id === id) {
        window.removeEventListener('message', handler);
        resolve();
      }
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ channel: 'wi-shell', id, method: 'openPopout', args: ['wirate'] }, '*');
  });
});

async function init(): Promise<void> {
  applySettings(await api.getSettings());
  await runConvert();
  api.onSettingsChanged((next) => {
    applySettings(next);
    void runConvert();
  });
}

void init();
