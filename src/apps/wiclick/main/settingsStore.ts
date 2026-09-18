import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WICLICK_SETTINGS,
  WICLICK_APP_ID,
  mergeWiclickSettings,
  type WiclickSettings,
} from '../../../shared/settings/wiclick';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WICLICK_APP_ID), 'settings.json');
}

export async function loadWiclickSettings(): Promise<WiclickSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWiclickSettings(JSON.parse(raw) as Partial<WiclickSettings>);
  } catch {
    return { ...DEFAULT_WICLICK_SETTINGS };
  }
}

export async function saveWiclickSettings(settings: WiclickSettings): Promise<void> {
  const dir = appConfigDir(WICLICK_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(mergeWiclickSettings(settings), null, 2)}\n`, 'utf8');
}
