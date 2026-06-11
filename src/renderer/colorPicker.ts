import {
  buildHarmonies,
  buildVariations,
  findSimilarColors,
  formatCmyk,
  formatHsl,
  formatHsv,
  formatRgb,
  hexToRgb,
  hsvToRgb,
  parseCmyk,
  parseHsl,
  parseHsv,
  parseRgb,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToLab,
  rgbToXyz,
  wcagContrast,
  type Rgb,
} from './colorPickerMath.js';

export {};

type FormatField = 'hex' | 'rgb' | 'cmyk' | 'hsv' | 'hsl';

type ColorPickerLabels = {
  pickHint: string;
  copiedHint: string;
  close: string;
  advancedOptions: string;
  advancedHide: string;
  harmonies: string;
  variations: string;
  conversions: string;
  contrast: string;
  similarColors: string;
  onWhite: string;
  onBlack: string;
  pass: string;
  fail: string;
  harmonyAnalogous: string;
  harmonyComplementary: string;
  harmonySplitComplementary: string;
  harmonyTriadic: string;
  harmonyTetradic: string;
  harmonyMonochromatic: string;
  variationSaturation: string;
  variationBrightness: string;
  variationTints: string;
  variationShades: string;
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

const HARMONY_LABELS: Record<string, keyof ColorPickerLabels> = {
  analogous: 'harmonyAnalogous',
  complementary: 'harmonyComplementary',
  splitComplementary: 'harmonySplitComplementary',
  triadic: 'harmonyTriadic',
  tetradic: 'harmonyTetradic',
  monochromatic: 'harmonyMonochromatic',
};

const VARIATION_LABELS: Record<string, keyof ColorPickerLabels> = {
  saturation: 'variationSaturation',
  brightness: 'variationBrightness',
  tints: 'variationTints',
  shades: 'variationShades',
};

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
const advancedToggle = document.getElementById('advanced-toggle') as HTMLButtonElement;
const advancedSection = document.getElementById('advanced-section') as HTMLDivElement;
const svCanvas = document.getElementById('sv-canvas') as HTMLCanvasElement;
const hueSlider = document.getElementById('hue-slider') as HTMLInputElement;
const harmoniesTitle = document.getElementById('harmonies-title') as HTMLHeadingElement;
const harmoniesEl = document.getElementById('harmonies') as HTMLDivElement;
const variationsTitle = document.getElementById('variations-title') as HTMLHeadingElement;
const variationsEl = document.getElementById('variations') as HTMLDivElement;
const conversionsTitle = document.getElementById('conversions-title') as HTMLHeadingElement;
const xyzValue = document.getElementById('xyz-value') as HTMLElement;
const labValue = document.getElementById('lab-value') as HTMLElement;
const contrastTitle = document.getElementById('contrast-title') as HTMLHeadingElement;
const contrastChecker = document.getElementById('contrast-checker') as HTMLDivElement;
const similarTitle = document.getElementById('similar-title') as HTMLHeadingElement;
const similarColorsEl = document.getElementById('similar-colors') as HTMLDivElement;
const svHandle = document.getElementById('sv-handle') as HTMLDivElement;
const hueHandle = document.getElementById('hue-handle') as HTMLDivElement;
const closeBtn = document.getElementById('close-btn') as HTMLButtonElement;
const pickHint = document.getElementById('pick-hint') as HTMLParagraphElement;
const hintEl = document.getElementById('hint') as HTMLParagraphElement;

if (!ctx) {
  throw new Error('Canvas 2D context unavailable');
}

const drawCtx = ctx;
const svCtxRaw = svCanvas.getContext('2d');
const pixelCanvas = document.createElement('canvas');
const pixelCtxRaw = pixelCanvas.getContext('2d', { willReadFrequently: true });

if (!svCtxRaw || !pixelCtxRaw) {
  throw new Error('Canvas context unavailable');
}

const svCtx = svCtxRaw;
const pixelCtx = pixelCtxRaw;

const state = {
  picked: false,
  advancedOpen: false,
  color: { r: 0, g: 0, b: 0 } as Rgb,
  labels: null as ColorPickerLabels | null,
  syncing: false,
  activeField: null as FormatField | null,
  panelAnchor: { x: 0, y: 0 },
  currentHue: 0,
  svDragging: false,
};

function updateSwatch(color: Rgb): void {
  const hex = rgbToHex(color);
  hexSwatch.style.backgroundColor = hex;
  cursorSwatch.style.backgroundColor = hex;
}

function syncFields(color: Rgb, skip: FormatField | null): void {
  state.syncing = true;

  if (skip !== 'hex') hexInput.value = rgbToHex(color);
  if (skip !== 'rgb') rgbInput.value = formatRgb(color);
  if (skip !== 'cmyk') cmykInput.value = formatCmyk(color);
  if (skip !== 'hsv') hsvInput.value = formatHsv(color);
  if (skip !== 'hsl') hslInput.value = formatHsl(color);

  updateSwatch(color);
  state.syncing = false;
}

function drawSvCanvas(hue: number): void {
  const w = svCanvas.width;
  const h = svCanvas.height;
  const base = hsvToRgb({ h: hue, s: 100, v: 100 });

  svCtx.fillStyle = rgbToHex(base);
  svCtx.fillRect(0, 0, w, h);

  const whiteGrad = svCtx.createLinearGradient(0, 0, w, 0);
  whiteGrad.addColorStop(0, '#ffffff');
  whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
  svCtx.fillStyle = whiteGrad;
  svCtx.fillRect(0, 0, w, h);

  const blackGrad = svCtx.createLinearGradient(0, 0, 0, h);
  blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
  blackGrad.addColorStop(1, '#000000');
  svCtx.fillStyle = blackGrad;
  svCtx.fillRect(0, 0, w, h);
}

function updatePickerHandles(color: Rgb): void {
  const hsv = rgbToHsv(color);

  svHandle.style.left = `${hsv.s}%`;
  svHandle.style.top = `${100 - hsv.v}%`;
  svHandle.style.backgroundColor = rgbToHex(color);

  hueHandle.style.left = `${(state.currentHue / 360) * 100}%`;
  hueHandle.style.backgroundColor = rgbToHex(hsvToRgb({ h: state.currentHue, s: 100, v: 100 }));
}

function syncPickerControls(color: Rgb): void {
  const hsv = rgbToHsv(color);
  state.currentHue = Math.round(hsv.h);
  hueSlider.value = String(state.currentHue);
  drawSvCanvas(state.currentHue);
  requestAnimationFrame(() => updatePickerHandles(color));
}

function createSwatchButton(color: Rgb, onPick: (c: Rgb) => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'swatch-btn';
  btn.style.backgroundColor = rgbToHex(color);
  btn.title = rgbToHex(color);
  btn.addEventListener('click', (event) => {
    event.stopPropagation();
    onPick(color);
  });
  return btn;
}

function renderSwatchGroups(
  container: HTMLElement,
  groups: { label: string; colors: Rgb[] }[],
  labelMap: Record<string, keyof ColorPickerLabels>,
): void {
  container.innerHTML = '';
  const labels = state.labels;
  if (!labels) return;

  for (const group of groups) {
    const wrap = document.createElement('div');
    const labelKey = labelMap[group.label];
    const title = document.createElement('div');
    title.className = 'adv-group-label';
    title.textContent = labels[labelKey] ?? group.label;

    const row = document.createElement('div');
    row.className = 'swatch-row';
    for (const color of group.colors) {
      row.append(createSwatchButton(color, (picked) => applyColor(picked)));
    }

    wrap.append(title, row);
    container.append(wrap);
  }
}

function renderContrast(color: Rgb): void {
  const labels = state.labels;
  if (!labels) return;

  contrastChecker.innerHTML = '';
  const backgrounds: { label: string; bg: Rgb }[] = [
    { label: labels.onWhite, bg: { r: 255, g: 255, b: 255 } },
    { label: labels.onBlack, bg: { r: 0, g: 0, b: 0 } },
  ];

  for (const { label, bg } of backgrounds) {
    const result = wcagContrast(color, bg);
    const card = document.createElement('div');
    card.className = 'contrast-card';

    const header = document.createElement('div');
    header.className = 'contrast-card-header';
    header.innerHTML = `<span>${label}</span><strong>${result.ratio.toFixed(2)}:1</strong>`;

    const sample = document.createElement('div');
    sample.className = 'contrast-sample';
    sample.style.backgroundColor = rgbToHex(bg);
    sample.style.color = rgbToHex(color);
    sample.textContent = rgbToHex(color);

    const meta = document.createElement('div');
    meta.className = 'contrast-meta';
    const mark = (ok: boolean) =>
      `<span class="${ok ? 'pass' : 'fail'}">${ok ? labels.pass : labels.fail}</span>`;

    meta.innerHTML = `
      <span>AA</span>${mark(result.aaNormal)}
      <span>AA large</span>${mark(result.aaLarge)}
      <span>AAA</span>${mark(result.aaaNormal)}
      <span>AAA large</span>${mark(result.aaaLarge)}
    `;

    card.append(header, sample, meta);
    contrastChecker.append(card);
  }
}

function renderSimilar(color: Rgb): void {
  similarColorsEl.innerHTML = '';
  for (const entry of findSimilarColors(color)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'similar-btn';

    const swatch = document.createElement('span');
    swatch.className = 'similar-swatch';
    swatch.style.backgroundColor = rgbToHex(entry.rgb);

    const name = document.createElement('span');
    name.className = 'similar-name';
    name.textContent = entry.name;

    btn.append(swatch, name);
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      applyColor(entry.rgb);
    });
    similarColorsEl.append(btn);
  }
}

