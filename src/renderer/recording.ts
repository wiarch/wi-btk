export {};

type SelectionBounds = { x: number; y: number; width: number; height: number };

type RecordingLabels = {
  title: string;
  desktopAudio: string;
  microphone: string;
  micMute: string;
  micDefault: string;
  fullScreen: string;
  selectRegion: string;
  startRecord: string;
  cancel: string;
  recording: string;
  paused: string;
  pause: string;
  resume: string;
  stop: string;
  regionHint: string;
  selectRegionFirst: string;
};

type RecordingPayload = {
  imageUrl: string;
  width: number;
  height: number;
  labels: RecordingLabels;
  defaults: {
    desktopAudio: boolean;
    micEnabled: boolean;
    micDeviceId: string;
  };
};

type WiRecRecordingApi = {
  onStart(callback: (payload: RecordingPayload) => void): () => void;
  prepareCapture(options: { desktopAudio: boolean }): Promise<void>;
  saveRecording(buffer: ArrayBuffer): Promise<string>;
  persistPreferences(options: {
    desktopAudio: boolean;
    micEnabled: boolean;
    micDeviceId: string;
  }): Promise<void>;
  cancel(): void;
  signalReady(): void;
};

declare global {
  interface Window {
    wiRecRecording: WiRecRecordingApi;
  }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
const setupPanel = document.getElementById('setup-panel') as HTMLDivElement;
const panelTitle = document.getElementById('panel-title') as HTMLHeadingElement;
const desktopAudioInput = document.getElementById('desktop-audio') as HTMLInputElement;
const desktopAudioLabel = document.getElementById('desktop-audio-label') as HTMLSpanElement;
const micLabel = document.getElementById('mic-label') as HTMLLabelElement;
const micSelect = document.getElementById('mic-select') as HTMLSelectElement;
const micMuteInput = document.getElementById('mic-mute') as HTMLInputElement;
const micMuteLabel = document.getElementById('mic-mute-label') as HTMLSpanElement;
const fullScreenBtn = document.getElementById('full-screen-btn') as HTMLButtonElement;
const regionBtn = document.getElementById('region-btn') as HTMLButtonElement;
const regionHint = document.getElementById('region-hint') as HTMLParagraphElement;
const regionActions = document.getElementById('region-actions') as HTMLDivElement;
const startRegionBtn = document.getElementById('start-region-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const recordBar = document.getElementById('record-bar') as HTMLDivElement;
const recordStatus = document.getElementById('record-status') as HTMLSpanElement;
const recordTimer = document.getElementById('record-timer') as HTMLSpanElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;

if (!ctx) {
  throw new Error('Canvas 2D context unavailable');
}

const drawCtx = ctx;
const OVERLAY_ALPHA = 0.45;

const state = {
  labels: null as RecordingLabels | null,
  mode: 'setup' as 'setup' | 'selecting' | 'recording',
  dragging: false,
  startX: 0,
  startY: 0,
  selection: null as SelectionBounds | null,
  mediaRecorder: null as MediaRecorder | null,
  recordedChunks: [] as Blob[],
  stream: null as MediaStream | null,
  cropVideo: null as HTMLVideoElement | null,
  cropRaf: 0,
  timerStart: 0,
  timerElapsed: 0,
  timerInterval: 0 as ReturnType<typeof setInterval> | 0,
  paused: false,
  imageWidth: 0,
  imageHeight: 0,
  frame: null as ImageBitmap | null,
};

function normalizeSelection(x1: number, y1: number, x2: number, y2: number): SelectionBounds {
  return {
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function toImageCoords(event: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return {
    x: Math.max(0, Math.min(x, canvas.width)),
    y: Math.max(0, Math.min(y, canvas.height)),
  };
}

function validSelection(sel: SelectionBounds | null): sel is SelectionBounds {
  return Boolean(sel && sel.width >= 8 && sel.height >= 8);
}

function redrawFrame(): void {
  if (!state.frame) {
    return;
  }

  drawCtx.drawImage(state.frame, 0, 0, canvas.width, canvas.height);
  if (state.mode !== 'selecting') {
    return;
  }

  drawCtx.fillStyle = `rgba(0, 0, 0, ${OVERLAY_ALPHA})`;
  drawCtx.fillRect(0, 0, canvas.width, canvas.height);

  if (!validSelection(state.selection)) {
    return;
  }

  const { x, y, width, height } = state.selection;
  drawCtx.drawImage(state.frame, x, y, width, height, x, y, width, height);
  drawCtx.strokeStyle = '#4f6df5';
  drawCtx.lineWidth = 2;
  drawCtx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

async function loadFrozenFrame(imageUrl: string, width: number, height: number): Promise<void> {
  canvas.width = width;
  canvas.height = height;
  state.imageWidth = width;
  state.imageHeight = height;

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  if (state.frame) {
    state.frame.close();
  }
  state.frame = await createImageBitmap(blob);
  redrawFrame();
}

async function populateMicrophones(preferredId: string): Promise<void> {
  micSelect.innerHTML = '';
  const labels = state.labels;
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = labels?.micDefault ?? 'Default microphone';
  micSelect.append(defaultOption);

  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    // Permission denied — list may still be empty.
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  for (const device of devices.filter((entry) => entry.kind === 'audioinput')) {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `${labels?.microphone ?? 'Microphone'} ${micSelect.length}`;
    micSelect.append(option);
  }

  if (preferredId && [...micSelect.options].some((opt) => opt.value === preferredId)) {
    micSelect.value = preferredId;
  }
}

function applyLabels(labels: RecordingLabels): void {
  panelTitle.textContent = labels.title;
  desktopAudioLabel.textContent = labels.desktopAudio;
  micLabel.textContent = labels.microphone;
  micMuteLabel.textContent = labels.micMute;
  fullScreenBtn.textContent = labels.fullScreen;
  regionBtn.textContent = labels.selectRegion;
  startRegionBtn.textContent = labels.startRecord;
  cancelBtn.textContent = labels.cancel;
  recordStatus.textContent = labels.recording;
  pauseBtn.textContent = labels.pause;
  stopBtn.textContent = labels.stop;
  regionHint.textContent = labels.regionHint;
}

function getPreferences() {
  return {
    desktopAudio: desktopAudioInput.checked,
    micEnabled: !micMuteInput.checked,
    micDeviceId: micSelect.value,
  };
}

function pickMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

function stopCropLoop(): void {
  if (state.cropRaf) {
    cancelAnimationFrame(state.cropRaf);
    state.cropRaf = 0;
  }
  if (state.cropVideo) {
    state.cropVideo.pause();
    state.cropVideo.srcObject = null;
    state.cropVideo = null;
  }
}

function stopStream(): void {
  stopCropLoop();
  if (state.stream) {
    for (const track of state.stream.getTracks()) {
      track.stop();
    }
    state.stream = null;
  }
}

function formatTimer(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function startTimer(): void {
  state.timerStart = Date.now() - state.timerElapsed;
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
  }
  state.timerInterval = setInterval(() => {
    if (!state.paused) {
      recordTimer.textContent = formatTimer(Date.now() - state.timerStart);
    }
  }, 250);
}

function stopTimer(): void {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = 0;
  }
}

function showRecordingBar(): void {
  setupPanel.classList.add('hidden');
  recordBar.classList.remove('hidden');
  recordBar.setAttribute('aria-hidden', 'false');
  document.body.classList.add('recording');
  document.body.classList.remove('selecting');
}

async function cropStreamToRegion(
  stream: MediaStream,
  region: SelectionBounds,
): Promise<MediaStream> {
  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await video.play();
  state.cropVideo = video;

  const canvasEl = document.createElement('canvas');
  canvasEl.width = Math.max(2, Math.round(region.width));
  canvasEl.height = Math.max(2, Math.round(region.height));
  const cropCtx = canvasEl.getContext('2d');
  if (!cropCtx) {
    throw new Error('Crop canvas unavailable');
  }

  const scaleX = video.videoWidth / canvas.width;
  const scaleY = video.videoHeight / canvas.height;

  const draw = () => {
    cropCtx.drawImage(
      video,
      region.x * scaleX,
      region.y * scaleY,
      region.width * scaleX,
      region.height * scaleY,
      0,
      0,
      canvasEl.width,
      canvasEl.height,
    );
    state.cropRaf = requestAnimationFrame(draw);
  };
  draw();

  const cropped = canvasEl.captureStream(30);
  const out = new MediaStream(cropped.getVideoTracks());

  for (const track of stream.getAudioTracks()) {
    out.addTrack(track);
  }

  return out;
}

async function buildRecordingStream(region: SelectionBounds | null): Promise<MediaStream> {
  const { desktopAudio, micEnabled, micDeviceId } = getPreferences();
  await window.wiRecRecording.prepareCapture({ desktopAudio });

  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: desktopAudio,
  });

  let output = region ? await cropStreamToRegion(displayStream, region) : displayStream;

  if (micEnabled) {
    const micConstraints: MediaStreamConstraints = {
      audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
    };
    const micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
    output = new MediaStream([...output.getVideoTracks(), ...output.getAudioTracks()]);
    for (const track of micStream.getAudioTracks()) {
      output.addTrack(track);
    }
  }

  state.stream = output;
  return output;
}

async function startRecording(region: SelectionBounds | null): Promise<void> {
  const labels = state.labels;
  if (!labels) return;

  try {
    const stream = await buildRecordingStream(region);
    state.recordedChunks = [];
    const mimeType = pickMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        state.recordedChunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      void finalizeRecording();
    };

    state.mediaRecorder = recorder;
    state.mode = 'recording';
    state.paused = false;
    state.timerElapsed = 0;
    showRecordingBar();
    recorder.start(1000);
    startTimer();
    void window.wiRecRecording.persistPreferences(getPreferences());
  } catch (error) {
    stopStream();
    const message = error instanceof Error ? error.message : String(error);
    alert(message);
    resetToSetup();
  }
}

async function finalizeRecording(): Promise<void> {
  stopTimer();
  stopStream();

  const blob = new Blob(state.recordedChunks, { type: 'video/webm' });
  state.recordedChunks = [];
  state.mediaRecorder = null;

  if (blob.size < 1) {
    window.wiRecRecording.cancel();
    return;
  }

  const buffer = await blob.arrayBuffer();
  await window.wiRecRecording.saveRecording(buffer);
}

function resetToSetup(): void {
  state.mode = 'setup';
  state.selection = null;
  state.dragging = false;
  state.paused = false;
  document.body.classList.remove('selecting', 'recording');
  setupPanel.classList.remove('hidden');
  regionHint.classList.add('hidden');
  regionActions.classList.add('hidden');
  recordBar.classList.add('hidden');
  recordBar.setAttribute('aria-hidden', 'true');
  recordTimer.textContent = '00:00';
  recordStatus.textContent = state.labels?.recording ?? 'Recording';
  recordStatus.classList.remove('paused');
}

function enterRegionMode(): void {
  state.mode = 'selecting';
  state.selection = null;
  document.body.classList.add('selecting');
  regionHint.classList.remove('hidden');
  regionActions.classList.remove('hidden');
  redrawFrame();
}

fullScreenBtn.addEventListener('click', () => {
  void startRecording(null);
});

regionBtn.addEventListener('click', () => {
  enterRegionMode();
});

startRegionBtn.addEventListener('click', () => {
  if (!validSelection(state.selection)) {
    alert(state.labels?.selectRegionFirst ?? 'Select a region first');
    return;
  }
  void startRecording(state.selection);
});

cancelBtn.addEventListener('click', () => {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
    return;
  }
  window.wiRecRecording.cancel();
});

