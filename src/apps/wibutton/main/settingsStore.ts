import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WIBUTTON_SETTINGS,
  WIBUTTON_APP_ID,
  mergeWibuttonSettings,
  type WibuttonSettings,
} from '../../../shared/settings/wibutton';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIBUTTON_APP_ID), 'settings.json');
}

export async function loadWibuttonSettings(): Promise<WibuttonSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWibuttonSettings(JSON.parse(raw) as Partial<WibuttonSettings>);
  } catch {
    return {
      ...DEFAULT_WIBUTTON_SETTINGS,
      bindings: {
        middle: { ...DEFAULT_WIBUTTON_SETTINGS.bindings.middle },
        x1: { ...DEFAULT_WIBUTTON_SETTINGS.bindings.x1 },
        x2: { ...DEFAULT_WIBUTTON_SETTINGS.bindings.x2 },
      },
    };
  }
}

export async function saveWibuttonSettings(settings: WibuttonSettings): Promise<void> {
  const dir = appConfigDir(WIBUTTON_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(mergeWibuttonSettings(settings), null, 2)}\n`, 'utf8');
}
