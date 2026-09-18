import {
  buildTintLevels,
  clampByte,
  hexToRgb,
  hsvToRgb,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  type Rgb,
} from './colorMath.js';
import {
  createColorId,
  type WicolorPalette,
  type WicolorSettings,
} from '../../../shared/settings/wicolor.js';

export {};

type WiColorApi = {
  getSettings(): Promise<WicolorSettings>;
  saveSettings(settings: Partial<WicolorSettings>): Promise<{ ok: boolean; settings?: WicolorSettings; error?: string }>;
  pickScreen(): Promise<{ ok: boolean; error?: string }>;
  getPickHotkey(): Promise<string>;
  copyHex(hex: string): Promise<{ ok: boolean }>;
  notify(message: string): void;
  onSettingsChanged?(listener: (settings: WicolorSettings) => void): () => void;
  onPicked?(listener: (hex: string) => void): () => void;
};

declare global {
  interface Window {
    wiColor?: WiColorApi;
  }
}

const preview = document.getElementById('preview') as HTMLDivElement;
const hexInput = document.getElementById('hex-input') as HTMLInputElement;
const hexCopyBtn = document.getElementById('hex-copy') as HTMLButtonElement;
const svCanvas = document.getElementById('sv-canvas') as HTMLCanvasElement;
const svHandle = document.getElementById('sv-handle') as HTMLDivElement;
const hueSlider = document.getElementById('hue-slider') as HTMLInputElement;
const rSlider = document.getElementById('r-slider') as HTMLInputElement;
const gSlider = document.getElementById('g-slider') as HTMLInputElement;
const bSlider = document.getElementById('b-slider') as HTMLInputElement;
const rNum = document.getElementById('r-num') as HTMLInputElement;
const gNum = document.getElementById('g-num') as HTMLInputElement;
const bNum = document.getElementById('b-num') as HTMLInputElement;
const rgbOut = document.getElementById('rgb-out') as HTMLElement;
const hslOut = document.getElementById('hsl-out') as HTMLElement;
const hsvOut = document.getElementById('hsv-out') as HTMLElement;
const tintLevels = document.getElementById('tint-levels') as HTMLDivElement;
const paletteSelect = document.getElementById('palette-select') as HTMLSelectElement;
const bookGrid = document.getElementById('book-grid') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const pickBtn = document.getElementById('pick-btn') as HTMLButtonElement;
const pickHotkey = document.getElementById('pick-hotkey') as HTMLElement;
const addBtn = document.getElementById('add-btn') as HTMLButtonElement;
const copyBtn = document.getElementById('copy-btn') as HTMLButtonElement;
const randomBtn = document.getElementById('random-btn') as HTMLButtonElement;
const newPaletteBtn = document.getElementById('new-palette') as HTMLButtonElement;

const svCtxRaw = svCanvas.getContext('2d');
if (!svCtxRaw) {
  throw new Error('Canvas unavailable');
}
const svCtx = svCtxRaw;

const state = {
  color: { r: 229, g: 233, b: 240 } as Rgb,
  hue: 210,
  settings: null as WicolorSettings | null,
  draggingSv: false,
  syncing: false,
};

let reqId = 1;
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

function bridgeCall(method: string, args: unknown[] = []): Promise<unknown> {
  if (window.wiColor && typeof (window.wiColor as Record<string, unknown>)[method] === 'function') {
    return Promise.resolve(
      (window.wiColor as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args),
    );
  }

  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ channel: 'wi-color', id, method, args }, '*');
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('WI-Color bridge timeout'));
      }
    }, 15_000);
  });
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as {
    channel?: string;
    id?: number;
    result?: unknown;
    error?: string;
    settings?: WicolorSettings;
    hex?: string;
  };

  if (data?.channel === 'wi-color-response' && typeof data.id === 'number') {
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.error) {
      entry.reject(new Error(data.error));
      return;
    }
    entry.resolve(data.result);
    return;
  }

  if (data?.channel === 'wi-color-settings' && data.settings) {
    applySettings(data.settings);
    return;
  }

  if (data?.channel === 'wi-color-picked' && data.hex) {
    const rgb = hexToRgb(data.hex);
    if (rgb) {
      setColor(rgb, true);
      setStatus(`Picked ${rgbToHex(rgb)}`);
    }
  }
});

async function getApi(): Promise<WiColorApi> {
  if (window.wiColor) {
    return window.wiColor;
  }
  return {
    getSettings: () => bridgeCall('getSettings') as Promise<WicolorSettings>,
    saveSettings: (settings) =>
      bridgeCall('saveSettings', [settings]) as Promise<{
        ok: boolean;
        settings?: WicolorSettings;
        error?: string;
      }>,
    pickScreen: () => bridgeCall('pickScreen') as Promise<{ ok: boolean; error?: string }>,
    getPickHotkey: () => bridgeCall('getPickHotkey') as Promise<string>,
    copyHex: (hex) => bridgeCall('copyHex', [hex]) as Promise<{ ok: boolean }>,
    notify: (message) => {
      void bridgeCall('notify', [message]);
    },
  };
}

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function drawSv(hue: number): void {
  const { width, height } = svCanvas;
  const image = svCtx.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const s = (x / (width - 1)) * 100;
      const v = (1 - y / (height - 1)) * 100;
      const rgb = hsvToRgb({ h: hue, s, v });
      const i = (y * width + x) * 4;
      image.data[i] = rgb.r;
      image.data[i + 1] = rgb.g;
      image.data[i + 2] = rgb.b;
      image.data[i + 3] = 255;
    }
  }
  svCtx.putImageData(image, 0, 0);
}

