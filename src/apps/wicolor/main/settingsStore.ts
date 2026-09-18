import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WICOLOR_SETTINGS,
  WICOLOR_APP_ID,
  mergeWicolorSettings,
  type WicolorSettings,
} from '../../../shared/settings/wicolor';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WICOLOR_APP_ID), 'settings.json');
}

export async function loadWicolorSettings(): Promise<WicolorSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWicolorSettings(JSON.parse(raw) as Partial<WicolorSettings>);
  } catch {
    return mergeWicolorSettings(DEFAULT_WICOLOR_SETTINGS);
  }
}

export async function saveWicolorSettings(settings: WicolorSettings): Promise<void> {
  const dir = appConfigDir(WICOLOR_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(mergeWicolorSettings(settings), null, 2)}\n`, 'utf8');
}
