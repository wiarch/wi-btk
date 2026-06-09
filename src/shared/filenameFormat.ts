import type { AppSettings } from './settings';

export type FilenameMode = 'datetime' | 'sequential';
export type FilenameDateStyle = 'iso' | 'latin';
export type FilenameTimeStyle = 'h24' | 'h12';

const APP_PREFIX = 'WI-Print';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDatePart(date: Date, style: FilenameDateStyle): string {
  const year = date.getFullYear();
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  return style === 'latin' ? `${day}-${month}-${year}` : `${year}-${month}-${day}`;
}

export function formatTimePart(date: Date, style: FilenameTimeStyle): string {
  if (style === 'h24') {
    return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
  }

  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  return `${pad2(hours12)}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())} ${suffix}`;
}

export function buildCaptureBasename(
  settings: Pick<AppSettings, 'filenameMode' | 'filenameDateStyle' | 'filenameTimeStyle'>,
  sequentialIndex: number,
  now: Date = new Date(),
): string {
  if (settings.filenameMode === 'sequential') {
    return `${APP_PREFIX}-${sequentialIndex}`;
  }

  const datePart = formatDatePart(now, settings.filenameDateStyle);
  const timePart = formatTimePart(now, settings.filenameTimeStyle);
  return `${APP_PREFIX}-${datePart}_${timePart}`;
}

export function buildCaptureFilename(
  settings: Pick<
    AppSettings,
    'filenameMode' | 'filenameDateStyle' | 'filenameTimeStyle' | 'saveAsJpeg'
  >,
  sequentialIndex: number,
  now: Date = new Date(),
): string {
  const ext = settings.saveAsJpeg ? 'jpg' : 'png';
  return `${buildCaptureBasename(settings, sequentialIndex, now)}.${ext}`;
}

export function previewCaptureFilename(
  settings: Pick<
    AppSettings,
    'filenameMode' | 'filenameDateStyle' | 'filenameTimeStyle' | 'saveAsJpeg'
  >,
  now: Date = new Date(),
): string {
  return buildCaptureFilename(settings, 1, now);
}
