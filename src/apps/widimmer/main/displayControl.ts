import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { app, BrowserWindow, screen } from 'electron';
import {
  brightnessForMonitor,
  brightnessToGammaGain,
  effectiveDimmer,
  isMonitorIncluded,
  type WidimmerSettings,
} from '../../../shared/settings/widimmer';
import koffi from 'koffi';

const execFileAsync = promisify(execFile);

export type MonitorInfo = {
  id: string;
  deviceName: string;
  name: string;
  primary: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleFactor: number;
};

type GammaApi = {
  GetDC: (hwnd: null) => unknown;
  ReleaseDC: (hwnd: null, hdc: unknown) => number;
  CreateDCW: (driver: string, device: string, output: string | null, init: null) => unknown;
  DeleteDC: (hdc: unknown) => boolean;
  SetDeviceGammaRamp: (hdc: unknown, ramp: Buffer) => boolean;
  EnumDisplayDevicesW: (
    device: string | null,
    index: number,
    out: Buffer,
    flags: number,
  ) => boolean;
};

let gammaApi: GammaApi | null = null;
let deviceNameCache: string[] | null = null;
/** Click-through overlays — reliable when SetDeviceGammaRamp is ignored (HDR/WDDM). */
const overlayByDisplayId = new Map<number, BrowserWindow>();

function tempDir(): string {
  return app.isReady() ? app.getPath('temp') : tmpdir();
}

function loadGammaApi(): GammaApi | null {
  if (process.platform !== 'win32') {
    return null;
  }
  if (gammaApi) {
    return gammaApi;
  }
  try {
    const user32 = koffi.load('user32.dll');
    const gdi32 = koffi.load('gdi32.dll');
    gammaApi = {
      GetDC: user32.func('void * __stdcall GetDC(void *hWnd)'),
      ReleaseDC: user32.func('int __stdcall ReleaseDC(void *hWnd, void *hDC)'),
      CreateDCW: gdi32.func(
        'void * __stdcall CreateDCW(str16 lpszDriver, str16 lpszDevice, str16 lpszOutput, void *lpInitData)',
      ),
      DeleteDC: gdi32.func('bool __stdcall DeleteDC(void *hdc)'),
      SetDeviceGammaRamp: gdi32.func('bool __stdcall SetDeviceGammaRamp(void *hdc, void *lpRamp)'),
      EnumDisplayDevicesW: user32.func(
        'bool __stdcall EnumDisplayDevicesW(str16 lpDevice, uint32_t iDevNum, void *lpDisplayDevice, uint32_t dwFlags)',
      ),
    };
    return gammaApi;
  } catch {
    gammaApi = null;
    return null;
  }
}

export function kelvinToRgb(kelvin: number): { r: number; g: number; b: number } {
  const temp = Math.max(1000, Math.min(40000, kelvin)) / 100;
  let r: number;
  let g: number;
  let b: number;

  if (temp <= 66) {
    r = 255;
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    r = 329.698727446 * (temp - 60) ** -0.1332047592;
    g = 288.1221695283 * (temp - 60) ** -0.0755148492;
  }

  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  }

  return {
    r: clamp01(r / 255),
    g: clamp01(g / 255),
    b: clamp01(b / 255),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) {
    return 0;
  }
  return Math.min(1, Math.max(0, n));
}

/**
 * f.lux-like night tint for overlay multiply.
 * Stronger amber/orange, crushed blue — avoids pale yellow-white wash.
 */
function fluxOverlayTint(kelvin: number): { r: number; g: number; b: number; alpha: number } {
  const k = Math.max(1900, Math.min(6500, kelvin));
  const warm = (6500 - k) / (6500 - 1900);
  if (warm <= 0.001) {
    return { r: 255, g: 255, b: 255, alpha: 0 };
  }
  const bb = kelvinToRgb(k);
  // Bias toward classic f.lux amber (not lemon yellow)
  const amberR = 1;
  const amberG = 0.52;
  const amberB = 0.12;
  const bias = 0.55 + warm * 0.35;
  let r = bb.r * (1 - bias) + amberR * bias;
  let g = bb.g * (1 - bias) * 0.9 + amberG * bias;
  let b = bb.b * (1 - bias) * 0.55 + amberB * bias;
  // Extra blue cut as it gets warmer
  g *= 1 - warm * 0.18;
  b *= 1 - warm * 0.55;
  r = clamp01(r);
  g = clamp01(g);
  b = clamp01(b);
  // Opacity eases in — soft at 4500K, heavy at candle
  const alpha = Math.min(0.94, Math.pow(warm, 1.05) * 0.9);
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    alpha,
  };
}

