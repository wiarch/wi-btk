import { BrowserWindow, clipboard, ipcMain } from 'electron';
import {
  isTranslateLang,
  mergeWitranslateSettings,
  type TranslateLang,
  type WitranslateSettings,
} from '../../../shared/settings/witranslate';
import { disposeOcrWorker, ocrImageBuffer, ocrImageDataUrlDetailed } from './ocrEngine';
import { loadWitranslateSettings, saveWitranslateSettings } from './settingsStore';
import { translateLines, translateText } from './translateEngine';

function broadcast(settings: WitranslateSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('witranslate:settingsChanged', settings);
    }
  }
}

export function setupWitranslateIpc(): void {
  ipcMain.handle('witranslate:getSettings', async () => loadWitranslateSettings());

  ipcMain.handle('witranslate:saveSettings', async (_event, raw: Partial<WitranslateSettings>) => {
    try {
      const current = await loadWitranslateSettings();
      const settings = mergeWitranslateSettings({ ...current, ...raw });
      await saveWitranslateSettings(settings);
      broadcast(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle(
    'witranslate:translate',
    async (
      _event,
      payload: { text: string; from: TranslateLang | 'auto'; fromHint?: TranslateLang; to: TranslateLang },
    ) => {
      const from =
        payload.from === 'auto' || isTranslateLang(payload.from) ? payload.from : 'auto';
      const to = isTranslateLang(payload.to) ? payload.to : 'en';
      const result = await translateText({ text: String(payload.text ?? ''), from, to });
      if (!result.ok) {
        return result;
      }
      try {
        const current = await loadWitranslateSettings();
        const settings = mergeWitranslateSettings({
          ...current,
          sourceLang: from,
          targetLang: to,
          lastSourceText: String(payload.text ?? ''),
          lastTranslatedText: result.text,
        });
        await saveWitranslateSettings(settings);
        broadcast(settings);
      } catch {
        // ignore persist errors
      }
      return result;
    },
  );

  ipcMain.handle(
    'witranslate:translateImage',
    async (
      _event,
      payload: {
        dataUrl?: string;
        from: TranslateLang | 'auto';
        to: TranslateLang;
      },
    ) => {
      const from =
        payload.from === 'auto' || isTranslateLang(payload.from) ? payload.from : 'auto';
      const to = isTranslateLang(payload.to) ? payload.to : 'en';
      // Always OCR with all 3 langs so detection works better
      const ocr = payload.dataUrl
        ? await ocrImageDataUrlDetailed(String(payload.dataUrl), 'auto')
        : { ok: false as const, error: 'Sin imagen' };
      if (!ocr.ok) {
        return ocr;
      }
      if (!ocr.data.text.trim()) {
        return { ok: false as const, error: 'No se detectó texto en la imagen' };
      }

      // Detect + translate in as few requests as possible (avoid Google 429)
      const detectFrom: TranslateLang | 'auto' = from === 'auto' ? 'auto' : from;
      const lineTexts = ocr.data.lines.map((l) => l.text);
      const batch =
        lineTexts.length > 0
          ? await translateLines({ lines: lineTexts, from: detectFrom, to })
          : await translateText({ text: ocr.data.text, from: detectFrom, to }).then((r) =>
              r.ok
                ? {
                    ok: true as const,
                    lines: [r.text],
                    full: r.text,
                    detected: r.detected,
                  }
                : r,
            );

      if (!batch.ok) {
        return { ok: false as const, error: batch.error, ocrText: ocr.data.text };
      }

      const detected = batch.detected;
      const lineResults = ocr.data.lines.map((line, i) => ({
        text: line.text,
        translated: batch.lines[i] ?? line.text,
        x0: line.x0,
        y0: line.y0,
        x1: line.x1,
        y1: line.y1,
      }));

      try {
        const current = await loadWitranslateSettings();
        const settings = mergeWitranslateSettings({
          ...current,
          sourceLang: from === 'auto' && detected ? detected : from,
          targetLang: to,
          lastSourceText: ocr.data.text,
          lastTranslatedText: batch.full,
        });
        await saveWitranslateSettings(settings);
        broadcast(settings);
      } catch {
        // ignore
      }

      return {
        ok: true as const,
        ocrText: ocr.data.text,
        text: batch.full,
        detected,
        width: ocr.data.width,
        height: ocr.data.height,
        lines: lineResults,
      };
    },
  );

  ipcMain.handle('witranslate:clipboardWrite', async (_event, text: string) => {
    clipboard.writeText(String(text ?? ''));
    return { ok: true as const };
  });

  ipcMain.handle('witranslate:clipboardRead', async () => {
    return { ok: true as const, text: clipboard.readText() };
  });

  ipcMain.handle('witranslate:clipboardReadImage', async () => {
    const img = clipboard.readImage();
    if (img.isEmpty()) {
      return { ok: false as const, error: 'No hay imagen en el portapapeles' };
    }
    const png = img.toPNG();
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    return { ok: true as const, dataUrl };
  });

  ipcMain.handle('witranslate:ocrClipboardImage', async (_event, from: TranslateLang | 'auto') => {
    const img = clipboard.readImage();
    if (img.isEmpty()) {
      return { ok: false as const, error: 'No hay imagen en el portapapeles' };
    }
    const hint = from === 'auto' || isTranslateLang(from) ? from : 'auto';
    return ocrImageBuffer(img.toPNG(), hint);
  });
}

export function teardownWitranslate(): void {
  void disposeOcrWorker();
}
