import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WIDIMMER_SETTINGS,
  WIDIMMER_APP_ID,
  mergeWidimmerSettings,
  type WidimmerSettings,
} from '../../../shared/settings/widimmer';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIDIMMER_APP_ID), 'settings.json');
}

export async function loadWidimmerSettings(): Promise<WidimmerSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWidimmerSettings(JSON.parse(raw) as Partial<WidimmerSettings>);
  } catch {
    return { ...DEFAULT_WIDIMMER_SETTINGS };
  }
}

export async function saveWidimmerSettings(settings: WidimmerSettings): Promise<void> {
  const dir = appConfigDir(WIDIMMER_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(
    settingsPath(),
    `${JSON.stringify(mergeWidimmerSettings(settings), null, 2)}\n`,
    'utf8',
  );
}
