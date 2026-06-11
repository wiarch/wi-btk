import { eventMatchesAccelerator } from './hotkeyMatch.js';

export {};

type SelectionBounds = { x: number; y: number; width: number; height: number };

type SnipLabels = {
  screenshot: string;
  record: string;
  rectangle: string;
  fullScreen: string;
  close: string;
  audio: string;
};

type RecordingLabels = {
  desktopAudio: string;
  microphone: string;
  micMute: string;
  micDefault: string;
  recording: string;
  paused: string;
  pause: string;
  resume: string;
  stop: string;
  startRecord: string;
  showControls: string;
  hideControls: string;
};

type RecordSettings = {
  format: 'webm-vp9' | 'webm-vp8' | 'webm';
  quality: 'low' | 'medium' | 'high';
  frameRate: number;
};

type RecordingHotkeys = {
  start: string;
  pause: string;
  resume: string;
  stop: string;
};

type RecordingPayload = {
  imageUrl: string;
  width: number;
  height: number;
  snipLabels: SnipLabels;
  labels: RecordingLabels;
  defaults: {
    desktopAudio: boolean;
    micEnabled: boolean;
    micDeviceId: string;
  };
  recordSettings: RecordSettings;
  hotkeys: RecordingHotkeys;
};

type WiRecRecordingApi = {
  onStart(callback: (payload: RecordingPayload) => void): () => void;
  prepareCapture(options: { desktopAudio: boolean }): Promise<void>;
  releaseCapture(): Promise<void>;
  enterLiveMode(): Promise<void>;
  exitLiveMode(): Promise<void>;
  setMousePassthrough(enabled: boolean): void;
  playSound(cue: 'start' | 'pause' | 'stop'): void;
  saveRecording(buffer: ArrayBuffer): Promise<string>;
  persistPreferences(options: {
    desktopAudio: boolean;
    micEnabled: boolean;
    micDeviceId: string;
  }): Promise<void>;
  cancel(): void;
  switchToCapture(): void;
  signalReady(): void;
};

declare global {
  interface Window {
    wiRecRecording: WiRecRecordingApi;
  }
}

const BITRATES = {
  low: 2_500_000,
  medium: 5_000_000,
  high: 12_000_000,
} as const;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
const countdownOverlay = document.getElementById('countdown-overlay') as HTMLDivElement;
const countdownValue = document.getElementById('countdown-value') as HTMLSpanElement;
const snipBar = document.getElementById('snip-bar') as HTMLDivElement;
const regionMenuBtn = document.getElementById('region-menu-btn') as HTMLButtonElement;
const regionMenu = document.getElementById('region-menu') as HTMLDivElement;
const labelRectangle = document.getElementById('label-rectangle') as HTMLSpanElement;
const labelFullscreen = document.getElementById('label-fullscreen') as HTMLSpanElement;
const audioMenuBtn = document.getElementById('audio-menu-btn') as HTMLButtonElement;
const audioMenu = document.getElementById('audio-menu') as HTMLDivElement;
const desktopAudioInput = document.getElementById('desktop-audio') as HTMLInputElement;
const desktopAudioLabel = document.getElementById('desktop-audio-label') as HTMLSpanElement;
const micLabel = document.getElementById('mic-label') as HTMLSpanElement;
const micSelect = document.getElementById('mic-select') as HTMLSelectElement;
const micMuteInput = document.getElementById('mic-mute') as HTMLInputElement;
const micMuteLabel = document.getElementById('mic-mute-label') as HTMLSpanElement;
const modeScreenshot = document.getElementById('mode-screenshot') as HTMLButtonElement;
const modeRecord = document.getElementById('mode-record') as HTMLButtonElement;
const startRecordBtn = document.getElementById('start-record-btn') as HTMLButtonElement;
const cancelBtn = document.getElementById('cancel-btn') as HTMLButtonElement;
const recordBar = document.getElementById('record-bar') as HTMLDivElement;
const recordChip = document.getElementById('record-chip') as HTMLButtonElement;
const recordChipDot = document.getElementById('record-chip-dot') as HTMLSpanElement;
const recordChipTimer = document.getElementById('record-chip-timer') as HTMLSpanElement;
const recordMinimizeBtn = document.getElementById('record-minimize-btn') as HTMLButtonElement;
const recordDot = document.getElementById('record-dot') as HTMLSpanElement;
const recordStatus = document.getElementById('record-status') as HTMLSpanElement;
const recordTimer = document.getElementById('record-timer') as HTMLSpanElement;
const pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
const regionIndicator = document.getElementById('region-indicator') as HTMLDivElement;

