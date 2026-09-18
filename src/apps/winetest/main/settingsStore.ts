import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_NETEST_SETTINGS,
  NETEST_APP_ID,
  type NetestSettings,
} from '../../../shared/settings/winetest';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(NETEST_APP_ID), 'settings.json');
}

function merge(partial: Partial<NetestSettings>): NetestSettings {
  return {
    connectionMode: partial.connectionMode === 'single' ? 'single' : 'multi',
    lastResult: partial.lastResult ?? DEFAULT_NETEST_SETTINGS.lastResult,
    serverLabel: partial.serverLabel ?? DEFAULT_NETEST_SETTINGS.serverLabel,
    serverLocation: partial.serverLocation ?? DEFAULT_NETEST_SETTINGS.serverLocation,
  };
}

export async function loadNetestSettings(): Promise<NetestSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return merge(JSON.parse(raw) as Partial<NetestSettings>);
  } catch {
    return { ...DEFAULT_NETEST_SETTINGS };
  }
}

export async function saveNetestSettings(settings: NetestSettings): Promise<void> {
  const dir = appConfigDir(NETEST_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}
