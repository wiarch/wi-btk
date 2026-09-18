import { net } from 'electron';
import type { TranslateLang } from '../../../shared/settings/witranslate';

const LANG_SET = new Set<TranslateLang>(['es', 'en', 'pt']);

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;
const MIN_GAP_MS = 500;

export function normalizeLang(code: string | undefined | null): TranslateLang | 'auto' | null {
  if (!code) {
    return null;
  }
  const base = code.toLowerCase().split('-')[0];
  if (base === 'auto') {
    return 'auto';
  }
  if (LANG_SET.has(base as TranslateLang)) {
    return base as TranslateLang;
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastRequestAt));
    if (wait > 0) {
      await sleep(wait);
    }
    lastRequestAt = Date.now();
    return fn();
  });
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

type TranslateOk = { ok: true; text: string; detected: TranslateLang | null };
type TranslateErr = { ok: false; error: string; retryable?: boolean };

async function translateGoogle(input: {
  text: string;
  from: TranslateLang | 'auto';
  to: TranslateLang;
}): Promise<TranslateOk | TranslateErr> {
  const sl = input.from === 'auto' ? 'auto' : input.from;
  const url =
    'https://translate.googleapis.com/translate_a/single'
    + `?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(input.to)}&dt=t&q=${encodeURIComponent(input.text)}`;

  const response = await net.fetch(url, {
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (response.status === 429 || response.status === 503) {
    return { ok: false, error: `Translate HTTP ${response.status}`, retryable: true };
  }
  if (!response.ok) {
    return { ok: false, error: `Translate HTTP ${response.status}`, retryable: response.status >= 500 };
  }
  const data = (await response.json()) as unknown;
  const translated = parseGooglePayload(data);
  if (translated == null) {
    return { ok: false, error: 'Respuesta de traducción inválida' };
  }
  return { ok: true, text: translated, detected: detectFromPayload(data) };
}

/** MyMemory free API — fallback when Google rate-limits. */
async function translateMyMemory(input: {
  text: string;
  from: TranslateLang | 'auto';
  to: TranslateLang;
}): Promise<TranslateOk | TranslateErr> {
  const sl = input.from === 'auto' ? 'Autodetect' : input.from;
  const url =
    'https://api.mymemory.translated.net/get'
    + `?q=${encodeURIComponent(input.text.slice(0, 450))}`
    + `&langpair=${encodeURIComponent(`${sl}|${input.to}`)}`;

  const response = await net.fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json', 'User-Agent': 'WI-BTK' },
    cache: 'no-store',
  });
  if (response.status === 429) {
    return { ok: false, error: 'Translate HTTP 429', retryable: true };
  }
  if (!response.ok) {
    return { ok: false, error: `MyMemory HTTP ${response.status}`, retryable: response.status >= 500 };
  }
  const data = (await response.json()) as {
    responseData?: { translatedText?: string };
    responseStatus?: number;
    responseDetails?: string;
  };
  const translated = data.responseData?.translatedText;
  if (!translated || data.responseStatus !== 200) {
    const detail = String(data.responseDetails ?? 'MyMemory falló');
    return {
      ok: false,
      error: detail.includes('LIMIT') || detail.includes('QUOTA') ? 'Límite de traducción (reintenta en unos segundos)' : detail.slice(0, 180),
      retryable: true,
    };
  }
  // MyMemory sometimes echoes "PLEASE SELECT TWO DISTINCT LANGUAGES"
  if (/PLEASE SELECT TWO DISTINCT/i.test(translated)) {
    return { ok: false, error: 'Idioma origen y destino iguales', retryable: false };
  }
  return { ok: true, text: translated, detected: input.from === 'auto' ? null : input.from };
}

/**
 * Translate text with provider fallback + light rate limiting.
 * Google (gtx) → retry → MyMemory.
 */
export async function translateText(input: {
  text: string;
  from: TranslateLang | 'auto';
  to: TranslateLang;
}): Promise<TranslateOk | TranslateErr> {
  const text = input.text.trim();
  if (!text) {
    return { ok: true, text: '', detected: null };
  }
  if (text.length > 5000) {
    return { ok: false, error: 'Texto demasiado largo (máx. 5000)' };
  }
  const from = input.from;
  const to = input.to;
  if (from !== 'auto' && from === to) {
    return { ok: true, text, detected: from };
  }

  return rateLimited(async () => {
    // Try Google up to 2 times with backoff on 429
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const google = await translateGoogle({ text, from, to });
        if (google.ok) {
          return google;
        }
        if (!google.retryable) {
          break;
        }
        await sleep(800 * (attempt + 1));
      } catch {
        await sleep(600);
      }
    }

    try {
      const memory = await translateMyMemory({ text, from, to });
      if (memory.ok) {
        return memory;
      }
      // If auto-detect failed on MyMemory, retry with a guessed source
      if (from === 'auto') {
        for (const guess of ['en', 'es', 'pt'] as TranslateLang[]) {
          if (guess === to) {
            continue;
          }
          const again = await translateMyMemory({ text, from: guess, to });
          if (again.ok) {
            return { ...again, detected: guess };
          }
        }
      }
      return {
        ok: false,
        error: memory.error.includes('429')
          ? 'Demasiadas peticiones. Espera unos segundos y pulsa Traducir.'
          : memory.error,
      };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

/**
 * Translate many lines in ONE request (avoids 429 from per-line calls).
 */
export async function translateLines(input: {
  lines: string[];
  from: TranslateLang | 'auto';
  to: TranslateLang;
}): Promise<
  | { ok: true; lines: string[]; full: string; detected: TranslateLang | null }
  | { ok: false; error: string }
> {
  const lines = input.lines.map((l) => l.trim());
  if (!lines.length) {
    return { ok: true, lines: [], full: '', detected: null };
  }
  if (lines.length === 1) {
    const one = await translateText({ text: lines[0], from: input.from, to: input.to });
    if (!one.ok) {
      return one;
    }
    return { ok: true, lines: [one.text], full: one.text, detected: one.detected };
  }

  const SEP = '\n\u2063\n'; // invisible separator
  const joined = lines.join(SEP);
  const result = await translateText({ text: joined, from: input.from, to: input.to });
  if (!result.ok) {
    return result;
  }

  let parts = result.text.split(/\n?\u2063\n?/);
  if (parts.length !== lines.length) {
    // Fallback: split by newlines
    parts = result.text.split('\n');
  }
  const mapped = lines.map((original, i) => {
    const part = parts[i]?.trim();
    return part || (i === 0 ? result.text.trim() : original);
  });
  return {
    ok: true,
    lines: mapped,
    full: mapped.join('\n'),
    detected: result.detected,
  };
}

function parseGooglePayload(data: unknown): string | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    return null;
  }
  const chunks: string[] = [];
  for (const part of data[0]) {
    if (Array.isArray(part) && typeof part[0] === 'string') {
      chunks.push(part[0]);
    }
  }
  return chunks.join('');
}

function detectFromPayload(data: unknown): TranslateLang | null {
  if (!Array.isArray(data)) {
    return null;
  }
  const raw = data[2];
  if (typeof raw === 'string') {
    return normalizeLang(raw) === 'auto' ? null : (normalizeLang(raw) as TranslateLang | null);
  }
  return null;
}
