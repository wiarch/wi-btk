import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';
import {
  DEFAULT_SETTINGS,
  mergeAppSettings,
  pickShellSettings,
  pickWirecSettings,
  SHELL_APP_ID,
  type AppSettings,
} from '../../../shared/settings';
import { appConfigDir } from '../../../shared/paths';
import { loadShellSettings, saveShellSettings } from './shellSettingsStore';
import { loadWirecSettings, saveWirecSettings } from '../../wirec/main/settingsStore';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function readLegacySettings(): Promise<Partial<AppSettings> | null> {
  try {
    const raw = await readFile(join(app.getPath('userData'), 'settings.json'), 'utf8');
    return JSON.parse(raw) as Partial<AppSettings>;
  } catch {
    return null;
  }
}

export async function loadSettings(): Promise<AppSettings> {
  const shellPath = join(appConfigDir(SHELL_APP_ID), 'settings.json');
  const alreadySplit = await fileExists(shellPath);
  const legacy = await readLegacySettings();

  if (legacy && !alreadySplit) {
    const migrated: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...legacy,
      hotkeys: {
        ...DEFAULT_SETTINGS.hotkeys,
        ...(legacy.hotkeys ?? {}),
      },
    };
    await saveSettings(migrated);
    return migrated;
  }

  const [shell, wirec] = await Promise.all([loadShellSettings(), loadWirecSettings()]);
  return mergeAppSettings(shell, wirec);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await Promise.all([
    saveShellSettings(pickShellSettings(settings)),
    saveWirecSettings(pickWirecSettings(settings)),
  ]);
}
