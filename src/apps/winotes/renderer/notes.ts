export {};

type NoteColor = 'default' | 'yellow' | 'green' | 'blue' | 'pink' | 'orange';
type QuickNote = {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  updatedAt: number;
  createdAt: number;
};
type WinotesSettings = { notes: QuickNote[] };

type WiNotesApi = {
  getSettings(): Promise<WinotesSettings>;
  upsert(note: Partial<QuickNote> & { id?: string }): Promise<{ ok: boolean; settings?: WinotesSettings }>;
  remove(id: string): Promise<{ ok: boolean; settings?: WinotesSettings }>;
  onSettingsChanged(listener: (settings: WinotesSettings) => void): () => void;
};

type ShellApi = { openPopout(appId: string): Promise<{ ok: boolean }> };

const COLORS: NoteColor[] = ['default', 'yellow', 'green', 'blue', 'pink', 'orange'];

function getNotesApi(): WiNotesApi {
  const existing = (window as unknown as { wiNotes?: WiNotesApi }).wiNotes;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e?: unknown) => void }>();
  const listeners = new Set<(s: WinotesSettings) => void>();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
      settings?: WinotesSettings;
    };
    if (data?.channel === 'wi-notes-settings' && data.settings) {
      for (const listener of listeners) {
        listener(data.settings);
      }
      return;
    }
    if (data?.channel !== 'wi-notes-response' || data.id == null) {
      return;
    }
    const entry = pending.get(data.id);
    if (!entry) {
      return;
    }
    pending.delete(data.id);
    if (data.error) {
      entry.reject(new Error(data.error));
      return;
    }
    entry.resolve(data.result);
  });

  const call = async <T>(method: string, ...args: unknown[]): Promise<T> => {
    const id = (seq += 1);
    return new Promise<T>((resolve, reject) => {
      pending.set(id, { resolve: (v) => resolve(v as T), reject });
      window.parent.postMessage({ channel: 'wi-notes', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    upsert: (note) => call('upsert', note),
    remove: (id) => call('remove', id),
    onSettingsChanged: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function getShellApi(): ShellApi | null {
  const direct = (window as unknown as { wiShell?: ShellApi }).wiShell;
  if (direct) {
    return direct;
  }
  if (window.parent === window) {
    return null;
  }
  return {
    openPopout: (appId) =>
      new Promise((resolve) => {
        const id = Date.now();
        const handler = (event: MessageEvent) => {
          const data = event.data as { channel?: string; id?: number; result?: { ok: boolean } };
          if (data?.channel === 'wi-shell-response' && data.id === id) {
            window.removeEventListener('message', handler);
            resolve(data.result ?? { ok: false });
          }
        };
        window.addEventListener('message', handler);
        window.parent.postMessage({ channel: 'wi-shell', id, method: 'openPopout', args: [appId] }, '*');
      }),
  };
}

const api = getNotesApi();
const grid = document.getElementById('notes-grid') as HTMLDivElement;
const empty = document.getElementById('empty') as HTMLParagraphElement;
const titleEl = document.getElementById('note-title') as HTMLInputElement;
const bodyEl = document.getElementById('note-body') as HTMLTextAreaElement;
const saveBtn = document.getElementById('note-save') as HTMLButtonElement;
const colorPicks = document.getElementById('color-picks') as HTMLDivElement;
const popoutBtn = document.getElementById('popout-btn') as HTMLButtonElement;

let draftColor: NoteColor = 'default';
let notes: QuickNote[] = [];

function renderColorPicks(container: HTMLElement, selected: NoteColor, onPick: (c: NoteColor) => void): void {
  container.innerHTML = '';
  for (const color of COLORS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `swatch${color === selected ? ' active' : ''}`;
    btn.dataset.color = color;
    btn.title = color;
    btn.addEventListener('click', () => onPick(color));
    container.append(btn);
  }
}

function sortedNotes(): QuickNote[] {
  return [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.updatedAt - a.updatedAt;
  });
}

function renderNotes(): void {
  grid.innerHTML = '';
  const list = sortedNotes();
  empty.hidden = list.length > 0;
  for (const note of list) {
    const card = document.createElement('article');
    card.className = `note-card card ${note.color}${note.pinned ? ' pinned' : ''}`;
    const title = document.createElement('input');
    title.value = note.title;
    title.placeholder = 'Title';
    const body = document.createElement('textarea');
    body.value = note.body;
    body.placeholder = 'Note';
    const bar = document.createElement('div');
    bar.className = 'note-actions';
    const colors = document.createElement('div');
    colors.className = 'colors';
    renderColorPicks(colors, note.color, async (color) => {
      const result = await api.upsert({ id: note.id, color });
      if (result.settings) {
        notes = result.settings.notes;
        renderNotes();
      }
    });
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '4px';
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'btn tiny';
    pin.textContent = note.pinned ? 'Unpin' : 'Pin';
    pin.addEventListener('click', async () => {
      const result = await api.upsert({ id: note.id, pinned: !note.pinned });
      if (result.settings) {
        notes = result.settings.notes;
        renderNotes();
      }
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn tiny';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      const result = await api.remove(note.id);
      if (result.settings) {
        notes = result.settings.notes;
        renderNotes();
      }
    });
    let saveTimer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
      saveTimer = setTimeout(async () => {
        const result = await api.upsert({
          id: note.id,
          title: title.value,
          body: body.value,
        });
        if (result.settings) {
          notes = result.settings.notes;
        }
      }, 400);
    };
    title.addEventListener('input', schedule);
    body.addEventListener('input', schedule);
    actions.append(pin, del);
    bar.append(colors, actions);
    card.append(title, body, bar);
    grid.append(card);
  }
}

function refreshComposerSwatches(): void {
  renderColorPicks(colorPicks, draftColor, (color) => {
    draftColor = color;
    refreshComposerSwatches();
  });
}
refreshComposerSwatches();

saveBtn.addEventListener('click', async () => {
  const title = titleEl.value.trim();
  const body = bodyEl.value.trim();
  if (!title && !body) {
    return;
  }
  const result = await api.upsert({ title, body, color: draftColor, pinned: false });
  if (result.settings) {
    notes = result.settings.notes;
    titleEl.value = '';
    bodyEl.value = '';
    draftColor = 'default';
    refreshComposerSwatches();
    renderNotes();
  }
});

popoutBtn.addEventListener('click', async () => {
  if (window.parent === window) {
    return;
  }
  await getShellApi()?.openPopout('winotes');
});

async function init(): Promise<void> {
  notes = (await api.getSettings()).notes;
  renderNotes();
  api.onSettingsChanged((settings) => {
    notes = settings.notes;
    renderNotes();
  });
}

void init();
