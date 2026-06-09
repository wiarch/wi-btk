import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';
import { AppSettings, DEFAULT_SETTINGS, GLOBAL_HOTKEY_ACTIONS } from '../shared/settings';
import { isSafeGlobalAccelerator } from './hotkeys';

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

function mergeSettings(partial: Partial<AppSettings> & { captureFullScreen?: boolean }): AppSettings {
  const hotkeys = {
    ...DEFAULT_SETTINGS.hotkeys,
    ...(partial.hotkeys ?? {}),
  };

  if (partial.captureFullScreen === true && !partial.hotkeys?.captureFullScreen) {
    hotkeys.captureFullScreen = DEFAULT_SETTINGS.hotkeys.captureFullScreen;
  }

  for (const action of GLOBAL_HOTKEY_ACTIONS) {
    if (hotkeys[action] && !isSafeGlobalAccelerator(hotkeys[action])) {
      hotkeys[action] = DEFAULT_SETTINGS.hotkeys[action];
    }
  }

  return {
    language: partial.language ?? DEFAULT_SETTINGS.language,
    launchAtStartup: partial.launchAtStartup ?? DEFAULT_SETTINGS.launchAtStartup,
    hotkeys,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeSettings(JSON.parse(raw) as Partial<AppSettings>);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const dir = app.getPath('userData');
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}
