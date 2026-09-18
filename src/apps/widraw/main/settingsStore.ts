import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import {
  DEFAULT_WIDRAW_SETTINGS,
  WIDRAW_APP_ID,
  mergeWidrawSettings,
  type WidrawSettings,
} from '../../../shared/settings/widraw';
import { appConfigDir } from '../../../shared/paths';

function settingsPath(): string {
  return join(appConfigDir(WIDRAW_APP_ID), 'settings.json');
}

function scenePath(): string {
  return join(appConfigDir(WIDRAW_APP_ID), 'scene.json');
}

export async function loadWidrawSettings(): Promise<WidrawSettings> {
  try {
    const raw = await readFile(settingsPath(), 'utf8');
    return mergeWidrawSettings(JSON.parse(raw) as Partial<WidrawSettings>);
  } catch {
    return { ...DEFAULT_WIDRAW_SETTINGS };
  }
}

export async function saveWidrawSettings(settings: WidrawSettings): Promise<void> {
  const dir = appConfigDir(WIDRAW_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(settingsPath(), `${JSON.stringify(mergeWidrawSettings(settings), null, 2)}\n`, 'utf8');
}

export async function loadWidrawScene(): Promise<unknown | null> {
  try {
    const raw = await readFile(scenePath(), 'utf8');
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function saveWidrawScene(scene: unknown): Promise<void> {
  const dir = appConfigDir(WIDRAW_APP_ID);
  await mkdir(dir, { recursive: true });
  await writeFile(scenePath(), `${JSON.stringify(scene)}\n`, 'utf8');
}
