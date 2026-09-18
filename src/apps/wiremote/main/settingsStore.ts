import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  WIREMOTE_APP_ID,
  mergeWiremoteSettings,
  type WiremoteSettings,
} from '../../../shared/settings/wiremote';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIREMOTE_APP_ID), 'settings.json');
}

export async function loadWiremoteSettings(): Promise<WiremoteSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWiremoteSettings(JSON.parse(raw) as Partial<WiremoteSettings>);
  } catch {
    return mergeWiremoteSettings(null);
  }
}

export async function saveWiremoteSettings(settings: WiremoteSettings): Promise<void> {
  const dir = appConfigDir(WIREMOTE_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(
    settingsPath(),
    `${JSON.stringify(mergeWiremoteSettings(settings), null, 2)}\n`,
    'utf8',
  );
}