function buildRampBuffer(kelvin: number, brightness: number): Buffer {
  const tint = fluxOverlayTint(kelvin);
  // For gamma path use same warm bias when night-ish
  const warm = Math.min(1, Math.max(0, (6500 - kelvin) / (6500 - 1900)));
  const bb = kelvinToRgb(kelvin);
  const rgb =
    warm < 0.02
      ? bb
      : {
          r: clamp01(tint.r / 255),
          g: clamp01(tint.g / 255),
          b: clamp01(tint.b / 255),
        };
  const bri = brightnessToGammaGain(clamp01(brightness));
  const buf = Buffer.alloc(256 * 3 * 2);
  for (let i = 0; i < 256; i += 1) {
    const base = (i / 255) * 65535 * bri;
    buf.writeUInt16LE(Math.round(Math.min(65535, base * rgb.r)), i * 2);
    buf.writeUInt16LE(Math.round(Math.min(65535, base * rgb.g)), 512 + i * 2);
    buf.writeUInt16LE(Math.round(Math.min(65535, base * rgb.b)), 1024 + i * 2);
  }
  return buf;
}

function listWinDeviceNamesNative(): string[] {
  const api = loadGammaApi();
  if (!api) {
    return [];
  }
  const DISPLAY_DEVICE_SIZE = 840;
  const DISPLAY_DEVICE_ACTIVE = 0x1;
  const names: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const out = Buffer.alloc(DISPLAY_DEVICE_SIZE);
    out.writeUInt32LE(DISPLAY_DEVICE_SIZE, 0);
    const ok = api.EnumDisplayDevicesW(null, i, out, 0);
    if (!ok) {
      break;
    }
    const flags = out.readUInt32LE(4 + 64 + 256);
    if ((flags & DISPLAY_DEVICE_ACTIVE) === 0) {
      continue;
    }
    const name = out.toString('utf16le', 4, 4 + 64).replace(/\0.*$/, '');
    if (name) {
      names.push(name);
    }
  }
  return names;
}

export async function listMonitors(): Promise<MonitorInfo[]> {
  const displays = screen.getAllDisplays();
  if (!deviceNameCache || deviceNameCache.length !== displays.length) {
    deviceNameCache = listWinDeviceNamesNative();
  }
  const deviceNames = deviceNameCache;
  const primaryId = screen.getPrimaryDisplay().id;

  return displays.map((d, index) => {
    const deviceName = deviceNames[index] ?? `\\\\.\\DISPLAY${index + 1}`;
    const label =
      (d as { label?: string }).label ||
      ((d as { internal?: boolean }).internal ? 'Built-in' : `Monitor ${index + 1}`);
    const isPrimary = d.id === primaryId;
    return {
      id: String(d.id),
      deviceName,
      name: `${label}${isPrimary ? ' (Primary)' : ''}`,
      primary: isPrimary,
      width: d.bounds.width,
      height: d.bounds.height,
      x: d.bounds.x,
      y: d.bounds.y,
      scaleFactor: d.scaleFactor,
    };
  });
}

function syncMonitorList(): MonitorInfo[] {
  const displays = screen.getAllDisplays();
  if (!deviceNameCache || deviceNameCache.length === 0) {
    deviceNameCache = listWinDeviceNamesNative();
  }
  const primaryId = screen.getPrimaryDisplay().id;
  return displays.map((d, index) => ({
    id: String(d.id),
    deviceName: deviceNameCache![index] ?? `\\\\.\\DISPLAY${index + 1}`,
    name: '',
    primary: d.id === primaryId,
    width: d.bounds.width,
    height: d.bounds.height,
    x: d.bounds.x,
    y: d.bounds.y,
    scaleFactor: d.scaleFactor,
  }));
}

/** Best-effort gamma (often ignored on HDR / modern WDDM). */
function applyGammaToDevice(deviceName: string, kelvin: number, brightness: number): boolean {
  const api = loadGammaApi();
  if (!api) {
    return false;
  }
  const ramp = buildRampBuffer(kelvin, brightness);
  let hdc: unknown = null;
  let created = false;
  if (deviceName) {
    try {
      hdc = api.CreateDCW('DISPLAY', deviceName, null, null);
      created = Boolean(hdc);
    } catch {
      hdc = null;
      created = false;
    }
  }
  if (!created) {
    hdc = api.GetDC(null);
    created = false;
  }
  if (!hdc) {
    return false;
  }
  try {
    return Boolean(api.SetDeviceGammaRamp(hdc, ramp));
  } finally {
    if (created) {
      api.DeleteDC(hdc);
    } else {
      api.ReleaseDC(null, hdc);
    }
  }
}

