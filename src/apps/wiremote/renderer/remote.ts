export {};

type WiremoteSettings = {
  port: number;
  allowControl: boolean;
  quality: number;
  fps: number;
};

type WiRemoteApi = {
  getSettings(): Promise<WiremoteSettings>;
  saveSettings(settings: Partial<WiremoteSettings>): Promise<{ ok: boolean; settings?: WiremoteSettings }>;
  getInfo(): Promise<{ addresses: string[]; port: number; role: string; inputReady: boolean }>;
  hostStart(): Promise<{ ok: boolean; pin?: string; port?: number; addresses?: string[]; error?: string }>;
  connect(payload: { host: string; port?: number; pin: string }): Promise<{ ok: boolean; error?: string }>;
  stop(): Promise<{ ok: boolean }>;
  sendInput(payload: unknown): void;
  notify(message: string): void;
  onStatus?(listener: (status: string) => void): () => void;
  onConnected?(listener: (role: string) => void): () => void;
  onDisconnected?(listener: () => void): () => void;
  onFrame?(listener: (frame: { data: string; width: number; height: number }) => void): () => void;
  onError?(listener: (message: string) => void): () => void;
  onSettingsChanged?(listener: (settings: WiremoteSettings) => void): () => void;
};

type ShellApi = { openPopout(appId: string): Promise<{ ok: boolean }> };

const hostAddress = document.getElementById('host-address') as HTMLDivElement;
const hostPin = document.getElementById('host-pin') as HTMLDivElement;
const allowControl = document.getElementById('allow-control') as HTMLInputElement;
const hostStartBtn = document.getElementById('host-start') as HTMLButtonElement;
const hostStopBtn = document.getElementById('host-stop') as HTMLButtonElement;
const guestHost = document.getElementById('guest-host') as HTMLInputElement;
const guestPort = document.getElementById('guest-port') as HTMLInputElement;
const guestPin = document.getElementById('guest-pin') as HTMLInputElement;
const guestConnectBtn = document.getElementById('guest-connect') as HTMLButtonElement;
const guestStopBtn = document.getElementById('guest-stop') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLSpanElement;
const viewerEmpty = document.getElementById('viewer-empty') as HTMLParagraphElement;
const remoteFrame = document.getElementById('remote-frame') as HTMLImageElement;
const popoutBtn = document.getElementById('popout-btn') as HTMLButtonElement;

const state = {
  settings: null as WiremoteSettings | null,
  mode: 'idle' as 'idle' | 'host' | 'guest',
  connected: false,
};

let reqId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function bridgeCall(method: string, args: unknown[] = []): Promise<unknown> {
  const api = (window as unknown as { wiRemote?: Record<string, (...a: unknown[]) => unknown> }).wiRemote;
  if (api && typeof api[method] === 'function') {
    return Promise.resolve(api[method](...args));
  }
  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ channel: 'wi-remote', id, method, args }, '*');
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('WI-Remote bridge timeout'));
      }
    }, 20_000);
  });
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as {
    channel?: string;
    id?: number;
    result?: unknown;
    error?: string;
    status?: string;
    role?: string;
    message?: string;
    frame?: { data: string; width: number; height: number };
    settings?: WiremoteSettings;
  };

  if (data?.channel === 'wi-remote-response' && typeof data.id === 'number') {
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.error) entry.reject(new Error(data.error));
    else entry.resolve(data.result);
    return;
  }

  if (data?.channel === 'wi-remote-status' && data.status) {
    setStatus(data.status);
    return;
  }
  if (data?.channel === 'wi-remote-connected' && data.role) {
    onConnected(data.role);
    return;
  }
  if (data?.channel === 'wi-remote-disconnected') {
    onDisconnected();
    return;
  }
  if (data?.channel === 'wi-remote-error' && data.message) {
    setStatus(data.message);
    return;
  }
  if (data?.channel === 'wi-remote-frame' && data.frame) {
    showFrame(data.frame);
    return;
  }
  if (data?.channel === 'wi-remote-settings' && data.settings) {
    state.settings = data.settings;
    guestPort.value = String(data.settings.port);
    allowControl.checked = data.settings.allowControl;
  }
});

