import { mkdir, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  CAPTURE_SUBFOLDERS,
  type CaptureCategory,
} from '../shared/captureCategory';
import { buildCaptureBasename } from '../shared/filenameFormat';
import { getCaptureFileExtension } from './imageEncode';
import { getRecordingFileExtension, type AppSettings } from '../shared/settings';

export function getBaseSaveDirectory(settings: AppSettings): string {
  const custom = settings.saveDirectory.trim();
  if (custom) {
    return custom;
  }
  return join(homedir(), 'Pictures', 'WI-Rec');
}

async function nextSequentialIndex(targetDir: string): Promise<number> {
  const entries = await readdir(targetDir).catch(() => [] as string[]);
  let max = 0;

  for (const name of entries) {
    const match = name.match(/^WI-Rec-(\d+)\.[^.]+$/i);
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10));
    }
  }

  return max + 1;
}

export async function buildCaptureSavePath(
  settings: AppSettings,
  category: CaptureCategory,
): Promise<string> {
  const base = getBaseSaveDirectory(settings);
  const targetDir = settings.useCaptureSubfolders
    ? join(base, CAPTURE_SUBFOLDERS[category])
    : base;

  await mkdir(targetDir, { recursive: true });

  const ext = getCaptureFileExtension(settings);
  const sequentialIndex =
    settings.filenameMode === 'sequential' ? await nextSequentialIndex(targetDir) : 1;
  const basename = buildCaptureBasename(settings, sequentialIndex);

  return join(targetDir, `${basename}.${ext}`);
}

export async function buildRecordingSavePath(settings: AppSettings): Promise<string> {
  const base = getBaseSaveDirectory(settings);
  const targetDir = settings.useCaptureSubfolders
    ? join(base, CAPTURE_SUBFOLDERS.grabacion)
    : base;

  await mkdir(targetDir, { recursive: true });

  const sequentialIndex =
    settings.filenameMode === 'sequential' ? await nextSequentialIndex(targetDir) : 1;
  const basename = buildCaptureBasename(settings, sequentialIndex);

  const ext = getRecordingFileExtension(settings.recordFormat);
  return join(targetDir, `${basename}.${ext}`);
}