function applyGammaBestEffort(
  targets: Array<{ deviceName: string; kelvin: number; brightness: number }>,
): number {
  if (process.platform !== 'win32' || !loadGammaApi() || targets.length === 0) {
    return 0;
  }
  let applied = 0;
  if (applyGammaToDevice('', targets[0].kelvin, targets[0].brightness)) {
    applied += 1;
  }
  for (const t of targets) {
    if (t.deviceName && applyGammaToDevice(t.deviceName, t.kelvin, t.brightness)) {
      applied += 1;
    }
  }
  return applied;
}

function destroyOverlay(id: number): void {
  const win = overlayByDisplayId.get(id);
  if (win && !win.isDestroyed()) {
    win.destroy();
  }
  overlayByDisplayId.delete(id);
}

export function clearDimmerOverlays(): void {
  for (const id of [...overlayByDisplayId.keys()]) {
    destroyOverlay(id);
  }
}

function overlayHtml(kelvin: number, brightness: number): string {
  const tint = fluxOverlayTint(kelvin);
  const gain = brightnessToGammaGain(clamp01(brightness));
  const dimAlpha = Math.min(0.97, Math.max(0, 1 - gain));
  return `<!doctype html><html><head><meta charset="UTF-8"/><style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}
.layer{position:fixed;inset:0;pointer-events:none}
.tint{background:rgb(${tint.r},${tint.g},${tint.b});mix-blend-mode:multiply;opacity:${tint.alpha.toFixed(4)}}
.dim{background:#000;opacity:${dimAlpha.toFixed(4)}}
</style></head><body>
<div class="layer tint"></div>
<div class="layer dim"></div>
</body></html>`;
}

function ensureOverlayWindow(displayId: number, bounds: Electron.Rectangle): BrowserWindow {
  let win = overlayByDisplayId.get(displayId);
  if (win && !win.isDestroyed()) {
    win.setBounds(bounds);
    return win;
  }
  win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    fullscreen: false,
    enableLargerThanScreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.setAlwaysOnTop(true, 'pop-up-menu');
  try {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } catch {
    // ignore
  }
  win.on('closed', () => {
    overlayByDisplayId.delete(displayId);
  });
  overlayByDisplayId.set(displayId, win);
  return win;
}

function applyOverlayToTargets(
  targets: Array<{
    displayId: number;
    bounds: Electron.Rectangle;
    kelvin: number;
    brightness: number;
  }>,
): number {
  if (!app.isReady()) {
    return 0;
  }
  const keep = new Set(targets.map((t) => t.displayId));
  for (const id of [...overlayByDisplayId.keys()]) {
    if (!keep.has(id)) {
      destroyOverlay(id);
    }
  }

  let applied = 0;
  for (const t of targets) {
    const gain = brightnessToGammaGain(clamp01(t.brightness));
    const tintCheck = fluxOverlayTint(t.kelvin);
    if (gain >= 0.995 && tintCheck.alpha < 0.02) {
      destroyOverlay(t.displayId);
      applied += 1;
      continue;
    }
    const win = ensureOverlayWindow(t.displayId, t.bounds);
    const tint = fluxOverlayTint(t.kelvin);
    // Always reload HTML — JS opacity patches were leaving the veil stuck dark
    const html = overlayHtml(t.kelvin, t.brightness);
    void win
      .loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      .then(() => {
        if (!win.isDestroyed()) {
          win.showInactive();
        }
      })
      .catch(() => {
        // ignore
      });
    applied += 1;
  }
  return applied;
}