if (!ctx) {
  throw new Error('Canvas 2D context unavailable');
}

const drawCtx = ctx;
const OVERLAY_ALPHA = 0.45;

const state = {
  snipLabels: null as SnipLabels | null,
  labels: null as RecordingLabels | null,
  recordSettings: null as RecordSettings | null,
  hotkeys: {
    start: 'Enter',
    pause: 'F2',
    resume: 'F2',
    stop: 'F3',
  } as RecordingHotkeys,
  mode: 'selecting' as 'selecting' | 'countdown' | 'recording',
  regionMode: 'rectangle' as 'rectangle' | 'fullscreen',
  dragging: false,
  startX: 0,
  startY: 0,
  selection: null as SelectionBounds | null,
  mediaRecorder: null as MediaRecorder | null,
  recordedChunks: [] as Blob[],
  stream: null as MediaStream | null,
  sourceStream: null as MediaStream | null,
  cropVideo: null as HTMLVideoElement | null,
  cropRaf: 0,
  countdownAborted: false,
  timerStart: 0,
  timerElapsed: 0,
  timerInterval: 0 as ReturnType<typeof setInterval> | 0,
  paused: false,
  frame: null as ImageBitmap | null,
  openMenu: null as 'region' | 'audio' | null,
  recordControlsExpanded: false,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canSwitchMode(): boolean {
  return state.mode === 'selecting';
}

function setModeSwitchEnabled(enabled: boolean): void {
  modeScreenshot.disabled = !enabled;
  modeRecord.disabled = !enabled;
}

function closeMenus(): void {
  state.openMenu = null;
  regionMenu.classList.add('hidden');
  audioMenu.classList.add('hidden');
  regionMenuBtn.setAttribute('aria-expanded', 'false');
  audioMenuBtn.setAttribute('aria-expanded', 'false');
}

function toggleMenu(menu: 'region' | 'audio'): void {
  if (state.mode !== 'selecting') {
    return;
  }

  if (state.openMenu === menu) {
    closeMenus();
    return;
  }

  closeMenus();
  state.openMenu = menu;
  const panel = menu === 'region' ? regionMenu : audioMenu;
  const button = menu === 'region' ? regionMenuBtn : audioMenuBtn;
  panel.classList.remove('hidden');
  button.setAttribute('aria-expanded', 'true');

  if (menu === 'audio') {
    void refreshMicList();
  }
}

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

function getActiveRegion(): SelectionBounds | null {
  if (state.regionMode === 'fullscreen') {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height };
  }
  return validSelection(state.selection) ? state.selection : null;
}

function canStartRecording(): boolean {
  return state.mode === 'selecting' && getActiveRegion() !== null;
}

function updateStartButton(): void {
  if (canStartRecording()) {
    startRecordBtn.classList.remove('hidden');
    return;
  }
  startRecordBtn.classList.add('hidden');
}

function isFullScreenRegion(region: SelectionBounds): boolean {
  return (
    region.x === 0 &&
    region.y === 0 &&
    region.width === canvas.width &&
    region.height === canvas.height
  );
}

function syncRegionIndicator(region: SelectionBounds | null): void {
  if (!region || isFullScreenRegion(region)) {
    regionIndicator.classList.add('hidden');
    regionIndicator.setAttribute('aria-hidden', 'true');
    return;
  }

  const scaleX = window.innerWidth / canvas.width;
  const scaleY = window.innerHeight / canvas.height;
  regionIndicator.style.left = `${region.x * scaleX}px`;
  regionIndicator.style.top = `${region.y * scaleY}px`;
  regionIndicator.style.width = `${region.width * scaleX}px`;
  regionIndicator.style.height = `${region.height * scaleY}px`;
  regionIndicator.classList.remove('hidden');
  regionIndicator.setAttribute('aria-hidden', 'false');
}

function hideRegionIndicator(): void {
  regionIndicator.classList.add('hidden');
  regionIndicator.setAttribute('aria-hidden', 'true');
}

