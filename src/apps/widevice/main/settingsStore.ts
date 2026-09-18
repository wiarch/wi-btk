import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WIDEVICE_SETTINGS,
  WIDEVICE_APP_ID,
  type WideviceSettings,
} from '../../../shared/settings/widevice';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIDEVICE_APP_ID), 'settings.json');
}

function merge(partial: Partial<WideviceSettings>): WideviceSettings {
  return {
    hotkeys: {
      ...DEFAULT_WIDEVICE_SETTINGS.hotkeys,
      ...(partial.hotkeys ?? {}),
    },
    hotkeysEnabled: partial.hotkeysEnabled ?? DEFAULT_WIDEVICE_SETTINGS.hotkeysEnabled,
    enabledPlaybackIds: partial.enabledPlaybackIds ?? [],
    enabledRecordingIds: partial.enabledRecordingIds ?? [],
    enabledCameraIds: partial.enabledCameraIds ?? [],
    lastPlaybackId: partial.lastPlaybackId ?? '',
    lastRecordingId: partial.lastRecordingId ?? '',
    lastCameraId: partial.lastCameraId ?? '',
  };
}

export async function loadWideviceSettings(): Promise<WideviceSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return merge(JSON.parse(raw) as Partial<WideviceSettings>);
  } catch {
    return {
      ...DEFAULT_WIDEVICE_SETTINGS,
      hotkeys: { ...DEFAULT_WIDEVICE_SETTINGS.hotkeys },
    };
  }
}

export async function saveWideviceSettings(settings: WideviceSettings): Promise<void> {
  const dir = appConfigDir(WIDEVICE_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}
