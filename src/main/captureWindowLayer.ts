import { BrowserWindow, screen } from 'electron';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { log } from './logger';

const execFileAsync = promisify(execFile);

export type ScreenBounds = { x: number; y: number; width: number; height: number };

/** Full monitor area (includes taskbar/panel), not workArea. */
export function getCaptureBounds(): ScreenBounds {
  const displays = screen.getAllDisplays();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const display of displays) {
    minX = Math.min(minX, display.bounds.x);
    minY = Math.min(minY, display.bounds.y);
    maxX = Math.max(maxX, display.bounds.x + display.bounds.width);
    maxY = Math.max(maxY, display.bounds.y + display.bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function getX11WindowId(win: BrowserWindow): string | null {
  if (process.platform !== 'linux' || process.env.WAYLAND_DISPLAY) {
    return null;
  }

  try {
    const handle = win.getNativeWindowHandle();
    if (handle.length < 4) {
      return null;
    }

    return `0x${handle.readUInt32LE(0).toString(16)}`;
  } catch {
    return null;
  }
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync('which', [command]);
    return true;
  } catch {
    return false;
  }
}

async function raiseAbovePanelLinux(win: BrowserWindow): Promise<void> {
  if (process.platform !== 'linux' || process.env.WAYLAND_DISPLAY) {
    return;
  }

  const windowId = getX11WindowId(win);
  if (!windowId) {
    return;
  }

  if (!(await commandExists('wmctrl'))) {
    return;
  }

  try {
    await execFileAsync('wmctrl', ['-i', '-r', windowId, '-b', 'add,above,skip_taskbar,skip_pager']);
    await execFileAsync('wmctrl', ['-i', '-a', windowId]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void log(`wmctrl raise skipped: ${message}`);
  }
}

export function applyCaptureWindowLayer(win: BrowserWindow): void {
  const bounds = getCaptureBounds();
  win.setBounds(bounds);
  win.setMenuBarVisibility(false);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setSkipTaskbar(true);
  win.setAlwaysOnTop(true, 'screen-saver');

  if (process.platform === 'win32') {
    win.setAlwaysOnTop(true, 'screen-saver');
  }
}

function boostZOrder(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return;
  }

  applyCaptureWindowLayer(win);
  if (win.isVisible()) {
    win.show();
    win.focus();
  }
}

export function scheduleCaptureWindowBoost(win: BrowserWindow): void {
  for (const delayMs of [0, 40, 120, 280]) {
    setTimeout(() => {
      boostZOrder(win);
      void raiseAbovePanelLinux(win);
    }, delayMs);
  }
}

export async function presentCaptureWindow(win: BrowserWindow): Promise<void> {
  applyCaptureWindowLayer(win);
  win.show();
  win.focus();
  scheduleCaptureWindowBoost(win);
  await raiseAbovePanelLinux(win);
}
