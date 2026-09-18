import { nativeImage } from 'electron';
import { createWorker, type Worker } from 'tesseract.js';
import type { TranslateLang } from '../../../shared/settings/witranslate';

export type OcrLine = {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type OcrDetailed = {
  text: string;
  width: number;
  height: number;
  lines: OcrLine[];
};

let sharedWorker: Worker | null = null;
let sharedLangs = '';

function tessLangs(hint: TranslateLang | 'auto'): string {
  if (hint === 'es') return 'spa';
  if (hint === 'pt') return 'por';
  if (hint === 'en') return 'eng';
  return 'spa+eng+por';
}

async function getWorker(langs: string): Promise<Worker> {
  if (sharedWorker && sharedLangs === langs) {
    return sharedWorker;
  }
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch {
      // ignore
    }
    sharedWorker = null;
  }
  sharedWorker = await createWorker(langs, 1, {
    logger: () => {
      // no-op
    },
  });
  sharedLangs = langs;
  return sharedWorker;
}

function cleanText(raw: string): string {
  return String(raw ?? '')
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * OCR via Tesseract.js with line boxes for image overlay.
 */
export async function ocrImageBufferDetailed(
  imageBytes: Buffer,
  hintLang: TranslateLang | 'auto' = 'auto',
): Promise<{ ok: true; data: OcrDetailed } | { ok: false; error: string }> {
  if (!imageBytes.length) {
    return { ok: false, error: 'Imagen vacía' };
  }
  if (imageBytes.length > 12 * 1024 * 1024) {
    return { ok: false, error: 'Imagen demasiado grande (máx. 12 MB)' };
  }

  try {
    const img = nativeImage.createFromBuffer(imageBytes);
    const png = img.toPNG();
    if (!png.length) {
      return { ok: false, error: 'No se pudo leer la imagen' };
    }
    const size = img.getSize();
    const langs = tessLangs(hintLang);
    const worker = await getWorker(langs);
    const result = await worker.recognize(png, {}, { blocks: true, text: true });
    const lines: OcrLine[] = [];
    for (const block of result.data.blocks ?? []) {
      for (const para of block.paragraphs ?? []) {
        for (const line of para.lines ?? []) {
          const text = cleanText(line.text);
          if (!text) {
            continue;
          }
          const b = line.bbox;
          lines.push({
            text,
            x0: Math.max(0, Math.floor(b.x0)),
            y0: Math.max(0, Math.floor(b.y0)),
            x1: Math.max(0, Math.ceil(b.x1)),
            y1: Math.max(0, Math.ceil(b.y1)),
          });
        }
      }
    }
    const text = cleanText(result.data.text ?? '') || lines.map((l) => l.text).join('\n');
    return {
      ok: true,
      data: {
        text,
        width: size.width || 0,
        height: size.height || 0,
        lines,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `OCR falló: ${message.slice(0, 280)}` };
  }
}

export async function ocrImageBuffer(
  imageBytes: Buffer,
  hintLang: TranslateLang | 'auto' = 'auto',
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const detailed = await ocrImageBufferDetailed(imageBytes, hintLang);
  if (!detailed.ok) {
    return detailed;
  }
  return { ok: true, text: detailed.data.text };
}

export async function ocrImageDataUrlDetailed(
  dataUrl: string,
  hintLang: TranslateLang | 'auto' = 'auto',
): Promise<{ ok: true; data: OcrDetailed } | { ok: false; error: string }> {
  const match = /^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/s.exec(dataUrl.trim());
  if (!match) {
    return { ok: false, error: 'Formato de imagen inválido' };
  }
  try {
    const buf = Buffer.from(match[1], 'base64');
    return ocrImageBufferDetailed(buf, hintLang);
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function ocrImageDataUrl(
  dataUrl: string,
  hintLang: TranslateLang | 'auto' = 'auto',
): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const detailed = await ocrImageDataUrlDetailed(dataUrl, hintLang);
  if (!detailed.ok) {
    return detailed;
  }
  return { ok: true, text: detailed.data.text };
}

export async function disposeOcrWorker(): Promise<void> {
  if (!sharedWorker) {
    return;
  }
  try {
    await sharedWorker.terminate();
  } catch {
    // ignore
  }
  sharedWorker = null;
  sharedLangs = '';
}
