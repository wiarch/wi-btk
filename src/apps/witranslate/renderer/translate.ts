export {};

type TranslateLang = 'es' | 'en' | 'pt';

type WitranslateSettings = {
  sourceLang: TranslateLang | 'auto';
  targetLang: TranslateLang;
  lastSourceText: string;
  lastTranslatedText: string;
};

type WiTranslateApi = {
  getSettings(): Promise<WitranslateSettings>;
  saveSettings(settings: Partial<WitranslateSettings>): Promise<
    { ok: true; settings: WitranslateSettings } | { ok: false; error: string }
  >;
  translate(payload: {
    text: string;
    from: TranslateLang | 'auto';
    to: TranslateLang;
  }): Promise<
    | { ok: true; text: string; detected: TranslateLang | null }
    | { ok: false; error: string }
  >;
  translateImage(payload: {
    dataUrl: string;
    from: TranslateLang | 'auto';
    to: TranslateLang;
  }): Promise<
    | {
        ok: true;
        ocrText: string;
        text: string;
        detected: TranslateLang | null;
        width: number;
        height: number;
        lines: Array<{
          text: string;
          translated: string;
          x0: number;
          y0: number;
          x1: number;
          y1: number;
        }>;
      }
    | { ok: false; error: string; ocrText?: string }
  >;
  clipboardWrite(text: string): Promise<{ ok: true }>;
  clipboardRead(): Promise<{ ok: true; text: string }>;
  clipboardReadImage(): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }>;
  onSettingsChanged(listener: (settings: WitranslateSettings) => void): () => void;
};