function updateAdvanced(color: Rgb): void {
  if (!state.advancedOpen) return;

  const xyz = rgbToXyz(color);
  const lab = rgbToLab(color);
  xyzValue.textContent = `${xyz.x.toFixed(2)}, ${xyz.y.toFixed(2)}, ${xyz.z.toFixed(2)}`;
  labValue.textContent = `${lab.l.toFixed(2)}, ${lab.a.toFixed(2)}, ${lab.b.toFixed(2)}`;

  renderSwatchGroups(harmoniesEl, buildHarmonies(color), HARMONY_LABELS);
  renderSwatchGroups(variationsEl, buildVariations(color), VARIATION_LABELS);
  renderContrast(color);
  renderSimilar(color);
}

function applyColor(color: Rgb, source: FormatField | null = null, copy = false): void {
  state.color = {
    r: Math.max(0, Math.min(255, Math.round(color.r))),
    g: Math.max(0, Math.min(255, Math.round(color.g))),
    b: Math.max(0, Math.min(255, Math.round(color.b))),
  };

  syncFields(state.color, source);
  syncPickerControls(state.color);
  updateAdvanced(state.color);

  if (copy) {
    void window.wiRecColorPicker.copyColor(rgbToHex(state.color));
    if (state.labels) hintEl.textContent = state.labels.copiedHint;
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
  state.panelAnchor = { x: clientX, y: clientY };
  panel.classList.remove('hidden');
  panel.setAttribute('aria-hidden', 'false');

  if (state.advancedOpen) {
    return;
  }

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
  panel.style.right = '';
  panel.style.bottom = '';
}

function applyPanelLayout(): void {
  if (state.advancedOpen) {
    panel.classList.add('panel-fullscreen');
    panel.style.left = '0';
    panel.style.top = '0';
    panel.style.right = '0';
    panel.style.bottom = '0';
    return;
  }

  panel.classList.remove('panel-fullscreen');
  positionPanelAt(state.panelAnchor.x, state.panelAnchor.y);
}

function showPanelAt(event: MouseEvent): void {
  pickHint.classList.add('hidden');
  cursorPreview.classList.add('hidden');
  document.body.classList.add('picked');
  state.picked = true;
  state.advancedOpen = false;
  advancedSection.classList.add('hidden');
  advancedSection.setAttribute('aria-hidden', 'true');
  advancedToggle.setAttribute('aria-expanded', 'false');
  panel.classList.remove('panel-fullscreen');
  if (state.labels) advancedToggle.textContent = state.labels.advancedOptions;
  positionPanelAt(event.clientX, event.clientY);
}

function toggleAdvanced(): void {
  state.advancedOpen = !state.advancedOpen;
  advancedSection.classList.toggle('hidden', !state.advancedOpen);
  advancedSection.setAttribute('aria-hidden', state.advancedOpen ? 'false' : 'true');
  advancedToggle.setAttribute('aria-expanded', String(state.advancedOpen));

  if (state.labels) {
    advancedToggle.textContent = state.advancedOpen
      ? state.labels.advancedHide
      : state.labels.advancedOptions;
  }

  if (state.advancedOpen) {
    updateAdvanced(state.color);
  }

  requestAnimationFrame(() => {
    applyPanelLayout();
  });
}

function pickFromSvCanvas(clientX: number, clientY: number): void {
  const rect = svCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
  const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
  const s = (x / rect.width) * 100;
  const v = (1 - y / rect.height) * 100;
  applyColor(hsvToRgb({ h: state.currentHue, s, v }));
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
    if (state.syncing) return;
    const parsed = tryParseField(field, input.value);
    if (!parsed) return;
    applyColor(parsed, field);
  });

  input.addEventListener('blur', () => {
    if (state.activeField === field) state.activeField = null;
    syncFields(state.color, null);
    updateAdvanced(state.color);
  });
}

