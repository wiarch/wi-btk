type WideviceHotkeyAction = 'switchPlayback' | 'switchRecording' | 'switchCamera';

export {};

type AudioEndpoint = {
  id: string;
  name: string;
  isDefault: boolean;
  kind: 'playback' | 'recording';
};

type CameraDevice = {
  id: string;
  name: string;
  isDefault: boolean;
};

type WideviceSettings = {
  hotkeys: Record<WideviceHotkeyAction, string>;
  hotkeysEnabled: boolean;
  enabledPlaybackIds: string[];
  enabledRecordingIds: string[];
  enabledCameraIds: string[];
  lastPlaybackId: string;
  lastRecordingId: string;
  lastCameraId: string;
};

type WiDeviceApi = {
  getSettings(): Promise<WideviceSettings>;
  saveSettings(settings: WideviceSettings): Promise<{ ok: true } | { ok: false; error: string }>;
  listPlayback(): Promise<AudioEndpoint[]>;
  listRecording(): Promise<AudioEndpoint[]>;
  setPlayback(id: string): Promise<{ ok: boolean; error?: string }>;
  setRecording(id: string): Promise<{ ok: boolean; error?: string }>;
  notify(message: string): void;
};

declare global {
  interface Window {
    wiDevice?: WiDeviceApi;
  }
}

function getApi(): WiDeviceApi {
  if (window.wiDevice) {
    return window.wiDevice;
  }

  let seq = 0;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  >();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
    };
    if (data?.channel !== 'wi-device-response' || data.id == null) {
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
      pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      window.parent.postMessage({ channel: 'wi-device', id, method, args }, '*');
    });
  };

  return {
    getSettings: () => call('getSettings'),
    saveSettings: (value) => call('saveSettings', value),
    listPlayback: () => call('listPlayback'),
    listRecording: () => call('listRecording'),
    setPlayback: (id) => call('setPlayback', id),
    setRecording: (id) => call('setRecording', id),
    notify: (message) => {
      window.parent.postMessage(
        { channel: 'wi-device', method: 'notify', args: [message] },
        '*',
      );
    },
  };
}

const api = getApi();


const statusEl = document.getElementById('device-status') as HTMLParagraphElement;
const hotkeysEnabled = document.getElementById('hotkeys-enabled') as HTMLInputElement;
const hkPlayback = document.getElementById('hk-playback') as HTMLInputElement;
const hkRecording = document.getElementById('hk-recording') as HTMLInputElement;
const hkCamera = document.getElementById('hk-camera') as HTMLInputElement;

let settings: WideviceSettings | null = null;
let playback: AudioEndpoint[] = [];
let recording: AudioEndpoint[] = [];
let cameras: CameraDevice[] = [];
let recordingHotkey: WideviceHotkeyAction | null = null;
let recordingInput: HTMLInputElement | null = null;

function setStatus(message: string, kind: '' | 'ok' | 'error' = ''): void {
  statusEl.textContent = message;
  statusEl.className = `status${kind ? ` ${kind}` : ''}`;
}

function formatHotkey(value: string): string {
  return value.replace(/CommandOrControl/g, 'Ctrl').replace(/\+/g, ' + ');
}

function eventToAccelerator(event: KeyboardEvent): string | null {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) {
    return null;
  }
  const parts: string[] = [];
  if (event.ctrlKey) {
    parts.push('Control');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }
  if (event.metaKey) {
    parts.push('Super');
  }
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  parts.push(key === ' ' ? 'Space' : key);
  return parts.join('+');
}

async function persist(): Promise<void> {
  if (!settings) {
    return;
  }
  const result = await api.saveSettings(settings);
  if (!result.ok) {
    setStatus(result.error, 'error');
    return;
  }
  setStatus('Saved', 'ok');
}