function updateSvHandle(): void {
  const hsv = rgbToHsv(state.color);
  const x = (hsv.s / 100) * svCanvas.clientWidth;
  const y = (1 - hsv.v / 100) * svCanvas.clientHeight;
  svHandle.style.left = `${x}px`;
  svHandle.style.top = `${y}px`;
}

function renderTints(): void {
  tintLevels.innerHTML = '';
  for (const row of buildTintLevels(state.color)) {
    const rowEl = document.createElement('div');
    rowEl.className = 'tint-row';
    for (const rgb of row) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'swatch';
      btn.style.background = rgbToHex(rgb);
      btn.title = rgbToHex(rgb);
      btn.addEventListener('click', () => setColor(rgb, true));
      rowEl.append(btn);
    }
    tintLevels.append(rowEl);
  }
}

function renderPalettes(): void {
  const settings = state.settings;
  if (!settings) return;

  paletteSelect.innerHTML = '';
  for (const palette of settings.palettes) {
    const option = document.createElement('option');
    option.value = palette.id;
    option.textContent = palette.name;
    paletteSelect.append(option);
  }
  paletteSelect.value = settings.activePaletteId;
  renderBook();
}

function activePalette(): WicolorPalette | null {
  const settings = state.settings;
  if (!settings) return null;
  return settings.palettes.find((palette) => palette.id === settings.activePaletteId) ?? settings.palettes[0] ?? null;
}

function renderBook(): void {
  const palette = activePalette();
  bookGrid.innerHTML = '';
  if (!palette || palette.colors.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'book-empty';
    empty.textContent = 'Sin colores. Usa ＋ para guardar el actual.';
    bookGrid.append(empty);
    return;
  }

  for (const color of palette.colors) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'book-swatch';
    btn.style.background = color.hex;
    btn.title = color.hex;
    btn.addEventListener('click', () => {
      const rgb = hexToRgb(color.hex);
      if (rgb) setColor(rgb, true);
    });
    btn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      void removeColor(color.id);
    });
    bookGrid.append(btn);
  }
}

function setColor(rgb: Rgb, persist: boolean): void {
  state.syncing = true;
  state.color = {
    r: clampByte(rgb.r),
    g: clampByte(rgb.g),
    b: clampByte(rgb.b),
  };
  const hsv = rgbToHsv(state.color);
  const hsl = rgbToHsl(state.color);
  state.hue = hsv.h;

  const hex = rgbToHex(state.color);
  preview.style.background = hex;
  hexInput.value = hex;
  hueSlider.value = String(Math.round(state.hue));
  rSlider.value = String(state.color.r);
  gSlider.value = String(state.color.g);
  bSlider.value = String(state.color.b);
  rNum.value = String(state.color.r);
  gNum.value = String(state.color.g);
  bNum.value = String(state.color.b);
  rgbOut.textContent = `${state.color.r}, ${state.color.g}, ${state.color.b}`;
  hslOut.textContent = `${Math.round(hsl.h)}° ${Math.round(hsl.s)}% ${Math.round(hsl.l)}%`;
  hsvOut.textContent = `${Math.round(hsv.h)}° ${Math.round(hsv.s)}% ${Math.round(hsv.v)}%`;

  drawSv(state.hue);
  updateSvHandle();
  renderTints();
  state.syncing = false;

  if (persist) {
    void persistColor();
  }
}

async function persistColor(): Promise<void> {
  if (!state.settings) return;
  const next = {
    ...state.settings,
    lastHex: rgbToHex(state.color),
  };
  const api = await getApi();
  const result = await api.saveSettings(next);
  if (result.ok && result.settings) {
    state.settings = result.settings;
  }
}

function applySettings(settings: WicolorSettings): void {
  state.settings = settings;
  const rgb = hexToRgb(settings.lastHex) ?? state.color;
  setColor(rgb, false);
  renderPalettes();
}

async function saveSettingsPatch(patch: Partial<WicolorSettings>): Promise<void> {
  if (!state.settings) return;
  const api = await getApi();
  const result = await api.saveSettings({ ...state.settings, ...patch });
  if (result.ok && result.settings) {
    applySettings(result.settings);
  } else if (result.error) {
    setStatus(result.error);
  }
}

