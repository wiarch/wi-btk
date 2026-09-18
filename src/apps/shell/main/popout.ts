import { BrowserWindow } from 'electron';
import { distPath, shellPreload } from '../../../shared/paths';

type PopoutSpec = {
  title: string;
  htmlParts: string[];
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  backgroundColor?: string;
};

const SPECS: Record<string, PopoutSpec> = {
  wicalc: {
    title: 'WI-Calc',
    htmlParts: ['apps', 'wicalc', 'renderer', 'calc.html'],
    width: 360,
    height: 520,
    minWidth: 320,
    minHeight: 460,
    backgroundColor: '#1a1a1a',
  },
  wiclock: {
    title: 'WI-Clock',
    htmlParts: ['apps', 'wiclock', 'renderer', 'clock.html'],
    width: 480,
    height: 640,
    minWidth: 380,
    minHeight: 520,
    backgroundColor: '#1a1a1a',
  },
  winotes: {
    title: 'WI-Notes',
    htmlParts: ['apps', 'winotes', 'renderer', 'notes.html'],
    width: 720,
    height: 700,
    minWidth: 480,
    minHeight: 480,
    backgroundColor: '#202020',
  },
  wirate: {
    title: 'WI-Rate',
    htmlParts: ['apps', 'wirate', 'renderer', 'rate.html'],
    width: 440,
    height: 680,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: '#202020',
  },
  wisystem: {
    title: 'WI-System',
    htmlParts: ['apps', 'wisystem', 'renderer', 'system.html'],
    width: 920,
    height: 680,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: '#1e1e1e',
  },
  widimmer: {
    title: 'WI-Dimmer',
    htmlParts: ['apps', 'widimmer', 'renderer', 'dimmer.html'],
    width: 520,
    height: 820,
    minWidth: 420,
    minHeight: 640,
    backgroundColor: '#1a1410',
  },
  witranslate: {
    title: 'WI-Translate',
    htmlParts: ['apps', 'witranslate', 'renderer', 'translate.html'],
    width: 780,
    height: 820,
    minWidth: 560,
    minHeight: 640,
    backgroundColor: '#101820',
  },
  wicam: {
    title: 'WI-Cam',
    htmlParts: ['apps', 'wicam', 'renderer', 'cam.html'],
    width: 900,
    height: 780,
    minWidth: 640,
    minHeight: 560,
    backgroundColor: '#12141a',
  },
  winetest: {
    title: 'WI-Netest',
    htmlParts: ['apps', 'winetest', 'renderer', 'netest.html'],
    width: 520,
    height: 720,
    minWidth: 400,
    minHeight: 560,
    backgroundColor: '#ffffff',
  },
};

const windows = new Map<string, BrowserWindow>();

function broadcast(appId: string, open: boolean): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('shell:popoutState', { appId, open });
    }
  }
}

export function isPopoutOpen(appId: string): boolean {
  const win = windows.get(appId);
  return Boolean(win && !win.isDestroyed() && win.isVisible());
}

export function openPopout(appId: string): { ok: boolean; error?: string } {
  const spec = SPECS[appId];
  if (!spec) {
    return { ok: false, error: `Unknown popout: ${appId}` };
  }

  const existing = windows.get(appId);
  if (existing && !existing.isDestroyed()) {
    if (!existing.isVisible()) {
      existing.show();
    }
    existing.focus();
    broadcast(appId, true);
    return { ok: true };
  }

  const win = new BrowserWindow({
    width: spec.width ?? 640,
    height: spec.height ?? 720,
    minWidth: spec.minWidth ?? 320,
    minHeight: spec.minHeight ?? 400,
    show: false,
    resizable: true,
    maximizable: true,
    minimizable: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    title: spec.title,
    backgroundColor: spec.backgroundColor ?? '#202020',
    webPreferences: {
      preload: shellPreload('preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  win.setMaximizable(true);
  win.setResizable(true);

  windows.set(appId, win);

  win.once('ready-to-show', () => {
    win.show();
    broadcast(appId, true);
  });

  win.on('closed', () => {
    windows.delete(appId);
    broadcast(appId, false);
  });

  void win.loadFile(distPath(...spec.htmlParts));
  return { ok: true };
}

export function closePopout(appId: string): void {
  const win = windows.get(appId);
  if (win && !win.isDestroyed()) {
    win.close();
  }
}

export function togglePopout(appId: string): { ok: boolean; open: boolean; error?: string } {
  if (isPopoutOpen(appId)) {
    closePopout(appId);
    return { ok: true, open: false };
  }
  const result = openPopout(appId);
  return { ok: result.ok, open: result.ok, error: result.error };
}

export function teardownPopouts(): void {
  for (const [appId, win] of windows) {
    try {
      if (!win.isDestroyed()) {
        win.close();
      }
    } catch {
      // ignore
    }
    windows.delete(appId);
  }
}

export function setupPopoutIpc(ipcMain: Electron.IpcMain): void {
  ipcMain.handle('shell:openPopout', (_event, appId: string) => openPopout(String(appId)));
  ipcMain.handle('shell:closePopout', (_event, appId: string) => {
    closePopout(String(appId));
    return { ok: true, open: false };
  });
  ipcMain.handle('shell:togglePopout', (_event, appId: string) => togglePopout(String(appId)));
  ipcMain.handle('shell:isPopoutOpen', (_event, appId: string) => ({
    open: isPopoutOpen(String(appId)),
  }));
}
