import { eventMatchesAccelerator } from './hotkeyMatch.js';

export {};

type SelectionBounds = { x: number; y: number; width: number; height: number };

type ScreenshotPayload = {
  imageUrl: string;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  captureFullScreen: boolean;
  language: 'en' | 'es';
  hotkeys: {
    arrow: string;
    rect: string;
    save: string;
    copy: string;
    cancel: string;
  };
  overlayLabels: {
    arrow: string;
    rect: string;
    copy: string;
    save: string;
    close: string;
  };
  hotkeyDisplay: {
    arrow: string;
    rect: string;
    copy: string;
    save: string;
    close: string;
  };
  saveAsJpeg: boolean;
  jpegQuality: number;
};

type Tool = 'arrow' | 'rect';

type Annotation =
  | { type: 'arrow'; x1: number; y1: number; x2: number; y2: number }
  | { type: 'rect'; x: number; y: number; width: number; height: number };

type WiRecApi = {
  onScreenshotReady(callback: (payload: ScreenshotPayload) => void): () => void;
  saveImage(imageBase64: string, edited: boolean): Promise<void>;
  copyImage(imageBase64: string, edited: boolean): Promise<void>;
  cancel(): void;
  ready(): void;
};

declare global {
  interface Window {
    wiRec: WiRecApi;
  }
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const toolbar = document.getElementById('toolbar') as HTMLDivElement;
const sizeLabel = document.getElementById('size-label') as HTMLSpanElement;
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('Canvas 2D context unavailable');
}

const drawCtx = ctx;
const STROKE = '#f43f5e';
const HANDLE = 7;
const OVERLAY_ALPHA = 0.45;

const state = {
  image: new Image(),
  mode: 'select' as 'select' | 'annotate',
  tool: 'arrow' as Tool,
  dragging: false,
  drawing: false,
  startX: 0,
  startY: 0,
  selection: null as SelectionBounds | null,
  annotations: [] as Annotation[],
  draft: null as Annotation | null,
  resizeHandle: null as string | null,
  resizeBase: null as SelectionBounds | null,
  hotkeys: {
    arrow: 'A',
    rect: 'R',
    save: 'CommandOrControl+S',
    copy: 'CommandOrControl+C',
    cancel: 'Escape',
  },
  saveAsJpeg: true,
  jpegQuality: 85,
};

function hasEdits(): boolean {
  return state.annotations.length > 0;
}