function applyLabels(labels: ColorPickerLabels): void {
  pickHint.textContent = labels.pickHint;
  closeBtn.title = labels.close;
  advancedToggle.textContent = labels.advancedOptions;
  harmoniesTitle.textContent = labels.harmonies;
  variationsTitle.textContent = labels.variations;
  conversionsTitle.textContent = labels.conversions;
  contrastTitle.textContent = labels.contrast;
  similarTitle.textContent = labels.similarColors;
}

canvas.addEventListener('mousemove', (event) => {
  if (state.picked) return;
  const point = toImageCoords(event);
  updateCursorPreview(event, sampleAt(point.x, point.y));
});

canvas.addEventListener('mouseleave', () => {
  if (!state.picked) cursorPreview.classList.add('hidden');
});

canvas.addEventListener('click', (event) => {
  if (state.picked) return;
  const point = toImageCoords(event);
  applyColor(sampleAt(point.x, point.y), null, true);
  showPanelAt(event);
});

panel.addEventListener('mousedown', (event) => event.stopPropagation());
panel.addEventListener('click', (event) => event.stopPropagation());

hueSlider.addEventListener('input', () => {
  state.currentHue = Number.parseInt(hueSlider.value, 10);
  drawSvCanvas(state.currentHue);
  const hsv = rgbToHsv(state.color);
  applyColor(hsvToRgb({ h: state.currentHue, s: hsv.s, v: hsv.v }));
});

