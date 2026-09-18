export type NoteColor = 'default' | 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export type QuickNote = {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  updatedAt: number;
  createdAt: number;
};

export type WinotesSettings = {
  notes: QuickNote[];
};

export const NOTE_COLORS: NoteColor[] = ['default', 'yellow', 'green', 'blue', 'pink', 'orange'];

export const DEFAULT_WINOTES_SETTINGS: WinotesSettings = {
  notes: [],
};

export const WINOTES_APP_ID = 'winotes';

export function mergeWinotesSettings(partial?: Partial<WinotesSettings> | null): WinotesSettings {
  if (!partial?.notes || !Array.isArray(partial.notes)) {
    return { notes: [] };
  }
  return {
    notes: partial.notes
      .map((note) => ({
        id: String(note.id || `${Date.now()}`),
        title: String(note.title || ''),
        body: String(note.body || ''),
        color: NOTE_COLORS.includes(note.color as NoteColor) ? (note.color as NoteColor) : 'default',
        pinned: Boolean(note.pinned),
        updatedAt: Number(note.updatedAt) || Date.now(),
        createdAt: Number(note.createdAt) || Date.now(),
      }))
      .slice(0, 200),
  };
}
