import { BrowserWindow, dialog, globalShortcut, ipcMain, net, protocol } from 'electron';
import { basename, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { notifySimple } from '../../shell/main/notifications';
import { getPopoutWindow, openPopout } from '../../shell/main/popout';
import {
  isSafeGlobalAccelerator,
  isValidAccelerator,
  normalizeForElectron,
} from '../../wirec/main/hotkeys';
import { loadWiviewSettings, saveWiviewSettings } from './settingsStore';
import {
  detectMediaKind,
  mergeWiviewSettings,
  type WiviewRecentItem,
  type WiviewSettings,
} from '../../../shared/settings/wiview';

let registeredHotkey: string | null = null;
let protocolReady = false;
let quickOpenHandler: (() => void) | null = null;

function broadcastSettings(settings: WiviewSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('wiview:settingsChanged', settings);
    }
  }
}

function broadcastOpenFiles(paths: string[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('wiview:openFiles', paths);
    }
  }
}

function toMediaUrl(filePath: string): string {
  return `wiview://local/?path=${encodeURIComponent(filePath)}`;
}

async function rememberPaths(paths: string[]): Promise<WiviewSettings> {
  const settings = await loadWiviewSettings();
  const now = Date.now();
  const incoming: WiviewRecentItem[] = [];
  for (const filePath of paths) {
    const kind = detectMediaKind(filePath);
    if (!kind) continue;
    incoming.push({
      path: filePath,
      name: basename(filePath),
      kind,
      openedAt: now,
    });
  }
  const merged = [...incoming, ...settings.recent.filter((item) => !paths.includes(item.path))];
  const next = mergeWiviewSettings({
    ...settings,
    recent: merged,
    lastFolder: paths[0] ? dirname(paths[0]) : settings.lastFolder,
  });
  await saveWiviewSettings(next);
  broadcastSettings(next);
  return next;
}

async function pickFiles(multi = true): Promise<string[]> {
  const settings = await loadWiviewSettings();
  const result = await dialog.showOpenDialog({
    title: 'WI-View',
    defaultPath: settings.lastFolder || undefined,
    properties: multi ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: [
      {
        name: 'Media',
        extensions: [
          'png',
          'jpg',
          'jpeg',
          'gif',
          'webp',
          'bmp',
          'svg',
          'mp4',
          'webm',
          'mkv',
          'mov',
          'avi',
          'mp3',
          'wav',
          'ogg',
          'flac',
          'm4a',
          'aac',
        ],
      },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico'] },
      { name: 'Videos', extensions: ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v'] },
      { name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus'] },
      { name: 'All', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) {
    return [];
  }
  return result.filePaths.filter((path) => Boolean(detectMediaKind(path)));
}

export function ensureWiviewProtocol(): void {
  if (protocolReady) {
    return;
  }
  protocol.handle('wiview', (request) => {
    try {
      const url = new URL(request.url);
      const filePath = url.searchParams.get('path');
      if (!filePath) {
        return new Response('Not found', { status: 404 });
      }
      return net.fetch(pathToFileURL(filePath).href);
    } catch {
      return new Response('Bad request', { status: 400 });
    }
  });
  protocolReady = true;
}

export function registerWiviewHotkeys(settings: WiviewSettings, enabled: boolean): void {
  if (registeredHotkey) {
    try {
      globalShortcut.unregister(registeredHotkey);
    } catch {
      // ignore
    }
    registeredHotkey = null;
  }

  if (!enabled || !settings.hotkeyEnabled) {
    return;
  }

  const accelerator = normalizeForElectron(settings.hotkey);
  if (!accelerator || !isValidAccelerator(accelerator) || !isSafeGlobalAccelerator(accelerator)) {
    return;
  }

  try {
    const ok = globalShortcut.register(accelerator, () => {
      quickOpenHandler?.();
    });
    if (ok) {
      registeredHotkey = accelerator;
    }
  } catch {
    // ignore
  }
}

export function setWiviewQuickOpenHandler(handler: (() => void) | null): void {
  quickOpenHandler = handler;
}

export async function triggerWiviewQuickOpen(): Promise<void> {
  openPopout('wiview');
  const paths = await pickFiles(true);
  if (paths.length === 0) {
    return;
  }
  await rememberPaths(paths);
  const win = getPopoutWindow('wiview');
  if (win && !win.isDestroyed()) {
    win.focus();
    win.webContents.send('wiview:openFiles', paths);
  } else {
    broadcastOpenFiles(paths);
  }
}

export function setupWiviewIpc(onSettingsSaved?: (settings: WiviewSettings) => void): void {
  ensureWiviewProtocol();

  ipcMain.handle('wiview:getSettings', async () => loadWiviewSettings());

  ipcMain.handle('wiview:saveSettings', async (_event, raw: Partial<WiviewSettings>) => {
    try {
      const settings = mergeWiviewSettings(raw);
      await saveWiviewSettings(settings);
      broadcastSettings(settings);
      onSettingsSaved?.(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('wiview:pickFiles', async () => {
    const paths = await pickFiles(true);
    if (paths.length > 0) {
      await rememberPaths(paths);
    }
    return { ok: true as const, paths };
  });

  ipcMain.handle('wiview:resolveMedia', async (_event, filePath: string) => {
    const path = String(filePath || '').trim();
    const kind = detectMediaKind(path);
    if (!path || !kind) {
      return { ok: false as const, error: 'Unsupported file' };
    }
    await rememberPaths([path]);
    return {
      ok: true as const,
      path,
      name: basename(path),
      kind,
      url: toMediaUrl(path),
    };
  });

  ipcMain.handle('wiview:clearRecent', async () => {
    const settings = await loadWiviewSettings();
    const next = mergeWiviewSettings({ ...settings, recent: [] });
    await saveWiviewSettings(next);
    broadcastSettings(next);
    return { ok: true as const, settings: next };
  });

  ipcMain.on('wiview:notify', (_event, message: string) => {
    notifySimple('WI-View', String(message));
  });
}

export function teardownWiview(): void {
  if (registeredHotkey) {
    try {
      globalShortcut.unregister(registeredHotkey);
    } catch {
      // ignore
    }
    registeredHotkey = null;
  }
  quickOpenHandler = null;
}