function drawSelectionBorder(sel: SelectionBounds, color: string): void {
  const { x, y, width, height } = sel;
  drawCtx.strokeStyle = color;
  drawCtx.lineWidth = 2;
  drawCtx.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
}

function redrawSelectingFrame(): void {
  if (!state.frame) {
    return;
  }

  drawCtx.drawImage(state.frame, 0, 0, canvas.width, canvas.height);
  drawCtx.fillStyle = `rgba(0, 0, 0, ${OVERLAY_ALPHA})`;
  drawCtx.fillRect(0, 0, canvas.width, canvas.height);

  const region = getActiveRegion();
  if (!region) {
    return;
  }

  drawCtx.drawImage(
    state.frame,
    region.x,
    region.y,
    region.width,
    region.height,
    region.x,
    region.y,
    region.width,
    region.height,
  );
  drawSelectionBorder(region, '#4f6df5');
}

function redrawFrame(): void {
  redrawSelectingFrame();
}

async function loadFrozenFrame(imageUrl: string, width: number, height: number): Promise<void> {
  canvas.width = width;
  canvas.height = height;

  const response = await fetch(imageUrl);
  const blob = await response.blob();
  if (state.frame) {
    state.frame.close();
  }
  state.frame = await createImageBitmap(blob);
  redrawFrame();
}

async function refreshMicList(): Promise<void> {
  const labels = state.labels;
  micSelect.innerHTML = '';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = labels?.micDefault ?? 'Default microphone';
  micSelect.append(defaultOption);

  const devices = await navigator.mediaDevices.enumerateDevices();
  for (const device of devices.filter((entry) => entry.kind === 'audioinput')) {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `${labels?.microphone ?? 'Microphone'} ${micSelect.length}`;
    micSelect.append(option);
  }
}

function applyLabels(snipLabels: SnipLabels, labels: RecordingLabels): void {
  modeScreenshot.title = snipLabels.screenshot;
  modeRecord.title = snipLabels.record;
  labelRectangle.textContent = snipLabels.rectangle;
  labelFullscreen.textContent = snipLabels.fullScreen;
  cancelBtn.title = snipLabels.close;
  audioMenuBtn.title = snipLabels.audio;
  desktopAudioLabel.textContent = labels.desktopAudio;
  micLabel.textContent = labels.microphone;
  micMuteLabel.textContent = labels.micMute;
  recordStatus.textContent = labels.recording;
  pauseBtn.textContent = labels.pause;
  stopBtn.textContent = labels.stop;
  startRecordBtn.textContent = labels.startRecord;
  recordChip.title = labels.showControls;
  recordMinimizeBtn.title = labels.hideControls;
}

function syncRecordTimerDisplay(text: string): void {
  recordTimer.textContent = text;
  recordChipTimer.textContent = text;
}

function syncRecordDotState(): void {
  recordChipDot.classList.toggle('paused', recordDot.classList.contains('paused'));
}

function collapseRecordControls(): void {
  state.recordControlsExpanded = false;
  recordBar.classList.add('hidden');
  recordBar.setAttribute('aria-hidden', 'true');
  recordChip.classList.remove('hidden');
  recordChip.setAttribute('aria-hidden', 'false');
  window.wiRecRecording.setMousePassthrough(true);
}

function expandRecordControls(): void {
  state.recordControlsExpanded = true;
  recordChip.classList.add('hidden');
  recordChip.setAttribute('aria-hidden', 'true');
  recordBar.classList.remove('hidden');
  recordBar.setAttribute('aria-hidden', 'false');
  window.wiRecRecording.setMousePassthrough(true);
}

function bindRecordControlHover(element: HTMLElement): void {
  element.addEventListener('mouseenter', () => {
    if (state.mode !== 'recording') {
      return;
    }
    window.wiRecRecording.setMousePassthrough(false);
  });

  element.addEventListener('mouseleave', () => {
    if (state.mode !== 'recording') {
      return;
    }
    window.wiRecRecording.setMousePassthrough(true);
  });
}

function getPreferences() {
  return {
    desktopAudio: desktopAudioInput.checked,
    micEnabled: !micMuteInput.checked,
    micDeviceId: micSelect.value,
  };
}