function renderAudioList(
  kind: 'playback' | 'recording',
  devices: AudioEndpoint[],
  enabledIds: string[],
  listEl: HTMLElement,
  emptyEl: HTMLElement,
): void {
  listEl.innerHTML = '';
  emptyEl.hidden = devices.length > 0;
  for (const device of devices) {
    const enabled = enabledIds.length === 0 || enabledIds.includes(device.id);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `device-row${device.isDefault ? ' is-default' : ''}`;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = enabled;
    check.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    check.addEventListener('change', () => {
      if (!settings) {
        return;
      }
      const key = kind === 'playback' ? 'enabledPlaybackIds' : 'enabledRecordingIds';
      const current =
        settings[key].length === 0 ? devices.map((item) => item.id) : [...settings[key]];
      if (check.checked) {
        if (!current.includes(device.id)) {
          current.push(device.id);
        }
      } else {
        const next = current.filter((id) => id !== device.id);
        settings[key] = next.length === devices.length ? [] : next;
        void persist();
        return;
      }
      settings[key] = current.length === devices.length ? [] : current;
      void persist();
    });

    const ico = document.createElement('span');
    ico.className = 'device-ico';
    ico.textContent = kind === 'playback' ? '▶' : '●';

    const name = document.createElement('span');
    name.className = 'device-name';
    name.textContent = device.name;

    const badge = document.createElement('span');
    badge.className = 'device-badge';
    badge.textContent = device.isDefault ? 'Default' : '';

    row.append(check, ico, name, badge);
    row.addEventListener('click', () => {
      void setAudioDevice(kind, device.id);
    });
    listEl.append(row);
  }
}

function renderCameraList(): void {
  const listEl = document.getElementById('camera-list') as HTMLElement;
  const emptyEl = document.getElementById('camera-empty') as HTMLElement;
  listEl.innerHTML = '';
  emptyEl.hidden = cameras.length > 0;
  if (!settings) {
    return;
  }

  for (const device of cameras) {
    const enabled =
      settings.enabledCameraIds.length === 0 || settings.enabledCameraIds.includes(device.id);
    const isDefault = settings.lastCameraId === device.id || device.isDefault;
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `device-row${isDefault ? ' is-default' : ''}`;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = enabled;
    check.addEventListener('click', (event) => event.stopPropagation());
    check.addEventListener('change', () => {
      if (!settings) {
        return;
      }
      const current =
        settings.enabledCameraIds.length === 0
          ? cameras.map((item) => item.id)
          : [...settings.enabledCameraIds];
      if (check.checked) {
        if (!current.includes(device.id)) {
          current.push(device.id);
        }
      } else {
        settings.enabledCameraIds = current.filter((id) => id !== device.id);
        void persist();
        return;
      }
      settings.enabledCameraIds = current.length === cameras.length ? [] : current;
      void persist();
    });

    const ico = document.createElement('span');
    ico.className = 'device-ico';
    ico.textContent = '▣';

    const name = document.createElement('span');
    name.className = 'device-name';
    name.textContent = device.name;

    const badge = document.createElement('span');
    badge.className = 'device-badge';
    badge.textContent = isDefault ? 'Preferred' : '';

    row.append(check, ico, name, badge);
    row.addEventListener('click', () => {
      if (!settings) {
        return;
      }
      settings.lastCameraId = device.id;
      cameras = cameras.map((item) => ({ ...item, isDefault: item.id === device.id }));
      void persist();
      renderCameraList();
      setStatus(`Preferred camera: ${device.name}`, 'ok');
      api.notify(`Camera: ${device.name}`);
    });
    listEl.append(row);
  }
}

async function setAudioDevice(kind: 'playback' | 'recording', id: string): Promise<void> {
  const result =
    kind === 'playback' ? await api.setPlayback(id) : await api.setRecording(id);
  if (!result.ok) {
    setStatus(result.error ?? 'Failed to switch device', 'error');
    return;
  }
  if (settings) {
    if (kind === 'playback') {
      settings.lastPlaybackId = id;
    } else {
      settings.lastRecordingId = id;
    }
    await persist();
  }
  await refreshAudio(kind);
  const device = (kind === 'playback' ? playback : recording).find((item) => item.id === id);
  setStatus(`Default ${kind}: ${device?.name ?? id}`, 'ok');
}