async function getApi(): Promise<WiRemoteApi> {
  const existing = (window as unknown as { wiRemote?: WiRemoteApi }).wiRemote;
  if (existing) return existing;
  return {
    getSettings: () => bridgeCall('getSettings') as Promise<WiremoteSettings>,
    saveSettings: (settings) =>
      bridgeCall('saveSettings', [settings]) as Promise<{ ok: boolean; settings?: WiremoteSettings }>,
    getInfo: () =>
      bridgeCall('getInfo') as Promise<{
        addresses: string[];
        port: number;
        role: string;
        inputReady: boolean;
      }>,
    hostStart: () =>
      bridgeCall('hostStart') as Promise<{
        ok: boolean;
        pin?: string;
        port?: number;
        addresses?: string[];
        error?: string;
      }>,
    connect: (payload) =>
      bridgeCall('connect', [payload]) as Promise<{ ok: boolean; error?: string }>,
    stop: () => bridgeCall('stop') as Promise<{ ok: boolean }>,
    sendInput: (payload) => {
      void bridgeCall('sendInput', [payload]);
    },
    notify: (message) => {
      void bridgeCall('notify', [message]);
    },
  };
}

function setStatus(text: string): void {
  statusEl.textContent = text;
  statusEl.classList.toggle('live', /conect/i.test(text) || /compart/i.test(text));
}

function setMode(mode: 'idle' | 'host' | 'guest'): void {
  state.mode = mode;
  hostStartBtn.disabled = mode !== 'idle';
  hostStopBtn.disabled = mode !== 'host';
  guestConnectBtn.disabled = mode !== 'idle';
  guestStopBtn.disabled = mode !== 'guest';
  allowControl.disabled = mode !== 'idle';
}

function onConnected(role: string): void {
  state.connected = true;
  if (role === 'guest') {
    setMode('guest');
    setStatus('Conectado — controlá con el mouse');
  } else {
    setMode('host');
    setStatus('Cliente conectado — compartiendo');
  }
}

function onDisconnected(): void {
  state.connected = false;
  remoteFrame.classList.add('hidden');
  viewerEmpty.classList.remove('hidden');
  if (state.mode === 'guest') {
    setMode('idle');
    setStatus('Desconectado');
  } else if (state.mode === 'host') {
    setStatus('Esperando cliente…');
  }
}

function showFrame(frame: { data: string; width: number; height: number }): void {
  viewerEmpty.classList.add('hidden');
  remoteFrame.classList.remove('hidden');
  remoteFrame.src = `data:image/jpeg;base64,${frame.data}`;
}

function normPoint(event: MouseEvent): { x: number; y: number } | null {
  const rect = remoteFrame.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}

function buttonName(button: number): 'left' | 'right' | 'middle' {
  if (button === 2) return 'right';
  if (button === 1) return 'middle';
  return 'left';
}

async function refreshInfo(): Promise<void> {
  const api = await getApi();
  const info = await api.getInfo();
  const addr = info.addresses[0] ?? '127.0.0.1';
  hostAddress.textContent = `${addr}:${info.port}`;
  guestPort.value = String(info.port);
}

hostStartBtn.addEventListener('click', async () => {
  const api = await getApi();
  if (state.settings) {
    await api.saveSettings({
      ...state.settings,
      allowControl: allowControl.checked,
      port: Number(guestPort.value) || state.settings.port,
    });
  }
  const result = await api.hostStart();
  if (!result.ok) {
    setStatus(result.error ?? 'No se pudo iniciar host');
    return;
  }
  setMode('host');
  hostPin.textContent = result.pin ?? '----';
  const addr = result.addresses?.[0] ?? '127.0.0.1';
  hostAddress.textContent = `${addr}:${result.port}`;
  setStatus('Esperando cliente…');
});

