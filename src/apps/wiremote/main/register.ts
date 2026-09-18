import { BrowserWindow, ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import { loadWiremoteSettings, saveWiremoteSettings } from './settingsStore';
import { mergeWiremoteSettings, type WiremoteSettings } from '../../../shared/settings/wiremote';
import { isInputInjectionAvailable } from './inputInject';
import {
  connectWiremoteGuest,
  getLocalAddresses,
  getWiremoteRole,
  sendWiremoteInput,
  setWiremoteEventHandler,
  startWiremoteHost,
  stopWiremoteSession,
} from './session';

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}

export function setupWiremoteIpc(onSettingsSaved?: (settings: WiremoteSettings) => void): void {
  setWiremoteEventHandler((event) => {
    if (event.kind === 'frame') {
      broadcast('wiremote:frame', {
        data: event.data.toString('base64'),
        width: event.width,
        height: event.height,
      });
      return;
    }
    if (event.kind === 'status') {
      broadcast('wiremote:status', { status: event.status });
      return;
    }
    if (event.kind === 'connected') {
      broadcast('wiremote:connected', { role: event.role });
      notifySimple('WI-Remote', event.role === 'host' ? 'Cliente conectado' : 'Conectado');
      return;
    }
    if (event.kind === 'disconnected') {
      broadcast('wiremote:disconnected', {});
      return;
    }
    if (event.kind === 'error') {
      broadcast('wiremote:error', { message: event.message });
      notifySimple('WI-Remote', event.message);
    }
  });

  ipcMain.handle('wiremote:getSettings', async () => loadWiremoteSettings());

  ipcMain.handle('wiremote:saveSettings', async (_event, raw: Partial<WiremoteSettings>) => {
    try {
      const settings = mergeWiremoteSettings(raw);
      await saveWiremoteSettings(settings);
      onSettingsSaved?.(settings);
      broadcast('wiremote:settingsChanged', settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('wiremote:getInfo', async () => {
    const settings = await loadWiremoteSettings();
    return {
      addresses: getLocalAddresses(),
      port: settings.port,
      role: getWiremoteRole(),
      inputReady: isInputInjectionAvailable(),
    };
  });

  ipcMain.handle('wiremote:hostStart', async () => {
    const settings = await loadWiremoteSettings();
    return startWiremoteHost({
      port: settings.port,
      quality: settings.quality,
      fps: settings.fps,
      allowControl: settings.allowControl,
    });
  });

  ipcMain.handle('wiremote:connect', async (_event, payload: { host: string; port?: number; pin: string }) => {
    const settings = await loadWiremoteSettings();
    const host = String(payload.host || '').trim();
    const pin = String(payload.pin || '').trim();
    if (!host || !pin) {
      return { ok: false as const, error: 'Host y PIN requeridos' };
    }
    return connectWiremoteGuest({
      host,
      port: Number(payload.port) || settings.port,
      pin,
    });
  });

  ipcMain.handle('wiremote:stop', async () => {
    stopWiremoteSession();
    return { ok: true as const };
  });

  ipcMain.on('wiremote:input', (_event, payload: unknown) => {
    sendWiremoteInput(payload as Parameters<typeof sendWiremoteInput>[0]);
  });

  ipcMain.on('wiremote:notify', (_event, message: string) => {
    notifySimple('WI-Remote', String(message));
  });
}

export function teardownWiremote(): void {
  stopWiremoteSession();
}