function pickMimeType(): string {
  const format = state.recordSettings?.format ?? 'webm-vp9';
  const preferred = {
    'webm-vp9': 'video/webm;codecs=vp9,opus',
    'webm-vp8': 'video/webm;codecs=vp8,opus',
    webm: 'video/webm',
  }[format];

  if (MediaRecorder.isTypeSupported(preferred)) {
    return preferred;
  }

  for (const type of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
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

async function stopStream(): Promise<void> {
  stopCropLoop();

  for (const stream of [state.stream, state.sourceStream]) {
    if (!stream) continue;
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  state.stream = null;
  state.sourceStream = null;
  await window.wiRecRecording.releaseCapture();
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
      syncRecordTimerDisplay(formatTimer(Date.now() - state.timerStart));
    }
  }, 250);
}

function stopTimer(): void {
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = 0;
  }
}

function showRecordingBar(region: SelectionBounds): void {
  closeMenus();
  state.mode = 'recording';
  setModeSwitchEnabled(false);
  snipBar.classList.add('hidden');
  startRecordBtn.classList.add('hidden');
  document.body.classList.remove('selecting', 'countdown');
  document.body.classList.add('recording');
  document.body.classList.remove('paused');
  syncRegionIndicator(region);
  collapseRecordControls();
}

async function enterLiveRecordingUi(region: SelectionBounds): Promise<void> {
  showRecordingBar(region);
  await window.wiRecRecording.enterLiveMode();
  window.wiRecRecording.setMousePassthrough(true);
}

async function cropStreamToRegion(
  stream: MediaStream,
  region: SelectionBounds,
  frameRate: number,
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

  const cropped = canvasEl.captureStream(frameRate);
  const out = new MediaStream(cropped.getVideoTracks());
  for (const track of stream.getAudioTracks()) {
    out.addTrack(track);
  }

  return out;
}

async function buildRecordingStream(region: SelectionBounds): Promise<MediaStream> {
  const settings = state.recordSettings;
  const frameRate = settings?.frameRate ?? 30;
  const { desktopAudio, micEnabled, micDeviceId } = getPreferences();
  await window.wiRecRecording.prepareCapture({ desktopAudio });

  const displayStream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate },
    audio: desktopAudio,
  });

  state.sourceStream = displayStream;
  const isFullScreen =
    region.x === 0 &&
    region.y === 0 &&
    region.width === canvas.width &&
    region.height === canvas.height;

  let output = isFullScreen
    ? displayStream
    : await cropStreamToRegion(displayStream, region, frameRate);

  if (micEnabled) {
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: micDeviceId ? { deviceId: { exact: micDeviceId } } : true,
    });
    output = new MediaStream([...output.getVideoTracks(), ...output.getAudioTracks()]);
    for (const track of micStream.getAudioTracks()) {
      output.addTrack(track);
    }
  }

  state.stream = output;
  return output;
}

async function runCountdown(): Promise<boolean> {
  state.mode = 'countdown';
  state.countdownAborted = false;
  setModeSwitchEnabled(false);
  document.body.classList.add('countdown');
  countdownOverlay.classList.remove('hidden');
  countdownOverlay.setAttribute('aria-hidden', 'false');
  startRecordBtn.classList.add('hidden');

  for (let value = 3; value >= 1; value -= 1) {
    if (state.countdownAborted) {
      break;
    }
    countdownValue.textContent = String(value);
    await sleep(1000);
  }

  countdownOverlay.classList.add('hidden');
  countdownOverlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('countdown');

  if (state.countdownAborted) {
    state.mode = 'selecting';
    setModeSwitchEnabled(true);
    updateStartButton();
    return false;
  }

  return true;
}

async function startRecording(): Promise<void> {
  const labels = state.labels;
  const region = getActiveRegion();
  if (!labels || !region || state.mode !== 'selecting') {
    return;
  }

  closeMenus();

  try {
    const proceed = await runCountdown();
    if (!proceed) {
      return;
    }

    await enterLiveRecordingUi(region);
    const stream = await buildRecordingStream(region);
    state.recordedChunks = [];
    const mimeType = pickMimeType();
    const quality = state.recordSettings?.quality ?? 'medium';
    const options: MediaRecorderOptions = {
      videoBitsPerSecond: BITRATES[quality],
    };
    if (mimeType) {
      options.mimeType = mimeType;
    }

    const recorder = new MediaRecorder(stream, options);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        state.recordedChunks.push(event.data);
      }
    };

    recorder.onstop = () => {
      void finalizeRecording();
    };

    state.mediaRecorder = recorder;
    state.paused = false;
    state.timerElapsed = 0;
    recorder.start(1000);
    startTimer();
    window.wiRecRecording.playSound('start');
    void window.wiRecRecording.persistPreferences(getPreferences());
  } catch (error) {
    state.mode = 'selecting';
    await stopStream();
    await window.wiRecRecording.exitLiveMode();
    window.wiRecRecording.setMousePassthrough(false);
    const message = error instanceof Error ? error.message : String(error);
    alert(message);
    resetToSelecting();
  }
}

