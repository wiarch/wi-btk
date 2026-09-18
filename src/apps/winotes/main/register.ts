import { BrowserWindow, ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import { loadWinotesSettings, saveWinotesSettings } from './settingsStore';
import {
  mergeWinotesSettings,
  type QuickNote,
  type WinotesSettings,
  type NoteColor,
  NOTE_COLORS,
} from '../../../shared/settings/winotes';

function broadcast(settings: WinotesSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('winotes:settingsChanged', settings);
    }
  }
}

export function setupWinotesIpc(): void {
  ipcMain.handle('winotes:getSettings', async () => loadWinotesSettings());

  ipcMain.handle('winotes:saveSettings', async (_event, raw: Partial<WinotesSettings>) => {
    try {
      const settings = mergeWinotesSettings(raw);
      await saveWinotesSettings(settings);
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
    'winotes:upsert',
    async (_event, note: Partial<QuickNote> & { id?: string }) => {
      const settings = await loadWinotesSettings();
      const now = Date.now();
      const color: NoteColor = NOTE_COLORS.includes(note.color as NoteColor)
        ? (note.color as NoteColor)
        : 'default';
      if (note.id) {
        const index = settings.notes.findIndex((item) => item.id === note.id);
        if (index >= 0) {
          settings.notes[index] = {
            ...settings.notes[index],
            title: note.title ?? settings.notes[index].title,
            body: note.body ?? settings.notes[index].body,
            color,
            pinned: note.pinned ?? settings.notes[index].pinned,
            updatedAt: now,
          };
        }
      } else {
        settings.notes.unshift({
          id: `${now}-${Math.random().toString(36).slice(2, 6)}`,
          title: String(note.title || ''),
          body: String(note.body || ''),
          color,
          pinned: Boolean(note.pinned),
          createdAt: now,
          updatedAt: now,
        });
      }
      await saveWinotesSettings(settings);
      broadcast(settings);
      return { ok: true as const, settings };
    },
  );

  ipcMain.handle('winotes:remove', async (_event, id: string) => {
    const settings = await loadWinotesSettings();
    settings.notes = settings.notes.filter((note) => note.id !== id);
    await saveWinotesSettings(settings);
    broadcast(settings);
    return { ok: true as const, settings };
  });

  ipcMain.on('winotes:notify', (_event, message: string) => {
    notifySimple('WI-Notes', String(message));
  });
}

export function teardownWinotes(): void {
  // no workers
}
