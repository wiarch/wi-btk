export {};

type MediaKind = 'image' | 'video' | 'audio';

type WiviewRecentItem = {
  path: string;
  name: string;
  kind: MediaKind;
  openedAt: number;
};

type WiviewSettings = {
  hotkey: string;
  hotkeyEnabled: boolean;
  recent: WiviewRecentItem[];
  volume: number;
  lastFolder: string;
};

type ResolvedMedia = {
  ok: boolean;
  path?: string;
  name?: string;
  kind?: MediaKind;
  url?: string;
  error?: string;
};

type WiViewApi = {
  getSettings(): Promise<WiviewSettings>;
  saveSettings(settings: Partial<WiviewSettings>): Promise<{ ok: boolean; settings?: WiviewSettings }>;
  pickFiles(): Promise<{ ok: boolean; paths: string[] }>;
  resolveMedia(path: string): Promise<ResolvedMedia>;
  clearRecent(): Promise<{ ok: boolean; settings?: WiviewSettings }>;
  notify(message: string): void;
  onSettingsChanged?(listener: (settings: WiviewSettings) => void): () => void;
  onOpenFiles?(listener: (paths: string[]) => void): () => void;
};

type ShellApi = { openPopout(appId: string): Promise<{ ok: boolean }> };

const openBtn = document.getElementById('open-btn') as HTMLButtonElement;
const popoutBtn = document.getElementById('popout-btn') as HTMLButtonElement;
const clearRecentBtn = document.getElementById('clear-recent') as HTMLButtonElement;
const recentList = document.getElementById('recent-list') as HTMLDivElement;
const hotkeyHint = document.getElementById('hotkey-hint') as HTMLParagraphElement;
const emptyEl = document.getElementById('empty') as HTMLDivElement;
const imageStage = document.getElementById('image-stage') as HTMLDivElement;
const videoStage = document.getElementById('video-stage') as HTMLDivElement;
const audioStage = document.getElementById('audio-stage') as HTMLDivElement;
const imageEl = document.getElementById('image-el') as HTMLImageElement;
const videoEl = document.getElementById('video-el') as HTMLVideoElement;
const audioEl = document.getElementById('audio-el') as HTMLAudioElement;
const audioTitle = document.getElementById('audio-title') as HTMLParagraphElement;
const transport = document.getElementById('transport') as HTMLDivElement;
const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
const playBtn = document.getElementById('play-btn') as HTMLButtonElement;
const nextBtn = document.getElementById('next-btn') as HTMLButtonElement;
const nowPlaying = document.getElementById('now-playing') as HTMLSpanElement;
const volumeInput = document.getElementById('volume') as HTMLInputElement;
const stage = document.querySelector('.stage') as HTMLElement;

const state = {
  settings: null as WiviewSettings | null,
  playlist: [] as Array<{ path: string; name: string; kind: MediaKind; url: string }>,
  index: -1,
};

let reqId = 1;
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();

function bridgeCall(method: string, args: unknown[] = []): Promise<unknown> {
  const api = (window as unknown as { wiView?: Record<string, (...a: unknown[]) => unknown> }).wiView;
  if (api && typeof api[method] === 'function') {
    return Promise.resolve(api[method](...args));
  }

  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ channel: 'wi-view', id, method, args }, '*');
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('WI-View bridge timeout'));
      }
    }, 30_000);
  });
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as {
    channel?: string;
    id?: number;
    result?: unknown;
    error?: string;
    settings?: WiviewSettings;
    paths?: string[];
  };

  if (data?.channel === 'wi-view-response' && typeof data.id === 'number') {
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.error) {
      entry.reject(new Error(data.error));
      return;
    }
    entry.resolve(data.result);
    return;
  }

  if (data?.channel === 'wi-view-settings' && data.settings) {
    applySettings(data.settings);
    return;
  }

  if (data?.channel === 'wi-view-open' && Array.isArray(data.paths)) {
    void openPaths(data.paths);
  }
});

