import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WIBOOSTER_SETTINGS,
  WIBOOSTER_APP_ID,
  mergeWiboosterSettings,
  type WiboosterSettings,
} from '../../../shared/settings/wibooster';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIBOOSTER_APP_ID), 'settings.json');
}

export async function loadWiboosterSettings(): Promise<WiboosterSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWiboosterSettings(JSON.parse(raw) as Partial<WiboosterSettings>);
  } catch {
    return { ...DEFAULT_WIBOOSTER_SETTINGS };
  }
}

export async function saveWiboosterSettings(settings: WiboosterSettings): Promise<void> {
  const dir = appConfigDir(WIBOOSTER_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(
    settingsPath(),
    `${JSON.stringify(mergeWiboosterSettings(settings), null, 2)}\n`,
    'utf8',
  );
}