async function addCurrentToBook(): Promise<void> {
  const settings = state.settings;
  const palette = activePalette();
  if (!settings || !palette) return;
  const hex = rgbToHex(state.color);
  if (palette.colors.some((color) => color.hex === hex)) {
    setStatus('Ya está en Colorsbook');
    return;
  }
  const palettes = settings.palettes.map((item) =>
    item.id === palette.id
      ? {
          ...item,
          colors: [...item.colors, { id: createColorId(), hex, name: '' }],
        }
      : item,
  );
  await saveSettingsPatch({ palettes });
  setStatus(`Guardado ${hex}`);
}

async function removeColor(colorId: string): Promise<void> {
  const settings = state.settings;
  const palette = activePalette();
  if (!settings || !palette) return;
  const palettes = settings.palettes.map((item) =>
    item.id === palette.id
      ? { ...item, colors: item.colors.filter((color) => color.id !== colorId) }
      : item,
  );
  await saveSettingsPatch({ palettes });
}

function sampleSv(clientX: number, clientY: number): void {
  const rect = svCanvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
  const y = Math.max(0, Math.min(clientY - rect.top, rect.height));
  const s = (x / rect.width) * 100;
  const v = (1 - y / rect.height) * 100;
  setColor(hsvToRgb({ h: state.hue, s, v }), true);
}

hueSlider.addEventListener('input', () => {
  if (state.syncing) return;
  state.hue = Number(hueSlider.value);
  const hsv = rgbToHsv(state.color);
  setColor(hsvToRgb({ h: state.hue, s: hsv.s, v: hsv.v }), true);
});

function bindChannel(
  slider: HTMLInputElement,
  numberInput: HTMLInputElement,
  channel: 'r' | 'g' | 'b',
): void {
  const apply = (value: number) => {
    if (state.syncing) return;
    setColor({ ...state.color, [channel]: clampByte(value) }, true);
  };
  slider.addEventListener('input', () => apply(Number(slider.value)));
  numberInput.addEventListener('change', () => apply(Number(numberInput.value)));
}

bindChannel(rSlider, rNum, 'r');
bindChannel(gSlider, gNum, 'g');
bindChannel(bSlider, bNum, 'b');

hexInput.addEventListener('change', () => {
  const rgb = hexToRgb(hexInput.value);
  if (rgb) {
    setColor(rgb, true);
  } else {
    hexInput.value = rgbToHex(state.color);
  }
});

svCanvas.addEventListener('mousedown', (event) => {
  state.draggingSv = true;
  sampleSv(event.clientX, event.clientY);
});

window.addEventListener('mousemove', (event) => {
  if (!state.draggingSv) return;
  sampleSv(event.clientX, event.clientY);
});

window.addEventListener('mouseup', () => {
  state.draggingSv = false;
});

paletteSelect.addEventListener('change', () => {
  void saveSettingsPatch({ activePaletteId: paletteSelect.value });
});

newPaletteBtn.addEventListener('click', () => {
  if (!state.settings) return;
  const name = window.prompt('Nombre de paleta', `Palette ${state.settings.palettes.length + 1}`);
  if (!name?.trim()) return;
  const id = createColorId();
  void saveSettingsPatch({
    activePaletteId: id,
    palettes: [
      ...state.settings.palettes,
      { id, name: name.trim(), colors: [] },
    ],
  });
});

pickBtn.addEventListener('click', async () => {
  const api = await getApi();
  setStatus('Gotero activo — clic en cualquier color de pantalla');
  const result = await api.pickScreen();
  if (!result.ok) {
    setStatus(result.error ?? 'No se pudo abrir el gotero');
  }
});

function applyPickHotkeyLabel(hotkey: string): void {
  const value = hotkey.trim() || 'Alt+Shift+C';
  pickHotkey.textContent = value;
  pickBtn.title = `Gotero (${value}) — captura color de cualquier ventana`;
}

addBtn.addEventListener('click', () => {
  void addCurrentToBook();
});

async function copyCurrent(): Promise<void> {
  const hex = rgbToHex(state.color);
  const api = await getApi();
  await api.copyHex(hex);
  setStatus(`Copiado ${hex}`);
}

copyBtn.addEventListener('click', () => {
  void copyCurrent();
});
hexCopyBtn.addEventListener('click', () => {
  void copyCurrent();
});

randomBtn.addEventListener('click', () => {
  setColor(
    {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    },
    true,
  );
});

async function boot(): Promise<void> {
  const api = await getApi();
  const settings = await api.getSettings();
  applySettings(settings);

  try {
    applyPickHotkeyLabel(await api.getPickHotkey());
  } catch {
    applyPickHotkeyLabel('Alt+Shift+C');
  }

  api.onSettingsChanged?.((next) => applySettings(next));
  api.onPicked?.((hex) => {
    const rgb = hexToRgb(hex);
    if (rgb) {
      setColor(rgb, true);
      setStatus(`Picked ${rgbToHex(rgb)}`);
    }
  });
}

void boot().catch((error) => {
  setStatus(error instanceof Error ? error.message : String(error));
});
