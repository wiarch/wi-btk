import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WICLOCK_SETTINGS,
  WICLOCK_APP_ID,
  mergeWiclockSettings,
  type WiclockSettings,
} from '../../../shared/settings/wiclock';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WICLOCK_APP_ID), 'settings.json');
}

export async function loadWiclockSettings(): Promise<WiclockSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWiclockSettings(JSON.parse(raw) as Partial<WiclockSettings>);
  } catch {
    return mergeWiclockSettings(DEFAULT_WICLOCK_SETTINGS);
  }
}

export async function saveWiclockSettings(settings: WiclockSettings): Promise<void> {
  const dir = appConfigDir(WICLOCK_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(mergeWiclockSettings(settings), null, 2)}\n`, 'utf8');
}