pauseBtn.addEventListener('click', () => {
  const recorder = state.mediaRecorder;
  const labels = state.labels;
  if (!recorder || recorder.state === 'inactive') return;

  if (recorder.state === 'recording') {
    recorder.pause();
    state.paused = true;
    state.timerElapsed = Date.now() - state.timerStart;
    recordStatus.textContent = labels?.paused ?? 'Paused';
    recordStatus.classList.add('paused');
    pauseBtn.textContent = labels?.resume ?? 'Resume';
    return;
  }

  if (recorder.state === 'paused') {
    recorder.resume();
    state.paused = false;
    state.timerStart = Date.now() - state.timerElapsed;
    recordStatus.textContent = labels?.recording ?? 'Recording';
    recordStatus.classList.remove('paused');
    pauseBtn.textContent = labels?.pause ?? 'Pause';
  }
});

stopBtn.addEventListener('click', () => {
  const recorder = state.mediaRecorder;
  if (!recorder || recorder.state === 'inactive') return;
  recorder.stop();
});

canvas.addEventListener('mousedown', (event) => {
  if (state.mode !== 'selecting') return;
  const point = toImageCoords(event);
  state.dragging = true;
  state.startX = point.x;
  state.startY = point.y;
  state.selection = { x: point.x, y: point.y, width: 0, height: 0 };
});

canvas.addEventListener('mousemove', (event) => {
  if (!state.dragging || state.mode !== 'selecting') return;
  const point = toImageCoords(event);
  state.selection = normalizeSelection(state.startX, state.startY, point.x, point.y);
  redrawFrame();
});

window.addEventListener('mouseup', () => {
  state.dragging = false;
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (state.mode === 'selecting') {
      resetToSetup();
      return;
    }
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      state.mediaRecorder.stop();
      return;
    }
    window.wiRecRecording.cancel();
  }
});

window.wiRecRecording.onStart((payload: RecordingPayload) => {
  state.labels = payload.labels;
  state.mode = 'setup';
  state.selection = null;
  resetToSetup();
  applyLabels(payload.labels);
  desktopAudioInput.checked = payload.defaults.desktopAudio;
  micMuteInput.checked = !payload.defaults.micEnabled;

  void loadFrozenFrame(payload.imageUrl, payload.width, payload.height)
    .then(() => populateMicrophones(payload.defaults.micDeviceId))
    .catch(() => {
      console.error('[WI-Rec] failed to load recording frame');
    });
});

window.wiRecRecording.signalReady();
