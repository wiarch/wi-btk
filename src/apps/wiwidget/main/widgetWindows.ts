import { BrowserWindow, screen } from 'electron';
import { distPath, shellPreload } from '../../../shared/paths';
import type { WidgetInstance } from '../../../shared/settings/wiwidget';

const windows = new Map<string, BrowserWindow>();

function widgetHtml(): string {
  return distPath('apps', 'wiwidget', 'renderer', 'widget.html');
}

export function listOpenWidgetIds(): string[] {
  return [...windows.keys()].filter((id) => {
    const win = windows.get(id);
    return Boolean(win && !win.isDestroyed());
  });
}

export function isWidgetOpen(id: string): boolean {
  const win = windows.get(id);
  return Boolean(win && !win.isDestroyed() && win.isVisible());
}

export function closeWidgetWindow(id: string): void {
  const win = windows.get(id);
  if (win && !win.isDestroyed()) {
    win.close();
  }
  windows.delete(id);
}

export function closeAllWidgetWindows(): void {
  for (const id of [...windows.keys()]) {
    closeWidgetWindow(id);
  }
}

export function focusWidgetWindow(id: string): void {
  const win = windows.get(id);
  if (!win || win.isDestroyed()) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

export async function openWidgetWindow(
  widget: WidgetInstance,
  onBoundsChanged: (id: string, bounds: { x: number; y: number; width: number; height: number }) => void,
): Promise<BrowserWindow> {
  const existing = windows.get(widget.id);
  if (existing && !existing.isDestroyed()) {
    existing.setBounds({
      x: widget.x,
      y: widget.y,
      width: widget.width,
      height: widget.height,
    });
    existing.setOpacity(widget.opacity);
    existing.setAlwaysOnTop(widget.alwaysOnTop, 'floating');
    existing.webContents.send('wiwidget:instance', widget);
    existing.show();
    return existing;
  }

  const display = screen.getDisplayNearestPoint({ x: widget.x, y: widget.y });
  const work = display.workArea;
  const x = Math.min(Math.max(widget.x, work.x - 40), work.x + work.width - 80);
  const y = Math.min(Math.max(widget.y, work.y - 40), work.y + work.height - 80);

  const win = new BrowserWindow({
    x,
    y,
    width: widget.width,
    height: widget.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: widget.alwaysOnTop,
    hasShadow: true,
    show: false,
    focusable: true,
    webPreferences: {
      preload: shellPreload('preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.setOpacity(widget.opacity);
  if (widget.alwaysOnTop) {
    win.setAlwaysOnTop(true, 'floating');
  }
  win.setMenuBarVisibility(false);

  windows.set(widget.id, win);

  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  const persistBounds = () => {
    if (win.isDestroyed()) {
      return;
    }
    const bounds = win.getBounds();
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    saveTimer = setTimeout(() => {
      onBoundsChanged(widget.id, bounds);
    }, 250);
  };

  win.on('moved', persistBounds);
  win.on('resized', persistBounds);
  win.on('closed', () => {
    windows.delete(widget.id);
  });

  await win.loadFile(widgetHtml(), { query: { id: widget.id } });
  win.webContents.send('wiwidget:instance', widget);
  win.showInactive();
  return win;
}

export function sendWidgetInstance(widget: WidgetInstance): void {
  const win = windows.get(widget.id);
  if (!win || win.isDestroyed()) {
    return;
  }
  win.webContents.send('wiwidget:instance', widget);
}