async function getApi(): Promise<WiViewApi> {
  const existing = (window as unknown as { wiView?: WiViewApi }).wiView;
  if (existing) {
    return existing;
  }
  return {
    getSettings: () => bridgeCall('getSettings') as Promise<WiviewSettings>,
    saveSettings: (settings) =>
      bridgeCall('saveSettings', [settings]) as Promise<{ ok: boolean; settings?: WiviewSettings }>,
    pickFiles: () => bridgeCall('pickFiles') as Promise<{ ok: boolean; paths: string[] }>,
    resolveMedia: (path) => bridgeCall('resolveMedia', [path]) as Promise<ResolvedMedia>,
    clearRecent: () => bridgeCall('clearRecent') as Promise<{ ok: boolean; settings?: WiviewSettings }>,
    notify: (message) => {
      void bridgeCall('notify', [message]);
    },
  };
}

function kindIcon(kind: MediaKind): string {
  if (kind === 'image') return '🖼';
  if (kind === 'video') return '🎬';
  return '🎵';
}

function stopMedia(): void {
  videoEl.pause();
  audioEl.pause();
  videoEl.removeAttribute('src');
  audioEl.removeAttribute('src');
  videoEl.load();
  audioEl.load();
  imageEl.removeAttribute('src');
  audioStage.classList.remove('playing');
}

function showKind(kind: MediaKind | null): void {
  emptyEl.classList.toggle('hidden', Boolean(kind));
  imageStage.classList.toggle('hidden', kind !== 'image');
  videoStage.classList.toggle('hidden', kind !== 'video');
  audioStage.classList.toggle('hidden', kind !== 'audio');
  transport.classList.toggle('hidden', !kind);
}

function syncPlayButton(): void {
  const item = state.playlist[state.index];
  if (!item) {
    playBtn.textContent = '▶';
    return;
  }
  if (item.kind === 'image') {
    playBtn.textContent = '▶';
    return;
  }
  const el = item.kind === 'video' ? videoEl : audioEl;
  playBtn.textContent = el.paused ? '▶' : '❚❚';
  audioStage.classList.toggle('playing', item.kind === 'audio' && !el.paused);
}

async function showIndex(index: number): Promise<void> {
  if (index < 0 || index >= state.playlist.length) {
    return;
  }
  state.index = index;
  const item = state.playlist[index];
  stopMedia();
  showKind(item.kind);
  nowPlaying.textContent = item.name;
  renderRecent();

  if (item.kind === 'image') {
    imageEl.src = item.url;
    imageEl.alt = item.name;
  } else if (item.kind === 'video') {
    videoEl.src = item.url;
    videoEl.volume = Number(volumeInput.value) / 100;
    void videoEl.play().catch(() => undefined);
  } else {
    audioTitle.textContent = item.name;
    audioEl.src = item.url;
    audioEl.volume = Number(volumeInput.value) / 100;
    void audioEl.play().catch(() => undefined);
  }
  syncPlayButton();
}

async function openPaths(paths: string[]): Promise<void> {
  if (!paths.length) return;
  const api = await getApi();
  const next = [];
  for (const path of paths) {
    const resolved = await api.resolveMedia(path);
    if (resolved.ok && resolved.path && resolved.name && resolved.kind && resolved.url) {
      next.push({
        path: resolved.path,
        name: resolved.name,
        kind: resolved.kind,
        url: resolved.url,
      });
    }
  }
  if (!next.length) {
    api.notify('Archivo no soportado');
    return;
  }
  state.playlist = next;
  await showIndex(0);
}

function applySettings(settings: WiviewSettings): void {
  state.settings = settings;
  volumeInput.value = String(Math.round(settings.volume * 100));
  videoEl.volume = settings.volume;
  audioEl.volume = settings.volume;
  hotkeyHint.textContent = settings.hotkeyEnabled
    ? `Atajo: ${settings.hotkey}`
    : 'Atajo desactivado';
  renderRecent();
}

