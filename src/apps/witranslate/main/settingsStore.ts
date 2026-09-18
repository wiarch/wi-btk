import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WITRANSLATE_SETTINGS,
  WITRANSLATE_APP_ID,
  mergeWitranslateSettings,
  type WitranslateSettings,
} from '../../../shared/settings/witranslate';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WITRANSLATE_APP_ID), 'settings.json');
}

export async function loadWitranslateSettings(): Promise<WitranslateSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWitranslateSettings(JSON.parse(raw) as Partial<WitranslateSettings>);
  } catch {
    return { ...DEFAULT_WITRANSLATE_SETTINGS };
  }
}

export async function saveWitranslateSettings(settings: WitranslateSettings): Promise<void> {
  const dir = appConfigDir(WITRANSLATE_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(
    settingsPath(),
    `${JSON.stringify(mergeWitranslateSettings(settings), null, 2)}\n`,
    'utf8',
  );
}
