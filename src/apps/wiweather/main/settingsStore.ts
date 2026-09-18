import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  WIWEATHER_APP_ID,
  mergeWiweatherSettings,
  type WiweatherSettings,
} from '../../../shared/settings/wiweather';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIWEATHER_APP_ID), 'settings.json');
}

export async function loadWiweatherSettings(): Promise<WiweatherSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWiweatherSettings(JSON.parse(raw) as Partial<WiweatherSettings>);
  } catch {
    return mergeWiweatherSettings(null);
  }
}

export async function saveWiweatherSettings(settings: WiweatherSettings): Promise<void> {
  const dir = appConfigDir(WIWEATHER_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(
    settingsPath(),
    `${JSON.stringify(mergeWiweatherSettings(settings), null, 2)}\n`,
    'utf8',
  );
}