async function finalizeRecording(): Promise<void> {
  stopTimer();
  await stopStream();
  await window.wiRecRecording.exitLiveMode();
  window.wiRecRecording.setMousePassthrough(false);

  const mimeType = pickMimeType() || 'video/webm';
  const blob = new Blob(state.recordedChunks, { type: mimeType });
  state.recordedChunks = [];
  state.mediaRecorder = null;

  if (blob.size < 1) {
    resetToSelecting();
    return;
  }

  const buffer = await blob.arrayBuffer();
  await window.wiRecRecording.saveRecording(buffer);
  resetToSelecting();
}

function resetToSelecting(): void {
  state.mode = 'selecting';
  state.dragging = false;
  state.paused = false;
  setModeSwitchEnabled(true);
  hideRegionIndicator();
  document.body.classList.remove('recording', 'countdown', 'paused');
  document.body.classList.add('selecting');
  snipBar.classList.remove('hidden');
  recordBar.classList.add('hidden');
  recordBar.setAttribute('aria-hidden', 'true');
  recordChip.classList.add('hidden');
  recordChip.setAttribute('aria-hidden', 'true');
  state.recordControlsExpanded = false;
  syncRecordTimerDisplay('00:00');
  recordDot.classList.remove('paused');
  syncRecordDotState();
  if (state.labels) {
    recordStatus.textContent = state.labels.recording;
    pauseBtn.textContent = state.labels.pause;
  }
  updateStartButton();
  redrawFrame();
}

async function exitLiveRecordingUi(): Promise<void> {
  window.wiRecRecording.setMousePassthrough(false);
  await window.wiRecRecording.exitLiveMode();
}

function pauseRecording(): void {
  const recorder = state.mediaRecorder;
  const labels = state.labels;
  if (!recorder || recorder.state !== 'recording') return;

  recorder.pause();
  state.paused = true;
  state.timerElapsed = Date.now() - state.timerStart;
  document.body.classList.add('paused');
  recordStatus.textContent = labels?.paused ?? 'Paused';
  recordDot.classList.add('paused');
  syncRecordDotState();
  pauseBtn.textContent = labels?.resume ?? 'Resume';
  window.wiRecRecording.playSound('pause');
}

function resumeRecording(): void {
  const recorder = state.mediaRecorder;
  const labels = state.labels;
  if (!recorder || recorder.state !== 'paused') return;

  recorder.resume();
  state.paused = false;
  state.timerStart = Date.now() - state.timerElapsed;
  document.body.classList.remove('paused');
  recordStatus.textContent = labels?.recording ?? 'Recording';
  recordDot.classList.remove('paused');
  syncRecordDotState();
  pauseBtn.textContent = labels?.pause ?? 'Pause';
}

function togglePause(): void {
  const recorder = state.mediaRecorder;
  if (!recorder || recorder.state === 'inactive') return;

  if (recorder.state === 'recording') {
    pauseRecording();
    return;
  }

  if (recorder.state === 'paused') {
    resumeRecording();
  }
}

function stopRecording(): void {
  const recorder = state.mediaRecorder;
  if (!recorder || recorder.state === 'inactive') return;
  window.wiRecRecording.playSound('stop');
  recorder.stop();
}

async function discardRecordingAndClose(): Promise<void> {
  stopTimer();
  state.recordedChunks = [];
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.onstop = null;
    state.mediaRecorder.stop();
  }
  state.mediaRecorder = null;
  await stopStream();
  await exitLiveRecordingUi();
  window.wiRecRecording.cancel();
}

regionMenuBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleMenu('region');
});

audioMenuBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  toggleMenu('audio');
});