function renderRecent(): void {
  recentList.innerHTML = '';
  const items = state.settings?.recent ?? [];
  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Sin recientes';
    recentList.append(empty);
    return;
  }

  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'recent-item';
    if (state.playlist[state.index]?.path === item.path) {
      btn.classList.add('active');
    }
    btn.innerHTML = `<span class="kind">${kindIcon(item.kind)}</span><span class="name"></span>`;
    (btn.querySelector('.name') as HTMLSpanElement).textContent = item.name;
    btn.title = item.path;
    btn.addEventListener('click', () => {
      void openPaths([item.path]);
    });
    recentList.append(btn);
  }
}

async function persistVolume(): Promise<void> {
  if (!state.settings) return;
  const api = await getApi();
  const volume = Number(volumeInput.value) / 100;
  await api.saveSettings({ ...state.settings, volume });
}

openBtn.addEventListener('click', async () => {
  const api = await getApi();
  const result = await api.pickFiles();
  if (result.paths?.length) {
    await openPaths(result.paths);
  }
});

popoutBtn.addEventListener('click', async () => {
  const shell = (window as unknown as { wiShell?: ShellApi }).wiShell;
  if (shell) {
    await shell.openPopout('wiview');
    return;
  }
  window.parent.postMessage({ channel: 'wi-shell', method: 'openPopout', args: ['wiview'] }, '*');
});

clearRecentBtn.addEventListener('click', async () => {
  const api = await getApi();
  const result = await api.clearRecent();
  if (result.settings) {
    applySettings(result.settings);
  }
});

prevBtn.addEventListener('click', () => {
  if (state.playlist.length < 2) return;
  const next = (state.index - 1 + state.playlist.length) % state.playlist.length;
  void showIndex(next);
});

nextBtn.addEventListener('click', () => {
  if (state.playlist.length < 2) return;
  const next = (state.index + 1) % state.playlist.length;
  void showIndex(next);
});

playBtn.addEventListener('click', () => {
  const item = state.playlist[state.index];
  if (!item || item.kind === 'image') return;
  const el = item.kind === 'video' ? videoEl : audioEl;
  if (el.paused) {
    void el.play();
  } else {
    el.pause();
  }
  syncPlayButton();
});

volumeInput.addEventListener('input', () => {
  const volume = Number(volumeInput.value) / 100;
  videoEl.volume = volume;
  audioEl.volume = volume;
});

volumeInput.addEventListener('change', () => {
  void persistVolume();
});

videoEl.addEventListener('play', syncPlayButton);
videoEl.addEventListener('pause', syncPlayButton);
audioEl.addEventListener('play', syncPlayButton);
audioEl.addEventListener('pause', syncPlayButton);

window.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') {
    prevBtn.click();
  } else if (event.key === 'ArrowRight') {
    nextBtn.click();
  } else if (event.key === ' ') {
    event.preventDefault();
    playBtn.click();
  } else if (event.key.toLowerCase() === 'o' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    openBtn.click();
  }
});

['dragenter', 'dragover'].forEach((type) => {
  stage.addEventListener(type, (event) => {
    event.preventDefault();
    stage.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((type) => {
  stage.addEventListener(type, (event) => {
    event.preventDefault();
    stage.classList.remove('dragover');
  });
});

stage.addEventListener('drop', (event) => {
  const drag = event as DragEvent;
  const files = [...(drag.dataTransfer?.files ?? [])];
  // File.path is available in Electron
  const paths = files
    .map((file) => (file as File & { path?: string }).path)
    .filter((path): path is string => Boolean(path));
  if (paths.length) {
    void openPaths(paths);
  }
});

async function boot(): Promise<void> {
  const api = await getApi();
  const settings = await api.getSettings();
  applySettings(settings);

  api.onSettingsChanged?.((next) => applySettings(next));
  api.onOpenFiles?.((paths) => {
    void openPaths(paths);
  });
}

void boot();
