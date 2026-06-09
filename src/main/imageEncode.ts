import { nativeImage, type NativeImage } from 'electron';
import type { AppSettings } from '../shared/settings';

export function getCaptureFileExtension(settings: Pick<AppSettings, 'saveAsJpeg'>): string {
  return settings.saveAsJpeg ? 'jpg' : 'png';
}

export function encodeCaptureForSave(
  input: Buffer | NativeImage,
  settings: Pick<AppSettings, 'saveAsJpeg' | 'jpegQuality'>,
): Buffer {
  const image = Buffer.isBuffer(input) ? nativeImage.createFromBuffer(input) : input;
  const quality = Math.min(100, Math.max(50, Math.round(settings.jpegQuality)));

  if (settings.saveAsJpeg) {
    return image.toJPEG(quality);
  }

  return image.toPNG();
}

export function encodeCaptureForClipboard(input: Buffer | NativeImage): Buffer {
  const image = Buffer.isBuffer(input) ? nativeImage.createFromBuffer(input) : input;
  return image.toPNG();
}