function applyVisual(
  settings: WidimmerSettings,
  monitors: MonitorInfo[],
): { ok: boolean; error?: string; applied: number } {
  const displays = screen.getAllDisplays();
  const byId = new Map(displays.map((d) => [String(d.id), d]));

  if (!settings.enabled) {
    clearDimmerOverlays();
    applyGammaBestEffort(monitors.map((m) => ({ deviceName: m.deviceName, kelvin: 6500, brightness: 1 })));
    return { ok: true, applied: monitors.length };
  }

  const included = monitors.filter((m) => isMonitorIncluded(settings, m.deviceName));
  const list = included.length ? included : monitors;
  const eff = effectiveDimmer(settings);

  const overlayTargets: Array<{
    displayId: number;
    bounds: Electron.Rectangle;
    kelvin: number;
    brightness: number;
  }> = [];
  const gammaTargets: Array<{ deviceName: string; kelvin: number; brightness: number }> = [];

  for (const m of list) {
    const display = byId.get(m.id);
    if (!display) {
      continue;
    }
    const bri = brightnessForMonitor(settings, m.deviceName, eff.brightness);
    overlayTargets.push({
      displayId: display.id,
      bounds: display.bounds,
      kelvin: eff.kelvin,
      brightness: bri,
    });
    gammaTargets.push({ deviceName: m.deviceName, kelvin: eff.kelvin, brightness: bri });
  }

  const overlayApplied = applyOverlayToTargets(overlayTargets);
  applyGammaBestEffort(gammaTargets);

  if (overlayApplied <= 0 && overlayTargets.length > 0) {
    return { ok: false, error: 'No se pudo aplicar el filtro a la pantalla', applied: 0 };
  }
  return { ok: true, applied: Math.max(overlayApplied, overlayTargets.length) };
}

async function applyHardwareBrightness(percent: number): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Hardware brightness is Windows-only' };
  }
  const level = Math.round(Math.min(100, Math.max(0, percent)));
  const scriptPath = join(tempDir(), `wi-dimmer-bri-${Date.now()}.ps1`);
  const script = `
$ErrorActionPreference = 'Stop'
$methods = Get-CimInstance -Namespace root/wmi -ClassName WmiMonitorBrightnessMethods -ErrorAction Stop
foreach ($m in @($methods)) {
  Invoke-CimMethod -InputObject $m -MethodName WmiSetBrightness -Arguments @{ Brightness = ${level}; Timeout = 1 } | Out-Null
}
'OK'
`;
  writeFileSync(scriptPath, script, 'utf8');
  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { windowsHide: true, timeout: 8000, maxBuffer: 1024 * 1024 },
    );
    if (!String(stdout).includes('OK')) {
      return { ok: false, error: 'Brightness failed' };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    try {
      unlinkSync(scriptPath);
    } catch {
      // ignore
    }
  }
}

export async function restoreIdentityGamma(monitors?: MonitorInfo[]): Promise<{ ok: boolean; error?: string }> {
  clearDimmerOverlays();
  const list = monitors ?? (await listMonitors());
  const targets = list.map((m) => ({
    deviceName: m.deviceName,
    kelvin: 6500,
    brightness: 1,
  }));
  if (targets.length === 0) {
    targets.push({ deviceName: '', kelvin: 6500, brightness: 1 });
  }
  applyGammaBestEffort(targets);
  return { ok: true };
}

export async function applyDimmerSettings(
  settings: WidimmerSettings,
  options?: { hardware?: boolean },
): Promise<{
  ok: boolean;
  kelvin: number;
  brightness: number;
  error?: string;
  hardwareOk?: boolean;
  appliedMonitors: number;
}> {
  const monitors = await listMonitors();
  if (!settings.enabled) {
    const restored = await restoreIdentityGamma(monitors);
    return {
      ok: restored.ok,
      kelvin: 6500,
      brightness: 1,
      error: restored.error,
      appliedMonitors: monitors.length,
    };
  }

  const eff = effectiveDimmer(settings);
  const visual = applyVisual(settings, monitors);

  let hardwareOk: boolean | undefined;
  if (options?.hardware !== false && settings.useHardwareBrightness) {
    const hw = await applyHardwareBrightness(brightnessToGammaGain(eff.brightness) * 100);
    hardwareOk = hw.ok;
  }

  return {
    ok: visual.ok,
    kelvin: eff.kelvin,
    brightness: eff.brightness,
    error: visual.error,
    hardwareOk,
    appliedMonitors: visual.applied,
  };
}

/** Fast path: overlay (+ best-effort gamma). */
export function applyDimmerLive(settings: WidimmerSettings): {
  ok: boolean;
  kelvin: number;
  brightness: number;
  error?: string;
  appliedMonitors: number;
} {
  const monitors = syncMonitorList();
  if (!settings.enabled) {
    clearDimmerOverlays();
    applyGammaBestEffort(monitors.map((m) => ({ deviceName: m.deviceName, kelvin: 6500, brightness: 1 })));
    return { ok: true, kelvin: 6500, brightness: 1, appliedMonitors: monitors.length };
  }
  const eff = effectiveDimmer(settings);
  const visual = applyVisual(settings, monitors);
  return {
    ok: visual.ok,
    kelvin: eff.kelvin,
    brightness: eff.brightness,
    error: visual.error,
    appliedMonitors: visual.applied,
  };
}
