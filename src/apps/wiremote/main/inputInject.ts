import { screen } from 'electron';

type InjectPayload =
  | { type: 'move'; x: number; y: number }
  | { type: 'down'; button: 'left' | 'right' | 'middle'; x: number; y: number }
  | { type: 'up'; button: 'left' | 'right' | 'middle'; x: number; y: number }
  | { type: 'wheel'; deltaY: number; x: number; y: number }
  | { type: 'key'; action: 'down' | 'up'; key: string; code?: string };

let api: {
  SetCursorPos: (x: number, y: number) => boolean;
  mouse_event: (flags: number, dx: number, dy: number, data: number, extra: number) => void;
  keybd_event: (vk: number, scan: number, flags: number, extra: number) => void;
} | null = null;

const MOUSEEVENTF_LEFTDOWN = 0x0002;
const MOUSEEVENTF_LEFTUP = 0x0004;
const MOUSEEVENTF_RIGHTDOWN = 0x0008;
const MOUSEEVENTF_RIGHTUP = 0x0010;
const MOUSEEVENTF_MIDDLEDOWN = 0x0020;
const MOUSEEVENTF_MIDDLEUP = 0x0040;
const MOUSEEVENTF_WHEEL = 0x0800;
const KEYEVENTF_KEYUP = 0x0002;

function ensureApi(): typeof api {
  if (api) return api;
  if (process.platform !== 'win32') {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const koffi = require('koffi') as typeof import('koffi');
    const user32 = koffi.load('user32.dll');
    api = {
      SetCursorPos: user32.func('bool SetCursorPos(int x, int y)'),
      mouse_event: user32.func('void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, uintptr dwExtraInfo)'),
      keybd_event: user32.func('void keybd_event(uint bVk, uint bScan, uint dwFlags, uintptr dwExtraInfo)'),
    };
    return api;
  } catch {
    return null;
  }
}

function toScreen(nx: number, ny: number): { x: number; y: number } {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  return {
    x: Math.max(0, Math.min(width - 1, Math.round(nx * width))),
    y: Math.max(0, Math.min(height - 1, Math.round(ny * height))),
  };
}

function buttonFlags(button: 'left' | 'right' | 'middle', down: boolean): number {
  if (button === 'right') return down ? MOUSEEVENTF_RIGHTDOWN : MOUSEEVENTF_RIGHTUP;
  if (button === 'middle') return down ? MOUSEEVENTF_MIDDLEDOWN : MOUSEEVENTF_MIDDLEUP;
  return down ? MOUSEEVENTF_LEFTDOWN : MOUSEEVENTF_LEFTUP;
}

const KEY_MAP: Record<string, number> = {
  Backspace: 0x08,
  Tab: 0x09,
  Enter: 0x0d,
  Escape: 0x1b,
  ' ': 0x20,
  Space: 0x20,
  PageUp: 0x21,
  PageDown: 0x22,
  End: 0x23,
  Home: 0x24,
  ArrowLeft: 0x25,
  ArrowUp: 0x26,
  ArrowRight: 0x27,
  ArrowDown: 0x28,
  Delete: 0x2e,
  Control: 0x11,
  Alt: 0x12,
  Shift: 0x10,
  Meta: 0x5b,
};

function resolveVk(key: string, code?: string): number | null {
  if (KEY_MAP[key] != null) return KEY_MAP[key];
  if (code?.startsWith('Key') && code.length === 4) {
    return code.charCodeAt(3);
  }
  if (code?.startsWith('Digit') && code.length === 6) {
    return code.charCodeAt(5);
  }
  if (key.length === 1) {
    const upper = key.toUpperCase();
    return upper.charCodeAt(0);
  }
  return null;
}

export function injectRemoteInput(payload: InjectPayload): boolean {
  const native = ensureApi();
  if (!native) {
    return false;
  }

  if (payload.type === 'move') {
    const pos = toScreen(payload.x, payload.y);
    return native.SetCursorPos(pos.x, pos.y);
  }

  if (payload.type === 'down' || payload.type === 'up') {
    const pos = toScreen(payload.x, payload.y);
    native.SetCursorPos(pos.x, pos.y);
    native.mouse_event(buttonFlags(payload.button, payload.type === 'down'), 0, 0, 0, 0);
    return true;
  }

  if (payload.type === 'wheel') {
    const pos = toScreen(payload.x, payload.y);
    native.SetCursorPos(pos.x, pos.y);
    native.mouse_event(MOUSEEVENTF_WHEEL, 0, 0, Math.trunc(-payload.deltaY), 0);
    return true;
  }

  if (payload.type === 'key') {
    const vk = resolveVk(payload.key, payload.code);
    if (vk == null) return false;
    native.keybd_event(vk, 0, payload.action === 'up' ? KEYEVENTF_KEYUP : 0, 0);
    return true;
  }

  return false;
}

export function isInputInjectionAvailable(): boolean {
  return Boolean(ensureApi());
}
