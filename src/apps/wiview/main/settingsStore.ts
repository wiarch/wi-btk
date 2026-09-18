import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  WIVIEW_APP_ID,
  mergeWiviewSettings,
  type WiviewSettings,
} from '../../../shared/settings/wiview';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIVIEW_APP_ID), 'settings.json');
}

export async function loadWiviewSettings(): Promise<WiviewSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWiviewSettings(JSON.parse(raw) as Partial<WiviewSettings>);
  } catch {
    return mergeWiviewSettings(null);
  }
}

export async function saveWiviewSettings(settings: WiviewSettings): Promise<void> {
  const dir = appConfigDir(WIVIEW_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(mergeWiviewSettings(settings), null, 2)}\n`, 'utf8');
}