regionMenu.querySelectorAll('[data-region]').forEach((button) => {
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    const region = (button as HTMLButtonElement).dataset.region as 'rectangle' | 'fullscreen';
    regionMenu.querySelectorAll('.snip-menu-item').forEach((item) => {
      item.classList.toggle('active', item === button);
    });
    closeMenus();
    state.regionMode = region;

    if (region === 'fullscreen') {
      state.selection = { x: 0, y: 0, width: canvas.width, height: canvas.height };
    } else {
      state.selection = null;
    }

    updateStartButton();
    redrawFrame();
  });
});

modeScreenshot.addEventListener('click', () => {
  if (!canSwitchMode()) {
    return;
  }
  window.wiRecRecording.switchToCapture();
});

startRecordBtn.addEventListener('click', () => {
  void startRecording();
});

cancelBtn.addEventListener('click', () => {
  if (state.mode === 'countdown') {
    state.countdownAborted = true;
    return;
  }
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    void discardRecordingAndClose();
    return;
  }
  void stopStream();
  window.wiRecRecording.cancel();
});

pauseBtn.addEventListener('click', () => {
  togglePause();
});

stopBtn.addEventListener('click', () => {
  stopRecording();
});

recordChip.addEventListener('click', () => {
  if (state.mode !== 'recording') {
    return;
  }
  expandRecordControls();
});

recordMinimizeBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  if (state.mode !== 'recording') {
    return;
  }
  collapseRecordControls();
});

bindRecordControlHover(recordChip);
bindRecordControlHover(recordBar);

canvas.addEventListener('mousedown', (event) => {
  if (state.mode !== 'selecting' || state.regionMode === 'fullscreen') return;
  closeMenus();
  const point = toImageCoords(event);
  state.dragging = true;
  state.startX = point.x;
  state.startY = point.y;
  state.selection = { x: point.x, y: point.y, width: 0, height: 0 };
  updateStartButton();
});

canvas.addEventListener('mousemove', (event) => {
  if (!state.dragging || state.mode !== 'selecting' || state.regionMode === 'fullscreen') return;
  const point = toImageCoords(event);
  state.selection = normalizeSelection(state.startX, state.startY, point.x, point.y);
  updateStartButton();
  redrawFrame();
});

canvas.addEventListener('mouseup', () => {
  if (!state.dragging || state.mode !== 'selecting') return;
  state.dragging = false;
  updateStartButton();
  redrawFrame();
});

window.addEventListener('mousedown', (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  if (event.target.closest('.snip-menu-wrap')) return;
  closeMenus();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (state.mode === 'countdown') {
      state.countdownAborted = true;
      return;
    }
    if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
      void discardRecordingAndClose();
      return;
    }
    void stopStream();
    window.wiRecRecording.cancel();
    return;
  }

  if (state.mode === 'selecting' && eventMatchesAccelerator(event, state.hotkeys.start)) {
    if (canStartRecording()) {
      event.preventDefault();
      void startRecording();
    }
    return;
  }

  if (state.mode === 'recording') {
    if (
      eventMatchesAccelerator(event, state.hotkeys.pause) ||
      eventMatchesAccelerator(event, state.hotkeys.resume)
    ) {
      event.preventDefault();
      togglePause();
      return;
    }

    if (eventMatchesAccelerator(event, state.hotkeys.stop)) {
      event.preventDefault();
      stopRecording();
    }
  }
});

window.wiRecRecording.onStart((payload: RecordingPayload) => {
  state.snipLabels = payload.snipLabels;
  state.labels = payload.labels;
  state.recordSettings = payload.recordSettings;
  state.hotkeys = { ...payload.hotkeys };
  state.regionMode = 'rectangle';
  state.selection = null;
  closeMenus();
  resetToSelecting();
  applyLabels(payload.snipLabels, payload.labels);
  document.body.classList.add('selecting');
  desktopAudioInput.checked = payload.defaults.desktopAudio;
  micMuteInput.checked = !payload.defaults.micEnabled;

  void loadFrozenFrame(payload.imageUrl, payload.width, payload.height)
    .then(() => refreshMicList())
    .then(() => {
      if (payload.defaults.micDeviceId) {
        micSelect.value = payload.defaults.micDeviceId;
      }
    })
    .catch(() => {
      console.error('[WI-Rec] failed to load recording frame');
    });
});

window.wiRecRecording.signalReady();
