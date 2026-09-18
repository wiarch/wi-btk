import { globalShortcut, ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import {
  isValidAccelerator,
  normalizeForElectron,
} from '../../wirec/main/hotkeys';
import { listAudioEndpoints, setDefaultAudioEndpoint } from './audioDevices';
import { loadWideviceSettings, saveWideviceSettings } from './settingsStore';
import type { WideviceSettings } from '../../../shared/settings/widevice';

const registered = new Set<string>();

function cycleIds(ids: string[], current: string): string | null {
  if (ids.length === 0) {
    return null;
  }
  const index = Math.max(0, ids.indexOf(current));
  return ids[(index + 1) % ids.length];
}

async function switchPlayback(): Promise<void> {
  const settings = await loadWideviceSettings();
  const devices = await listAudioEndpoints('playback');
  if (devices.length === 0) {
    return;
  }
  const pool =
    settings.enabledPlaybackIds.length > 0
      ? devices.filter((device) => settings.enabledPlaybackIds.includes(device.id))
      : devices;
  const ids = pool.map((device) => device.id);
  const current = devices.find((device) => device.isDefault)?.id ?? settings.lastPlaybackId;
  const nextId = cycleIds(ids, current);
  if (!nextId) {
    return;
  }
  const result = await setDefaultAudioEndpoint(nextId);
  if (!result.ok) {
    notifySimple('WI-Device', result.error ?? 'Switch failed');
    return;
  }
  const name = devices.find((device) => device.id === nextId)?.name ?? nextId;
  settings.lastPlaybackId = nextId;
  await saveWideviceSettings(settings);
  notifySimple('WI-Device', `Playback: ${name}`);
}

async function switchRecording(): Promise<void> {
  const settings = await loadWideviceSettings();
  const devices = await listAudioEndpoints('recording');
  if (devices.length === 0) {
    return;
  }
  const pool =
    settings.enabledRecordingIds.length > 0
      ? devices.filter((device) => settings.enabledRecordingIds.includes(device.id))
      : devices;
  const ids = pool.map((device) => device.id);
  const current = devices.find((device) => device.isDefault)?.id ?? settings.lastRecordingId;
  const nextId = cycleIds(ids, current);
  if (!nextId) {
    return;
  }
  const result = await setDefaultAudioEndpoint(nextId);
  if (!result.ok) {
    notifySimple('WI-Device', result.error ?? 'Switch failed');
    return;
  }
  const name = devices.find((device) => device.id === nextId)?.name ?? nextId;
  settings.lastRecordingId = nextId;
  await saveWideviceSettings(settings);
  notifySimple('WI-Device', `Recording: ${name}`);
}

export function registerWideviceHotkeys(settings: WideviceSettings): void {
  for (const accelerator of registered) {
    try {
      globalShortcut.unregister(accelerator);
    } catch {
      // ignore
    }
  }
  registered.clear();

  if (!settings.hotkeysEnabled) {
    return;
  }

  const map: Array<{ action: keyof WideviceSettings['hotkeys']; handler: () => void }> = [
    { action: 'switchPlayback', handler: () => void switchPlayback() },
    { action: 'switchRecording', handler: () => void switchRecording() },
    {
      action: 'switchCamera',
      handler: () => {
        notifySimple('WI-Device', 'Camera hotkey: set preferred camera in WI-Device');
      },
    },
  ];

  for (const item of map) {
    const raw = settings.hotkeys[item.action];
    const accelerator = normalizeForElectron(raw);
    if (!accelerator || !isValidAccelerator(accelerator)) {
      continue;
    }
    try {
      const ok = globalShortcut.register(accelerator, item.handler);
      if (ok) {
        registered.add(accelerator);
      }
    } catch {
      // ignore conflicts with wirec hotkeys
    }
  }
}

export function setupWideviceIpc(onSettingsSaved: (settings: WideviceSettings) => void): void {
  ipcMain.handle('widevice:getSettings', async () => loadWideviceSettings());

  ipcMain.handle('widevice:saveSettings', async (_event, settings: WideviceSettings) => {
    try {
      await saveWideviceSettings(settings);
      onSettingsSaved(settings);
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('widevice:listPlayback', async () => listAudioEndpoints('playback'));
  ipcMain.handle('widevice:listRecording', async () => listAudioEndpoints('recording'));

  ipcMain.handle('widevice:setPlayback', async (_event, id: string) => {
    const result = await setDefaultAudioEndpoint(id);
    if (result.ok) {
      const settings = await loadWideviceSettings();
      settings.lastPlaybackId = id;
      await saveWideviceSettings(settings);
    }
    return result;
  });

  ipcMain.handle('widevice:setRecording', async (_event, id: string) => {
    const result = await setDefaultAudioEndpoint(id);
    if (result.ok) {
      const settings = await loadWideviceSettings();
      settings.lastRecordingId = id;
      await saveWideviceSettings(settings);
    }
    return result;
  });

  ipcMain.on('widevice:notify', (_event, message: string) => {
    notifySimple('WI-Device', String(message));
  });
}