function getApi(): WiTranslateApi {
  const existing = (window as unknown as { wiTranslate?: WiTranslateApi }).wiTranslate;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e?: unknown) => void }>();
  const listeners = new Set<(s: WitranslateSettings) => void>();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
      settings?: WitranslateSettings;
    };
    if (data?.channel === 'wi-translate-settings' && data.settings) {
      for (const listener of listeners) {
        listener(data.settings);
      }
      return;
    }
    if (data?.channel !== 'wi-translate-response' || data.id == null) {
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
      window.parent.postMessage({ channel: 'wi-translate', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    saveSettings: (settings) => call('saveSettings', settings),
    translate: (payload) => call('translate', payload),
    translateImage: (payload) => call('translateImage', payload),
    clipboardWrite: (text) => call('clipboardWrite', text),
    clipboardRead: () => call('clipboardRead'),
    clipboardReadImage: () => call('clipboardReadImage'),
    onSettingsChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const api = getApi();

const fromEl = document.getElementById('from-lang') as HTMLSelectElement;
const toEl = document.getElementById('to-lang') as HTMLSelectElement;
const sourceEl = document.getElementById('source') as HTMLTextAreaElement;
const outputEl = document.getElementById('output') as HTMLTextAreaElement;
const statusEl = document.getElementById('status') as HTMLElement;
const translateBtn = document.getElementById('translate-btn') as HTMLButtonElement;
const swapBtn = document.getElementById('swap-btn') as HTMLButtonElement;
const pasteBtn = document.getElementById('paste-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const listenSrcBtn = document.getElementById('listen-src') as HTMLButtonElement;
const listenOutBtn = document.getElementById('listen-out') as HTMLButtonElement;
const popoutBtn = document.getElementById('popout-btn') as HTMLButtonElement;
const imageInput = document.getElementById('image-input') as HTMLInputElement;
const pasteImageBtn = document.getElementById('paste-image-btn') as HTMLButtonElement;
const translateImageBtn = document.getElementById('translate-image-btn') as HTMLButtonElement;
const imagePreview = document.getElementById('image-preview') as HTMLImageElement;
const imageTranslated = document.getElementById('image-translated') as HTMLImageElement;
const imagePreviewWrap = document.getElementById('image-preview-wrap') as HTMLElement;
const imgTabs = document.getElementById('img-tabs') as HTMLElement;
const imgDetected = document.getElementById('img-detected') as HTMLElement;

let imageDataUrl: string | null = null;
let translatedImageUrl: string | null = null;
let imageView: 'original' | 'translated' = 'original';
let translateTimer: ReturnType<typeof setTimeout> | null = null;
let speaking: SpeechSynthesisUtterance | null = null;

function setStatus(message: string, kind: '' | 'ok' | 'error' = ''): void {
  statusEl.textContent = message;
  statusEl.className = `status${kind ? ` is-${kind}` : ''}`;
}

function ttsLang(code: TranslateLang | 'auto', detected?: TranslateLang | null): string {
  const c = code === 'auto' ? detected ?? 'es' : code;
  if (c === 'en') return 'en-US';
  if (c === 'pt') return 'pt-BR';
  return 'es-ES';
}

function speak(text: string, lang: string): void {
  const value = text.trim();
  if (!value) {
    return;
  }
  window.speechSynthesis.cancel();
  speaking = new SpeechSynthesisUtterance(value);
  speaking.lang = lang;
  const voices = window.speechSynthesis.getVoices();
  const match = voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
  if (match) {
    speaking.voice = match;
  }
  window.speechSynthesis.speak(speaking);
}

function readForm(): {
  from: TranslateLang | 'auto';
  to: TranslateLang;
  text: string;
} {
  const from = fromEl.value as TranslateLang | 'auto';
  let to = toEl.value as TranslateLang;
  if (from !== 'auto' && from === to) {
    to = from === 'en' ? 'es' : 'en';
    toEl.value = to;
  }
  return { from, to, text: sourceEl.value };
}

async function runTranslate(): Promise<void> {
  const { from, to, text } = readForm();
  if (!text.trim()) {
    outputEl.value = '';
    setStatus('Escribe algo para traducir');
    return;
  }
  setStatus('Traduciendo…');
  translateBtn.disabled = true;
  try {
    const result = await api.translate({ text, from, to });
    if (!result.ok) {
      setStatus(result.error, 'error');
      return;
    }
    outputEl.value = result.text;
    if (from === 'auto' && result.detected) {
      setStatus(`OK · detectado ${result.detected.toUpperCase()} → ${to.toUpperCase()}`, 'ok');
    } else {
      setStatus(`OK · ${from.toUpperCase()} → ${to.toUpperCase()}`, 'ok');
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    translateBtn.disabled = false;
  }
}

function scheduleTranslate(): void {
  if (translateTimer) {
    clearTimeout(translateTimer);
  }
  // Longer debounce — Google free API rate-limits hard (429)
  translateTimer = setTimeout(() => {
    void runTranslate();
  }, 1400);
}

function applySettings(s: WitranslateSettings): void {
  fromEl.value = s.sourceLang;
  toEl.value = s.targetLang;
  if (!sourceEl.value && s.lastSourceText) {
    sourceEl.value = s.lastSourceText;
  }
  if (!outputEl.value && s.lastTranslatedText) {
    outputEl.value = s.lastTranslatedText;
  }
}

function setImagePreview(dataUrl: string | null): void {
  imageDataUrl = dataUrl;
  translatedImageUrl = null;
  imageView = 'original';
  imageTranslated.removeAttribute('src');
  imageTranslated.hidden = true;
  imgTabs.hidden = true;
  imgDetected.textContent = '';
  if (!dataUrl) {
    imagePreviewWrap.hidden = true;
    imagePreview.removeAttribute('src');
    translateImageBtn.disabled = true;
    return;
  }
  imagePreview.src = dataUrl;
  imagePreview.hidden = false;
  imagePreviewWrap.hidden = false;
  translateImageBtn.disabled = false;
  syncImageView();
}

function syncImageView(): void {
  for (const btn of imgTabs.querySelectorAll<HTMLButtonElement>('.img-tab')) {
    btn.classList.toggle('active', btn.dataset.view === imageView);
  }
  if (imageView === 'translated' && translatedImageUrl) {
    imagePreview.hidden = true;
    imageTranslated.hidden = false;
    imageTranslated.src = translatedImageUrl;
  } else {
    imagePreview.hidden = false;
    imageTranslated.hidden = true;
  }
}

function sampleBackground(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): string {
  const w = Math.max(1, x1 - x0);
  const h = Math.max(1, y1 - y0);
  try {
    const data = ctx.getImageData(
      Math.max(0, x0),
      Math.max(0, Math.min(y0 + Math.floor(h / 2), ctx.canvas.height - 1)),
      Math.min(w, 8),
      1,
    ).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
    if (!n) {
      return '#f2f2f2';
    }
    r = Math.round(r / n);
    g = Math.round(g / n);
    b = Math.round(b / n);
    // Lighten so text stays readable
    r = Math.min(255, r + 40);
    g = Math.min(255, g + 40);
    b = Math.min(255, b + 40);
    return `rgb(${r},${g},${b})`;
  } catch {
    return '#f2f2f2';
  }
}

function textColorForBg(bg: string): string {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(bg);
  if (!m) {
    return '#111';
  }
  const lum = (0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3])) / 255;
  return lum > 0.55 ? '#111111' : '#f5f5f5';
}

async function buildOverlayImage(
  dataUrl: string,
  lines: Array<{
    translated: string;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }>,
): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas no disponible');
  }
  ctx.drawImage(img, 0, 0);

  for (const line of lines) {
    const text = line.translated.trim();
    if (!text) {
      continue;
    }
    const x0 = Math.max(0, line.x0);
    const y0 = Math.max(0, line.y0);
    const x1 = Math.min(canvas.width, line.x1);
    const y1 = Math.min(canvas.height, line.y1);
    const w = Math.max(8, x1 - x0);
    const h = Math.max(10, y1 - y0);
    const bg = sampleBackground(ctx, x0, y0, x1, y1);
    const pad = 2;
    ctx.fillStyle = bg;
    ctx.fillRect(x0 - pad, y0 - pad, w + pad * 2, h + pad * 2);

    let fontSize = Math.max(10, Math.floor(h * 0.72));
    ctx.textBaseline = 'middle';
    ctx.fillStyle = textColorForBg(bg);
    while (fontSize > 8) {
      ctx.font = `600 ${fontSize}px "Segoe UI", Tahoma, sans-serif`;
      if (ctx.measureText(text).width <= w * 0.98) {
        break;
      }
      fontSize -= 1;
    }
    ctx.fillText(text, x0 + 2, y0 + h / 2, w - 4);
  }

  return canvas.toDataURL('image/png');
}

function langLabel(code: TranslateLang | null | undefined): string {
  if (code === 'es') return 'Español';
  if (code === 'en') return 'English';
  if (code === 'pt') return 'Português';
  return '—';
}

translateBtn.addEventListener('click', () => void runTranslate());
sourceEl.addEventListener('input', scheduleTranslate);
fromEl.addEventListener('change', () => void runTranslate());
toEl.addEventListener('change', () => void runTranslate());

swapBtn.addEventListener('click', () => {
  const from = fromEl.value;
  const to = toEl.value;
  if (from === 'auto') {
    fromEl.value = to;
    toEl.value = to === 'en' ? 'es' : 'en';
  } else {
    fromEl.value = to;
    toEl.value = from;
  }
  const tmp = sourceEl.value;
  sourceEl.value = outputEl.value;
  outputEl.value = tmp;
  void runTranslate();
});

pasteBtn.addEventListener('click', async () => {
  try {
    const clip = await api.clipboardRead();
    if (clip.text) {
      sourceEl.value = clip.text;
      void runTranslate();
      setStatus('Pegado', 'ok');
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
});

clearBtn.addEventListener('click', () => {
  sourceEl.value = '';
  outputEl.value = '';
  setStatus('');
});

copyBtn.addEventListener('click', async () => {
  const text = outputEl.value;
  if (!text) {
    return;
  }
  try {
    await api.clipboardWrite(text);
    setStatus('Copiado', 'ok');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
});

listenSrcBtn.addEventListener('click', () => {
  const { from } = readForm();
  speak(sourceEl.value, ttsLang(from));
});

listenOutBtn.addEventListener('click', () => {
  const { to } = readForm();
  speak(outputEl.value, ttsLang(to));
});

popoutBtn.addEventListener('click', () => {
  window.parent.postMessage({ channel: 'wi-shell', method: 'openPopout', args: ['witranslate'] }, '*');
});

imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : null;
    setImagePreview(result);
    setStatus('Imagen lista', 'ok');
  };
  reader.readAsDataURL(file);
});

pasteImageBtn.addEventListener('click', async () => {
  try {
    const clip = await api.clipboardReadImage();
    if (!clip.ok) {
      setStatus(clip.error, 'error');
      return;
    }
    setImagePreview(clip.dataUrl);
    setStatus('Imagen pegada', 'ok');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  }
});

translateImageBtn.addEventListener('click', async () => {
  if (!imageDataUrl) {
    return;
  }
  const { from, to } = readForm();
  setStatus('OCR + detectando idioma + traduciendo…');
  translateImageBtn.disabled = true;
  try {
    const result = await api.translateImage({
      dataUrl: imageDataUrl,
      from: from === 'auto' ? 'auto' : from,
      to,
    });
    if (!result.ok) {
      if (result.ocrText) {
        sourceEl.value = result.ocrText;
      }
      setStatus(result.error, 'error');
      return;
    }
    sourceEl.value = result.ocrText;
    outputEl.value = result.text;
    if (result.detected) {
      fromEl.value = result.detected;
    }
    imgTabs.hidden = false;
    imgDetected.textContent = `Detectado: ${langLabel(result.detected)} → ${langLabel(to)}`;
    translatedImageUrl = await buildOverlayImage(imageDataUrl, result.lines);
    imageView = 'translated';
    syncImageView();
    setStatus(`Imagen OK · ${langLabel(result.detected)} → ${to.toUpperCase()}`, 'ok');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    translateImageBtn.disabled = !imageDataUrl;
  }
});

imgTabs.addEventListener('click', (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>('.img-tab');
  if (!btn?.dataset.view) {
    return;
  }
  if (btn.dataset.view === 'translated' && !translatedImageUrl) {
    return;
  }
  imageView = btn.dataset.view as 'original' | 'translated';
  syncImageView();
});

// Drag-drop image
document.body.addEventListener('dragover', (e) => {
  e.preventDefault();
});
document.body.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer?.files?.[0];
  if (!file || !file.type.startsWith('image/')) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : null;
    setImagePreview(result);
    setStatus('Imagen lista', 'ok');
  };
  reader.readAsDataURL(file);
});

async function init(): Promise<void> {
  try {
    window.speechSynthesis.getVoices();
  } catch {
    // ignore
  }
  const settings = await api.getSettings();
  applySettings(settings);
  api.onSettingsChanged((s) => applySettings(s));
  if (sourceEl.value.trim()) {
    void runTranslate();
  }
}

void init();