function setActiveTool(tool: Tool): void {
  state.tool = tool;
  toolbar.querySelectorAll('.tool-btn').forEach((btn) => {
    btn.classList.toggle('active', (btn as HTMLButtonElement).dataset.tool === tool);
  });
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

function drawArrow(
  context: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): void {
  const head = 14;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.beginPath();
  context.moveTo(x2, y2);
  context.lineTo(x2 - head * Math.cos(angle - Math.PI / 6), y2 - head * Math.sin(angle - Math.PI / 6));
  context.lineTo(x2 - head * Math.cos(angle + Math.PI / 6), y2 - head * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
}

function drawAnnotation(context: CanvasRenderingContext2D, ann: Annotation): void {
  context.strokeStyle = STROKE;
  context.fillStyle = STROKE;
  context.lineWidth = 3;

  if (ann.type === 'arrow') {
    drawArrow(context, ann.x1, ann.y1, ann.x2, ann.y2);
    return;
  }

  context.strokeRect(ann.x + 0.5, ann.y + 0.5, ann.width, ann.height);
}

function drawHandles(sel: SelectionBounds): void {
  const points = [
    [sel.x, sel.y],
    [sel.x + sel.width / 2, sel.y],
    [sel.x + sel.width, sel.y],
    [sel.x + sel.width, sel.y + sel.height / 2],
    [sel.x + sel.width, sel.y + sel.height],
    [sel.x + sel.width / 2, sel.y + sel.height],
    [sel.x, sel.y + sel.height],
    [sel.x, sel.y + sel.height / 2],
  ];

  drawCtx.fillStyle = '#a78bfa';
  for (const [x, y] of points) {
    drawCtx.beginPath();
    drawCtx.arc(x, y, HANDLE, 0, Math.PI * 2);
    drawCtx.fill();
    drawCtx.strokeStyle = '#fff';
    drawCtx.lineWidth = 2;
    drawCtx.stroke();
  }
}

function drawScene(): void {
  const { image, selection, annotations, draft } = state;
  drawCtx.clearRect(0, 0, canvas.width, canvas.height);
  drawCtx.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawCtx.fillStyle = `rgba(0, 0, 0, ${OVERLAY_ALPHA})`;
  drawCtx.fillRect(0, 0, canvas.width, canvas.height);

  if (!validSelection(selection)) {
    return;
  }

  drawCtx.drawImage(
    image,
    selection.x,
    selection.y,
    selection.width,
    selection.height,
    selection.x,
    selection.y,
    selection.width,
    selection.height,
  );

  drawCtx.save();
  drawCtx.beginPath();
  drawCtx.rect(selection.x, selection.y, selection.width, selection.height);
  drawCtx.clip();

  for (const ann of annotations) {
    drawAnnotation(drawCtx, ann);
  }
  if (draft) {
    drawAnnotation(drawCtx, draft);
  }

  drawCtx.restore();

  drawCtx.strokeStyle = '#ffffff';
  drawCtx.lineWidth = 2;
  drawCtx.strokeRect(selection.x + 0.5, selection.y + 0.5, selection.width, selection.height);

  if (state.mode === 'annotate') {
    drawHandles(selection);
  }
}

function positionToolbar(): void {
  if (!validSelection(state.selection)) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  const sel = state.selection;
  const left = rect.left + (sel.x + sel.width / 2) * scaleX;
  const top = rect.top + (sel.y + sel.height) * scaleY + 12;

  toolbar.style.left = `${Math.max(8, Math.min(left - toolbar.offsetWidth / 2, window.innerWidth - toolbar.offsetWidth - 8))}px`;
  toolbar.style.top = `${Math.min(top, window.innerHeight - toolbar.offsetHeight - 8)}px`;
  sizeLabel.textContent = `${Math.round(sel.width)} × ${Math.round(sel.height)}`;
}

function showToolbar(): void {
  toolbar.classList.remove('hidden');
  toolbar.setAttribute('aria-hidden', 'false');
  document.body.classList.add('mode-annotate');
  positionToolbar();
}

function hideToolbar(): void {
  toolbar.classList.add('hidden');
  toolbar.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('mode-annotate');
}

function enterAnnotateMode(): void {
  state.mode = 'annotate';
  showToolbar();
  drawScene();
}

function exportImage(): string {
  if (!validSelection(state.selection)) {
    return '';
  }

  const sel = state.selection;
  const off = document.createElement('canvas');
  off.width = Math.round(sel.width);
  off.height = Math.round(sel.height);
  const offCtx = off.getContext('2d');
  if (!offCtx) {
    return '';
  }

  offCtx.drawImage(
    state.image,
    sel.x,
    sel.y,
    sel.width,
    sel.height,
    0,
    0,
    sel.width,
    sel.height,
  );

  offCtx.save();
  offCtx.translate(-sel.x, -sel.y);
  for (const ann of state.annotations) {
    drawAnnotation(offCtx, ann);
  }
  offCtx.restore();

  if (state.saveAsJpeg) {
    const quality = Math.min(1, Math.max(0.5, state.jpegQuality / 100));
    return off.toDataURL('image/jpeg', quality).split(',')[1] ?? '';
  }

  return off.toDataURL('image/png').split(',')[1] ?? '';
}

function hitHandle(x: number, y: number, sel: SelectionBounds): string | null {
  const handles: Record<string, [number, number]> = {
    nw: [sel.x, sel.y],
    n: [sel.x + sel.width / 2, sel.y],
    ne: [sel.x + sel.width, sel.y],
    e: [sel.x + sel.width, sel.y + sel.height / 2],
    se: [sel.x + sel.width, sel.y + sel.height],
    s: [sel.x + sel.width / 2, sel.y + sel.height],
    sw: [sel.x, sel.y + sel.height],
    w: [sel.x, sel.y + sel.height / 2],
  };

  for (const [name, [hx, hy]] of Object.entries(handles)) {
    if (Math.hypot(x - hx, y - hy) <= HANDLE + 4) {
      return name;
    }
  }

  return null;
}

function resizeSelection(handle: string, x: number, y: number, base: SelectionBounds): SelectionBounds {
  let left = base.x;
  let top = base.y;
  let right = base.x + base.width;
  let bottom = base.y + base.height;

  if (handle.includes('n')) top = y;
  if (handle.includes('s')) bottom = y;
  if (handle.includes('w')) left = x;
  if (handle.includes('e')) right = x;

  return normalizeSelection(left, top, right, bottom);
}

canvas.addEventListener('mousedown', (event) => {
  const point = toImageCoords(event);

  if (state.mode === 'select') {
    state.dragging = true;
    state.startX = point.x;
    state.startY = point.y;
    state.selection = { x: point.x, y: point.y, width: 0, height: 0 };
    hideToolbar();
    drawScene();
    return;
  }

  if (!validSelection(state.selection)) {
    return;
  }

  const handle = hitHandle(point.x, point.y, state.selection);
  if (handle) {
    state.resizeHandle = handle;
    state.resizeBase = { ...state.selection };
    state.dragging = true;
    return;
  }

  const inside =
    point.x >= state.selection.x &&
    point.x <= state.selection.x + state.selection.width &&
    point.y >= state.selection.y &&
    point.y <= state.selection.y + state.selection.height;

  if (!inside) {
    return;
  }

  state.drawing = true;
  state.startX = point.x;
  state.startY = point.y;

  if (state.tool === 'arrow') {
    state.draft = { type: 'arrow', x1: point.x, y1: point.y, x2: point.x, y2: point.y };
  } else {
    state.draft = { type: 'rect', x: point.x, y: point.y, width: 0, height: 0 };
  }

  drawScene();
});

canvas.addEventListener('mousemove', (event) => {
  const point = toImageCoords(event);

  if (state.mode === 'select' && state.dragging) {
    state.selection = normalizeSelection(state.startX, state.startY, point.x, point.y);
    drawScene();
    return;
  }

  if (state.resizeHandle && state.dragging && state.resizeBase) {
    state.selection = resizeSelection(state.resizeHandle, point.x, point.y, state.resizeBase);
    drawScene();
    positionToolbar();
    return;
  }

  if (!state.drawing || !state.draft) {
    return;
  }

  if (state.draft.type === 'arrow') {
    state.draft.x2 = point.x;
    state.draft.y2 = point.y;
  } else {
    const normalized = normalizeSelection(state.startX, state.startY, point.x, point.y);
    state.draft = { type: 'rect', ...normalized };
  }

  drawScene();
});

canvas.addEventListener('mouseup', (event) => {
  const point = toImageCoords(event);

  if (state.mode === 'select' && state.dragging) {
    state.dragging = false;
    state.selection = normalizeSelection(state.startX, state.startY, point.x, point.y);
    drawScene();
    if (validSelection(state.selection)) {
      enterAnnotateMode();
    }
    return;
  }

  if (state.resizeHandle) {
    state.resizeHandle = null;
    state.resizeBase = null;
    state.dragging = false;
    drawScene();
    positionToolbar();
    return;
  }

  if (state.drawing && state.draft) {
    state.drawing = false;
    state.annotations.push(state.draft);
    state.draft = null;
    drawScene();
  }
});

toolbar.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
  if (!target) {
    return;
  }

  const tool = target.dataset.tool as Tool | undefined;
  const action = target.dataset.action;

  if (tool) {
    state.tool = tool;
    toolbar.querySelectorAll('.tool-btn').forEach((btn) => btn.classList.remove('active'));
    target.classList.add('active');
    return;
  }

  if (action === 'close') {
    window.wiRec.cancel();
    return;
  }

  const imageBase64 = exportImage();
  if (!imageBase64) {
    return;
  }

  if (action === 'save') {
    void window.wiRec.saveImage(imageBase64, hasEdits());
  }

  if (action === 'copy') {
    void window.wiRec.copyImage(imageBase64, hasEdits());
  }
});

