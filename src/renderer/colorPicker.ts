export {};

type Rgb = { r: number; g: number; b: number };
type Hsl = { h: number; s: number; l: number };
type Hsv = { h: number; s: number; v: number };
type Cmyk = { c: number; m: number; y: number; k: number };
type FormatField = 'hex' | 'rgb' | 'cmyk' | 'hsv' | 'hsl';

type ColorPickerLabels = {
  pickHint: string;
  copiedHint: string;
  close: string;
};

type ColorPickerPayload = {
  imageUrl: string;
  width: number;
  height: number;
  labels: ColorPickerLabels;
};

type WiRecColorPickerApi = {
  onStart(callback: (payload: ColorPickerPayload) => void): () => void;
  copyColor(hex: string): Promise<void>;
  cancel(): void;
  signalReady(): void;
};

declare global {
  interface Window {
    wiRecColorPicker: WiRecColorPickerApi;
  }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const cursorPreview = document.getElementById('cursor-preview') as HTMLDivElement;
const cursorSwatch = document.getElementById('cursor-swatch') as HTMLSpanElement;
const cursorHex = document.getElementById('cursor-hex') as HTMLSpanElement;
const panel = document.getElementById('panel') as HTMLDivElement;
const hexSwatch = document.getElementById('hex-swatch') as HTMLSpanElement;
const hexInput = document.getElementById('hex-input') as HTMLInputElement;
const rgbInput = document.getElementById('rgb-input') as HTMLInputElement;
const cmykInput = document.getElementById('cmyk-input') as HTMLInputElement;
const hsvInput = document.getElementById('hsv-input') as HTMLInputElement;
const hslInput = document.getElementById('hsl-input') as HTMLInputElement;
const copyHexBtn = document.getElementById('copy-hex-btn') as HTMLButtonElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const pickHint = document.getElementById('pick-hint') as HTMLParagraphElement;
const hintEl = document.getElementById('hint') as HTMLParagraphElement;

if (!ctx) {
  throw new Error('Canvas 2D context unavailable');
}

const drawCtx = ctx;
const pixelCanvas = document.createElement('canvas');
const pixelCtxRaw = pixelCanvas.getContext('2d', { willReadFrequently: true });

if (!pixelCtxRaw) {
  throw new Error('Pixel canvas unavailable');
}

const pixelCtx = pixelCtxRaw;

const state = {
  picked: false,
  color: { r: 0, g: 0, b: 0 } as Rgb,
  labels: null as ColorPickerLabels | null,
  syncing: false,
  activeField: null as FormatField | null,
};

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex: string): Rgb | null {
  let normalized = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    normalized = normalized
      .split('')
      .map((ch) => ch + ch)
      .join('');
  }

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb({ h, s, l }: Hsl): Rgb {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  if (sn === 0) {
    const gray = clampByte(ln * 255);
    return { r: gray, g: gray, b: gray };
  }

  const hueToRgb = (p: number, q: number, t: number): number => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;

  return {
    r: clampByte(hueToRgb(p, q, hn + 1 / 3) * 255),
    g: clampByte(hueToRgb(p, q, hn) * 255),
    b: clampByte(hueToRgb(p, q, hn - 1 / 3) * 255),
  };
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;

  if (d !== 0) {
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  const s = max === 0 ? 0 : d / max;
  return { h: h * 360, s: s * 100, v: max * 100 };
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hn = ((h % 360) + 360) % 360 / 360;
  const sn = clamp(s, 0, 100) / 100;
  const vn = clamp(v, 0, 100) / 100;
  const i = Math.floor(hn * 6);
  const f = hn * 6 - i;
  const p = vn * (1 - sn);
  const q = vn * (1 - f * sn);
  const t = vn * (1 - (1 - f) * sn);

  let rn = 0;
  let gn = 0;
  let bn = 0;

  switch (i % 6) {
    case 0:
      rn = vn; gn = t; bn = p;
      break;
    case 1:
      rn = q; gn = vn; bn = p;
      break;
    case 2:
      rn = p; gn = vn; bn = t;
      break;
    case 3:
      rn = p; gn = q; bn = vn;
      break;
    case 4:
      rn = t; gn = p; bn = vn;
      break;
    default:
      rn = vn; gn = p; bn = q;
      break;
  }

  return {
    r: clampByte(rn * 255),
    g: clampByte(gn * 255),
    b: clampByte(bn * 255),
  };
}

function rgbToCmyk({ r, g, b }: Rgb): Cmyk {
  if (r === 0 && g === 0 && b === 0) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = 1 - r / 255;
  const m = 1 - g / 255;
  const y = 1 - b / 255;
  const k = Math.min(c, m, y);

  return {
    c: ((c - k) / (1 - k)) * 100,
    m: ((m - k) / (1 - k)) * 100,
    y: ((y - k) / (1 - k)) * 100,
    k: k * 100,
  };
}

function cmykToRgb({ c, m, y, k }: Cmyk): Rgb {
  const cn = clamp(c, 0, 100) / 100;
  const mn = clamp(m, 0, 100) / 100;
  const yn = clamp(y, 0, 100) / 100;
  const kn = clamp(k, 0, 100) / 100;

  return {
    r: clampByte(255 * (1 - cn) * (1 - kn)),
    g: clampByte(255 * (1 - mn) * (1 - kn)),
    b: clampByte(255 * (1 - yn) * (1 - kn)),
  };
}

function formatRgb(color: Rgb): string {
  return `${color.r}, ${color.g}, ${color.b}`;
}

function formatCmyk(color: Rgb): string {
  const { c, m, y, k } = rgbToCmyk(color);
  return `${Math.round(c)}%, ${Math.round(m)}%, ${Math.round(y)}%, ${Math.round(k)}%`;
}

function formatHsv(color: Rgb): string {
  const { h, s, v } = rgbToHsv(color);
  return `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(v)}%`;
}

function formatHsl(color: Rgb): string {
  const { h, s, l } = rgbToHsl(color);
  return `${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%`;
}

function parseNumbers(value: string): number[] {
  return value
    .replace(/[%°]/g, '')
    .split(/[,;\s]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => Number.parseFloat(part))
    .filter((num) => Number.isFinite(num));
}

function parseRgb(value: string): Rgb | null {
  const nums = parseNumbers(value);
  if (nums.length !== 3) {
    return null;
  }

  return {
    r: clampByte(nums[0]),
    g: clampByte(nums[1]),
    b: clampByte(nums[2]),
  };
}

function parseCmyk(value: string): Rgb | null {
  const nums = parseNumbers(value);
  if (nums.length !== 4) {
    return null;
  }

  return cmykToRgb({
    c: clamp(nums[0], 0, 100),
    m: clamp(nums[1], 0, 100),
    y: clamp(nums[2], 0, 100),
    k: clamp(nums[3], 0, 100),
  });
}

function parseHsv(value: string): Rgb | null {
  const nums = parseNumbers(value);
  if (nums.length !== 3) {
    return null;
  }

  return hsvToRgb({
    h: nums[0],
    s: clamp(nums[1], 0, 100),
    v: clamp(nums[2], 0, 100),
  });
}

function parseHsl(value: string): Rgb | null {
  const nums = parseNumbers(value);
  if (nums.length !== 3) {
    return null;
  }

  return hslToRgb({
    h: nums[0],
    s: clamp(nums[1], 0, 100),
    l: clamp(nums[2], 0, 100),
  });
}

function updateSwatch(color: Rgb): void {
  const hex = rgbToHex(color);
  hexSwatch.style.backgroundColor = hex;
  cursorSwatch.style.backgroundColor = hex;
}

function syncFields(color: Rgb, skip: FormatField | null): void {
  state.syncing = true;

  if (skip !== 'hex') {
    hexInput.value = rgbToHex(color);
  }
  if (skip !== 'rgb') {
    rgbInput.value = formatRgb(color);
  }
  if (skip !== 'cmyk') {
    cmykInput.value = formatCmyk(color);
  }
  if (skip !== 'hsv') {
    hsvInput.value = formatHsv(color);
  }
  if (skip !== 'hsl') {
    hslInput.value = formatHsl(color);
  }

  updateSwatch(color);
  state.syncing = false;
}

function applyColor(color: Rgb, source: FormatField | null = null, copy = false): void {
  state.color = {
    r: clampByte(color.r),
    g: clampByte(color.g),
    b: clampByte(color.b),
  };

  syncFields(state.color, source);

  if (copy) {
    void window.wiRecColorPicker.copyColor(rgbToHex(state.color));
    if (state.labels) {
      hintEl.textContent = state.labels.copiedHint;
    }
  }
}

function tryParseField(field: FormatField, value: string): Rgb | null {
  switch (field) {
    case 'hex':
      return hexToRgb(value);
    case 'rgb':
      return parseRgb(value);
    case 'cmyk':
      return parseCmyk(value);
    case 'hsv':
      return parseHsv(value);
    case 'hsl':
      return parseHsl(value);
    default:
      return null;
  }
}

function positionPanelAt(clientX: number, clientY: number): void {
  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden', 'false');

  const margin = 12;
  const offset = 18;
  const panelRect = panel.getBoundingClientRect();
  let left = clientX + offset;
  let top = clientY + offset;

  if (left + panelRect.width > window.innerWidth - margin) {
    left = clientX - panelRect.width - offset;
  }
  if (top + panelRect.height > window.innerHeight - margin) {
    top = clientY - panelRect.height - offset;
  }

  left = Math.max(margin, Math.min(left, window.innerWidth - panelRect.width - margin));
  top = Math.max(margin, Math.min(top, window.innerHeight - panelRect.height - margin));

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
}

function showPanelAt(event: MouseEvent): void {
  pickHint.classList.add('hidden');
  cursorPreview.classList.add('hidden');
  document.body.classList.add('picked');
  state.picked = true;
  positionPanelAt(event.clientX, event.clientY);
}

function toImageCoords(event: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return {
    x: Math.max(0, Math.min(x, canvas.width - 1)),
    y: Math.max(0, Math.min(y, canvas.height - 1)),
  };
}

function sampleAt(x: number, y: number): Rgb {
  const px = Math.round(x);
  const py = Math.round(y);
  const data = pixelCtx.getImageData(px, py, 1, 1).data;
  return { r: data[0], g: data[1], b: data[2] };
}

function updateCursorPreview(event: MouseEvent, color: Rgb): void {
  cursorPreview.classList.remove('hidden');
  cursorPreview.style.left = `${event.clientX}px`;
  cursorPreview.style.top = `${event.clientY}px`;
  const hex = rgbToHex(color);
  cursorSwatch.style.backgroundColor = hex;
  cursorHex.textContent = hex;
}

async function loadFrozenFrame(imageUrl: string, width: number, height: number): Promise<void> {
  canvas.width = width;
  canvas.height = height;
  pixelCanvas.width = width;
  pixelCanvas.height = height;

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  drawCtx.drawImage(bitmap, 0, 0, width, height);
  pixelCtx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
}

function bindFormatInput(input: HTMLInputElement, field: FormatField): void {
  input.addEventListener('focus', () => {
    state.activeField = field;
  });

  input.addEventListener('input', () => {
    if (state.syncing) {
      return;
    }

    const parsed = tryParseField(field, input.value);
    if (!parsed) {
      return;
    }

    applyColor(parsed, field);
  });

  input.addEventListener('blur', () => {
    if (state.activeField === field) {
      state.activeField = null;
    }
    syncFields(state.color, null);
  });
}

canvas.addEventListener('mousemove', (event) => {
  if (state.picked) {
    return;
  }

  const point = toImageCoords(event);
  const color = sampleAt(point.x, point.y);
  updateCursorPreview(event, color);
});

canvas.addEventListener('mouseleave', () => {
  if (!state.picked) {
    cursorPreview.classList.add('hidden');
  }
});

canvas.addEventListener('click', (event) => {
  if (state.picked) {
    return;
  }

  const point = toImageCoords(event);
  const color = sampleAt(point.x, point.y);
  applyColor(color, null, true);
  showPanelAt(event);
});

panel.addEventListener('mousedown', (event) => {
  event.stopPropagation();
});

panel.addEventListener('click', (event) => {
  event.stopPropagation();
});

bindFormatInput(hexInput, 'hex');
bindFormatInput(rgbInput, 'rgb');
bindFormatInput(cmykInput, 'cmyk');
bindFormatInput(hsvInput, 'hsv');
bindFormatInput(hslInput, 'hsl');

copyHexBtn.addEventListener('click', () => {
  applyColor(state.color, null, true);
});

closeBtn.addEventListener('click', () => {
  window.wiRecColorPicker.cancel();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    window.wiRecColorPicker.cancel();
  }
});

window.wiRecColorPicker.onStart((payload: ColorPickerPayload) => {
  state.picked = false;
  state.labels = payload.labels;
  document.body.classList.remove('picked');
  panel.classList.add('hidden');
  panel.setAttribute('aria-hidden', 'true');
  pickHint.classList.remove('hidden');
  cursorPreview.classList.add('hidden');
  hintEl.textContent = '';

  pickHint.textContent = payload.labels.pickHint;
  closeBtn.title = payload.labels.close;

  void loadFrozenFrame(payload.imageUrl, payload.width, payload.height).catch(() => {
    console.error('[WI-Rec] failed to load color picker frame');
  });
});

window.wiRecColorPicker.signalReady();