svCanvas.addEventListener('mousedown', (event) => {
  state.svDragging = true;
  pickFromSvCanvas(event.clientX, event.clientY);
});

window.addEventListener('mousemove', (event) => {
  if (!state.svDragging) return;
  pickFromSvCanvas(event.clientX, event.clientY);
});

window.addEventListener('mouseup', () => {
  state.svDragging = false;
});

advancedToggle.addEventListener('click', () => toggleAdvanced());

bindFormatInput(hexInput, 'hex');
bindFormatInput(rgbInput, 'rgb');
bindFormatInput(cmykInput, 'cmyk');
bindFormatInput(hsvInput, 'hsv');
bindFormatInput(hslInput, 'hsl');

copyHexBtn.addEventListener('click', () => applyColor(state.color, null, true));
closeBtn.addEventListener('click', () => window.wiRecColorPicker.cancel());

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') window.wiRecColorPicker.cancel();
});

window.wiRecColorPicker.onStart((payload: ColorPickerPayload) => {
  state.picked = false;
  state.advancedOpen = false;
  state.labels = payload.labels;
  document.body.classList.remove('picked');
  panel.classList.add('hidden');
  panel.setAttribute('aria-hidden', 'true');
  advancedSection.classList.add('hidden');
  pickHint.classList.remove('hidden');
  cursorPreview.classList.add('hidden');
  hintEl.textContent = '';
  applyLabels(payload.labels);

  void loadFrozenFrame(payload.imageUrl, payload.width, payload.height).catch(() => {
    console.error('[WI-Rec] failed to load color picker frame');
  });
});

window.wiRecColorPicker.signalReady();
