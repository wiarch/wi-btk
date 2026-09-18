import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WIWIDGET_SETTINGS,
  WIWIDGET_APP_ID,
  mergeWiwidgetSettings,
  type WiwidgetSettings,
} from '../../../shared/settings/wiwidget';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIWIDGET_APP_ID), 'settings.json');
}

export async function loadWiwidgetSettings(): Promise<WiwidgetSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWiwidgetSettings(JSON.parse(raw) as Partial<WiwidgetSettings>);
  } catch {
    return mergeWiwidgetSettings(DEFAULT_WIWIDGET_SETTINGS);
  }
}

export async function saveWiwidgetSettings(settings: WiwidgetSettings): Promise<void> {
  const dir = appConfigDir(WIWIDGET_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(
    settingsPath(),
    `${JSON.stringify(mergeWiwidgetSettings(settings), null, 2)}\n`,
    'utf8',
  );
}
