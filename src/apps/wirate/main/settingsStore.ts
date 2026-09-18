import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WIRATE_SETTINGS,
  WIRATE_APP_ID,
  mergeWirateSettings,
  type WirateSettings,
} from '../../../shared/settings/wirate';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIRATE_APP_ID), 'settings.json');
}

export async function loadWirateSettings(): Promise<WirateSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWirateSettings(JSON.parse(raw) as Partial<WirateSettings>);
  } catch {
    return { ...DEFAULT_WIRATE_SETTINGS };
  }
}

export async function saveWirateSettings(settings: WirateSettings): Promise<void> {
  const dir = appConfigDir(WIRATE_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(mergeWirateSettings(settings), null, 2)}\n`, 'utf8');
}