hostStopBtn.addEventListener('click', async () => {
  const api = await getApi();
  await api.stop();
  hostPin.textContent = '----';
  setMode('idle');
  setStatus('Inactivo');
  await refreshInfo();
});

guestConnectBtn.addEventListener('click', async () => {
  const api = await getApi();
  const result = await api.connect({
    host: guestHost.value.trim(),
    port: Number(guestPort.value) || 19876,
    pin: guestPin.value.trim(),
  });
  if (!result.ok) {
    setStatus(result.error ?? 'No se pudo conectar');
    return;
  }
  setMode('guest');
  setStatus('Conectando…');
});

guestStopBtn.addEventListener('click', async () => {
  const api = await getApi();
  await api.stop();
  setMode('idle');
  setStatus('Inactivo');
});

let lastMoveSent = 0;
remoteFrame.addEventListener('mousemove', async (event) => {
  if (state.mode !== 'guest' || !state.connected) return;
  const now = Date.now();
  if (now - lastMoveSent < 33) return;
  lastMoveSent = now;
  const point = normPoint(event);
  if (!point) return;
  const api = await getApi();
  api.sendInput({ type: 'move', ...point });
});

remoteFrame.addEventListener('mousedown', async (event) => {
  if (state.mode !== 'guest' || !state.connected) return;
  event.preventDefault();
  const point = normPoint(event);
  if (!point) return;
  const api = await getApi();
  api.sendInput({ type: 'down', button: buttonName(event.button), ...point });
});

remoteFrame.addEventListener('mouseup', async (event) => {
  if (state.mode !== 'guest' || !state.connected) return;
  event.preventDefault();
  const point = normPoint(event);
  if (!point) return;
  const api = await getApi();
  api.sendInput({ type: 'up', button: buttonName(event.button), ...point });
});

remoteFrame.addEventListener('wheel', async (event) => {
  if (state.mode !== 'guest' || !state.connected) return;
  event.preventDefault();
  const point = normPoint(event);
  if (!point) return;
  const api = await getApi();
  api.sendInput({ type: 'wheel', deltaY: event.deltaY, ...point });
}, { passive: false });

remoteFrame.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', async (event) => {
  if (state.mode !== 'guest' || !state.connected) return;
  if (event.target instanceof HTMLInputElement) return;
  event.preventDefault();
  const api = await getApi();
  api.sendInput({ type: 'key', action: 'down', key: event.key, code: event.code });
});

window.addEventListener('keyup', async (event) => {
  if (state.mode !== 'guest' || !state.connected) return;
  if (event.target instanceof HTMLInputElement) return;
  event.preventDefault();
  const api = await getApi();
  api.sendInput({ type: 'key', action: 'up', key: event.key, code: event.code });
});

popoutBtn.addEventListener('click', async () => {
  const shell = (window as unknown as { wiShell?: ShellApi }).wiShell;
  if (shell) {
    await shell.openPopout('wiremote');
    return;
  }
  window.parent.postMessage({ channel: 'wi-shell', method: 'openPopout', args: ['wiremote'] }, '*');
});

async function boot(): Promise<void> {
  const api = await getApi();
  const settings = await api.getSettings();
  state.settings = settings;
  allowControl.checked = settings.allowControl;
  guestPort.value = String(settings.port);
  await refreshInfo();
  setStatus('Inactivo');

  api.onStatus?.((status) => setStatus(status));
  api.onConnected?.((role) => onConnected(role));
  api.onDisconnected?.(() => onDisconnected());
  api.onFrame?.((frame) => showFrame(frame));
  api.onError?.((message) => setStatus(message));
  api.onSettingsChanged?.((next) => {
    state.settings = next;
    guestPort.value = String(next.port);
    allowControl.checked = next.allowControl;
  });
}

void boot();