window.addEventListener('keydown', (event) => {
  if (eventMatchesAccelerator(event, state.hotkeys.cancel)) {
    window.wiRec.cancel();
    return;
  }

  if (state.mode === 'annotate') {
    if (eventMatchesAccelerator(event, state.hotkeys.arrow)) {
      event.preventDefault();
      setActiveTool('arrow');
      return;
    }

    if (eventMatchesAccelerator(event, state.hotkeys.rect)) {
      event.preventDefault();
      setActiveTool('rect');
      return;
    }

    const imageBase64 = exportImage();
    if (!imageBase64) {
      return;
    }

    if (eventMatchesAccelerator(event, state.hotkeys.save)) {
      event.preventDefault();
      void window.wiRec.saveImage(imageBase64, hasEdits());
      return;
    }

    if (eventMatchesAccelerator(event, state.hotkeys.copy)) {
      event.preventDefault();
      void window.wiRec.copyImage(imageBase64, hasEdits());
    }
  }
});

window.addEventListener('resize', () => {
  positionToolbar();
});

function applyOverlayButtons(
  labels: ScreenshotPayload['overlayLabels'],
  hotkeys: ScreenshotPayload['hotkeyDisplay'],
): void {
  const arrowBtn = toolbar.querySelector('[data-tool="arrow"]') as HTMLButtonElement | null;
  const rectBtn = toolbar.querySelector('[data-tool="rect"]') as HTMLButtonElement | null;
  const copyBtn = toolbar.querySelector('[data-action="copy"]') as HTMLButtonElement | null;
  const saveBtn = toolbar.querySelector('[data-action="save"]') as HTMLButtonElement | null;
  const closeBtn = toolbar.querySelector('[data-action="close"]') as HTMLButtonElement | null;

  if (arrowBtn) {
    arrowBtn.textContent = `↗ (${hotkeys.arrow})`;
    arrowBtn.title = labels.arrow;
  }
  if (rectBtn) {
    rectBtn.textContent = `□ (${hotkeys.rect})`;
    rectBtn.title = labels.rect;
  }
  if (copyBtn) {
    copyBtn.textContent = `⧉ (${hotkeys.copy})`;
    copyBtn.title = labels.copy;
  }
  if (saveBtn) {
    saveBtn.textContent = `💾 (${hotkeys.save})`;
    saveBtn.title = labels.save;
  }
  if (closeBtn) {
    closeBtn.textContent = `✕ (${hotkeys.close})`;
    closeBtn.title = labels.close;
  }
}

window.wiRec.onScreenshotReady((payload: ScreenshotPayload) => {
  state.mode = 'select';
  state.tool = 'arrow';
  state.dragging = false;
  state.drawing = false;
  state.selection = null;
  state.annotations = [];
  state.draft = null;
  state.resizeHandle = null;
  state.resizeBase = null;
  state.hotkeys = { ...payload.hotkeys };
  state.saveAsJpeg = payload.saveAsJpeg;
  state.jpegQuality = payload.jpegQuality;
  applyOverlayButtons(payload.overlayLabels, payload.hotkeyDisplay);
  hideToolbar();

  canvas.width = payload.width;
  canvas.height = payload.height;

  state.image.onload = () => {
    drawScene();
    if (payload.captureFullScreen) {
      state.selection = {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      };
      enterAnnotateMode();
    }
  };
  state.image.onerror = () => {
    console.error('[WI-Rec] failed to load capture image');
  };
  state.image.src = payload.imageUrl;
});

window.wiRec.ready();
