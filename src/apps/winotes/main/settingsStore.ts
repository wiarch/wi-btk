import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  WINOTES_APP_ID,
  mergeWinotesSettings,
  type WinotesSettings,
} from '../../../shared/settings/winotes';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WINOTES_APP_ID), 'settings.json');
}

export async function loadWinotesSettings(): Promise<WinotesSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWinotesSettings(JSON.parse(raw) as Partial<WinotesSettings>);
  } catch {
    return { notes: [] };
  }
}

export async function saveWinotesSettings(settings: WinotesSettings): Promise<void> {
  const dir = appConfigDir(WINOTES_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(mergeWinotesSettings(settings), null, 2)}\n`, 'utf8');
}