async function refreshAudio(kind?: 'playback' | 'recording'): Promise<void> {
  if (!settings) {
    return;
  }
  if (!kind || kind === 'playback') {
    playback = await api.listPlayback();
    renderAudioList(
      'playback',
      playback,
      settings.enabledPlaybackIds,
      document.getElementById('playback-list') as HTMLElement,
      document.getElementById('playback-empty') as HTMLElement,
    );
  }
  if (!kind || kind === 'recording') {
    recording = await api.listRecording();
    renderAudioList(
      'recording',
      recording,
      settings.enabledRecordingIds,
      document.getElementById('recording-list') as HTMLElement,
      document.getElementById('recording-empty') as HTMLElement,
    );
  }
}

async function refreshCameras(): Promise<void> {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then((stream) => {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    });
  } catch {
    // permission may be denied; still try enumerate
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoInputs = devices.filter((device) => device.kind === 'videoinput');
  cameras = videoInputs.map((device, index) => ({
    id: device.deviceId || `camera-${index}`,
    name: device.label || `Camera ${index + 1}`,
    isDefault: settings?.lastCameraId
      ? device.deviceId === settings.lastCameraId
      : index === 0,
  }));
  if (settings && !settings.lastCameraId && cameras[0]) {
    settings.lastCameraId = cameras[0].id;
  }
  renderCameraList();
}

function syncHotkeyInputs(): void {
  if (!settings) {
    return;
  }
  hotkeysEnabled.checked = settings.hotkeysEnabled;
  hkPlayback.value = formatHotkey(settings.hotkeys.switchPlayback);
  hkRecording.value = formatHotkey(settings.hotkeys.switchRecording);
  hkCamera.value = formatHotkey(settings.hotkeys.switchCamera);
}

function startHotkeyCapture(action: WideviceHotkeyAction, input: HTMLInputElement): void {
  recordingHotkey = action;
  recordingInput = input;
  input.classList.add('recording');
  input.value = 'Press keys…';

  const onKey = (event: KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') {
      stopHotkeyCapture();
      syncHotkeyInputs();
      return;
    }
    const accelerator = eventToAccelerator(event);
    if (!accelerator || !settings) {
      return;
    }
    settings.hotkeys[action] = accelerator;
    stopHotkeyCapture();
    syncHotkeyInputs();
    void persist();
  };

  const onBlur = () => {
    stopHotkeyCapture();
    syncHotkeyInputs();
  };

  input.addEventListener('keydown', onKey, { once: true });
  input.addEventListener('blur', onBlur, { once: true });
}

function stopHotkeyCapture(): void {
  recordingInput?.classList.remove('recording');
  recordingHotkey = null;
  recordingInput = null;
}

function setupTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.tab');
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      for (const item of tabs) {
        item.classList.toggle('active', item === tab);
      }
      for (const panel of document.querySelectorAll<HTMLElement>('.panels .panel')) {
        const active = panel.dataset.panel === name;
        panel.hidden = !active;
        panel.classList.toggle('active', active);
      }
    });
  }
}

async function init(): Promise<void> {
  settings = await api.getSettings();
  syncHotkeyInputs();
  setupTabs();
  await refreshAudio();
  await refreshCameras();

  hotkeysEnabled.addEventListener('change', () => {
    if (!settings) {
      return;
    }
    settings.hotkeysEnabled = hotkeysEnabled.checked;
    void persist();
  });

  hkPlayback.addEventListener('focus', () => startHotkeyCapture('switchPlayback', hkPlayback));
  hkRecording.addEventListener('focus', () => startHotkeyCapture('switchRecording', hkRecording));
  hkCamera.addEventListener('focus', () => startHotkeyCapture('switchCamera', hkCamera));

  document.querySelectorAll<HTMLButtonElement>('[data-refresh]').forEach((button) => {
    button.addEventListener('click', () => {
      const kind = button.dataset.refresh;
      if (kind === 'cameras') {
        void refreshCameras();
      } else if (kind === 'playback' || kind === 'recording') {
        void refreshAudio(kind);
      }
    });
  });

  document.getElementById('device-refresh-all')?.addEventListener('click', () => {
    void refreshAudio();
    void refreshCameras();
  });
}

void init();
