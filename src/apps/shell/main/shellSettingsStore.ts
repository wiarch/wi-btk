import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_SHELL_SETTINGS, SHELL_APP_ID, type ShellSettings } from '../../../shared/settings';
import { mergeAppEnablement } from '../../../shared/apps/registry';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(SHELL_APP_ID), 'settings.json');
}

function mergeShellSettings(partial: Partial<ShellSettings>): ShellSettings {
  return {
    language: partial.language ?? DEFAULT_SHELL_SETTINGS.language,
    launchAtStartup: partial.launchAtStartup ?? DEFAULT_SHELL_SETTINGS.launchAtStartup,
    sidebarIconsOnly: partial.sidebarIconsOnly ?? DEFAULT_SHELL_SETTINGS.sidebarIconsOnly,
    enabledApps: mergeAppEnablement(partial.enabledApps),
  };
}

export async function loadShellSettings(): Promise<ShellSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeShellSettings(JSON.parse(raw) as Partial<ShellSettings>);
  } catch {
    return { ...DEFAULT_SHELL_SETTINGS };
  }
}

export async function saveShellSettings(settings: ShellSettings): Promise<void> {
  const dir = appConfigDir(SHELL_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}
