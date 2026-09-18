export {};

type Tool =
  | 'lock'
  | 'hand'
  | 'select'
  | 'rect'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'pencil'
  | 'text'
  | 'image'
  | 'eraser';

type Point = { x: number; y: number };

type DrawElement =
  | {
      id: string;
      type: 'rect' | 'diamond' | 'ellipse';
      x: number;
      y: number;
      w: number;
      h: number;
      stroke: string;
      width: number;
    }
  | {
      id: string;
      type: 'line' | 'arrow';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      width: number;
    }
  | {
      id: string;
      type: 'pencil';
      points: Point[];
      stroke: string;
      width: number;
    }
  | {
      id: string;
      type: 'text';
      x: number;
      y: number;
      text: string;
      stroke: string;
      size: number;
    }
  | {
      id: string;
      type: 'image';
      x: number;
      y: number;
      w: number;
      h: number;
      src: string;
    };

type Scene = {
  elements: DrawElement[];
  camera: { x: number; y: number; zoom: number };
};

type WidrawSettings = {
  hotkey: string;
  hotkeyEnabled: boolean;
  strokeColor: string;
  backgroundColor: string;
  strokeWidth: number;
};

type WiDrawApi = {
  getSettings(): Promise<WidrawSettings>;
  saveSettings(settings: WidrawSettings): Promise<{ ok: boolean; settings?: WidrawSettings }>;
  isOpen(): Promise<{ open: boolean }>;
  open(): Promise<{ open: boolean }>;
  close(): Promise<{ open: boolean }>;
  toggle(): Promise<{ open: boolean }>;
  loadScene(): Promise<Scene | null>;
  saveScene(scene: Scene): Promise<{ ok: boolean }>;
  pickImage(): Promise<string | null>;
  notify(message: string): void;
  onOpenState(listener: (state: { open: boolean }) => void): () => void;
};

function getApi(): WiDrawApi {
  const api = (window as unknown as { wiDraw?: WiDrawApi }).wiDraw;
  if (api) {
    return api;
  }
  throw new Error('WI-Draw API unavailable');
}

const api = getApi();
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const welcome = document.getElementById('welcome') as HTMLDivElement;
const welcomeStart = document.getElementById('welcome-start') as HTMLButtonElement;
const menu = document.getElementById('menu') as HTMLDivElement;
const menuBtn = document.getElementById('menu-btn') as HTMLButtonElement;

let settings: WidrawSettings = {
  hotkey: 'Control+Alt+D',
  hotkeyEnabled: true,
  strokeColor: '#1e1e1e',
  backgroundColor: '#ffffff',
  strokeWidth: 2,
};

let tool: Tool = 'select';
let locked = false;
let elements: DrawElement[] = [];
let camera = { x: 0, y: 0, zoom: 1 };
let selectedId: string | null = null;
let drawing: DrawElement | null = null;
let dragging = false;
let spacePan = false;
let lastPointer: Point | null = null;
let panOrigin: Point | null = null;
let camOrigin = { x: 0, y: 0 };
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const imageCache = new Map<string, HTMLImageElement>();

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function scheduleSave(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void api.saveScene({ elements, camera });
  }, 400);
}

function hideWelcome(): void {
  welcome.hidden = true;
}

function screenToWorld(p: Point): Point {
  return {
    x: (p.x - camera.x) / camera.zoom,
    y: (p.y - camera.y) / camera.zoom,
  };
}

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function roughLine(from: Point, to: Point): void {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  const midX = (from.x + to.x) / 2 + (Math.random() - 0.5) * 1.5;
  const midY = (from.y + to.y) / 2 + (Math.random() - 0.5) * 1.5;
  ctx.quadraticCurveTo(midX, midY, to.x, to.y);
  ctx.stroke();
}

function drawElement(el: DrawElement, preview = false): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (el.type === 'image') {
    let img = imageCache.get(el.src);
    if (!img) {
      img = new Image();
      img.src = el.src;
      imageCache.set(el.src, img);
      img.onload = () => render();
    }
    if (img.complete) {
      ctx.drawImage(img, el.x, el.y, el.w, el.h);
    }
  } else if (el.type === 'text') {
    ctx.fillStyle = el.stroke;
    ctx.font = `${el.size}px Caveat, Segoe UI, cursive`;
    ctx.fillText(el.text, el.x, el.y);
  } else if (el.type === 'pencil') {
    if (el.points.length < 2) {
      ctx.restore();
      return;
    }
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.width;
    ctx.beginPath();
    ctx.moveTo(el.points[0].x, el.points[0].y);
    for (let i = 1; i < el.points.length; i += 1) {
      ctx.lineTo(el.points[i].x, el.points[i].y);
    }
    ctx.stroke();
  } else if (el.type === 'line' || el.type === 'arrow') {
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.width;
    roughLine({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 });
    if (el.type === 'arrow') {
      const angle = Math.atan2(el.y2 - el.y1, el.x2 - el.x1);
      const size = 12;
      ctx.beginPath();
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(el.x2 - size * Math.cos(angle - 0.4), el.y2 - size * Math.sin(angle - 0.4));
      ctx.moveTo(el.x2, el.y2);
      ctx.lineTo(el.x2 - size * Math.cos(angle + 0.4), el.y2 - size * Math.sin(angle + 0.4));
      ctx.stroke();
    }
  } else if (el.type === 'rect' || el.type === 'ellipse' || el.type === 'diamond') {
    ctx.strokeStyle = el.stroke;
    ctx.lineWidth = el.width;
    const x = Math.min(el.x, el.x + el.w);
    const y = Math.min(el.y, el.y + el.h);
    const w = Math.abs(el.w);
    const h = Math.abs(el.h);
    ctx.beginPath();
    if (el.type === 'rect') {
      ctx.strokeRect(x, y, w, h);
    } else if (el.type === 'ellipse') {
      ctx.ellipse(x + w / 2, y + h / 2, w / 2 || 0.5, h / 2 || 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.moveTo(x + w / 2, y);
      ctx.lineTo(x + w, y + h / 2);
      ctx.lineTo(x + w / 2, y + h);
      ctx.lineTo(x, y + h / 2);
      ctx.closePath();
      ctx.stroke();
    }
  }

  if (!preview && el.id === selectedId) {
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#6965db';
    ctx.lineWidth = 1;
    const bounds = boundsOf(el);
    ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
  }
  ctx.restore();
}

function boundsOf(el: DrawElement): { x: number; y: number; w: number; h: number } {
  if (el.type === 'line' || el.type === 'arrow') {
    const x = Math.min(el.x1, el.x2);
    const y = Math.min(el.y1, el.y2);
    return { x, y, w: Math.abs(el.x2 - el.x1), h: Math.abs(el.y2 - el.y1) };
  }
  if (el.type === 'pencil') {
    const xs = el.points.map((p) => p.x);
    const ys = el.points.map((p) => p.y);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  if (el.type === 'text') {
    return { x: el.x, y: el.y - el.size, w: el.text.length * el.size * 0.5, h: el.size };
  }
  if (el.type === 'image' || el.type === 'rect' || el.type === 'diamond' || el.type === 'ellipse') {
    return {
      x: Math.min(el.x, el.x + el.w),
      y: Math.min(el.y, el.y + el.h),
      w: Math.abs(el.w),
      h: Math.abs(el.h),
    };
  }
  return { x: 0, y: 0, w: 0, h: 0 };
}

function hitTest(world: Point): string | null {
  for (let i = elements.length - 1; i >= 0; i -= 1) {
    const b = boundsOf(elements[i]);
    if (world.x >= b.x - 4 && world.x <= b.x + b.w + 4 && world.y >= b.y - 4 && world.y <= b.y + b.h + 4) {
      return elements[i].id;
    }
  }
  return null;
}

function render(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.scale(camera.zoom, camera.zoom);
  for (const el of elements) {
    drawElement(el);
  }
  if (drawing) {
    drawElement(drawing, true);
  }
  ctx.restore();
}

function setTool(next: Tool): void {
  if (next === 'lock') {
    locked = !locked;
    document.querySelector('[data-tool="lock"]')?.classList.toggle('active', locked);
    return;
  }
  if (locked && next !== 'hand' && next !== 'select') {
    return;
  }
  tool = next;
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.tool[data-tool]')) {
    if (btn.dataset.tool === 'lock') {
      continue;
    }
    btn.classList.toggle('active', btn.dataset.tool === tool);
  }
  canvas.style.cursor = tool === 'hand' ? 'grab' : tool === 'text' ? 'text' : 'crosshair';
}

function pointerPos(event: PointerEvent): Point {
  return { x: event.clientX, y: event.clientY };
}

canvas.addEventListener('pointerdown', async (event) => {
  hideWelcome();
  menu.hidden = true;
  canvas.setPointerCapture(event.pointerId);
  const screen = pointerPos(event);
  const world = screenToWorld(screen);
  lastPointer = screen;
  dragging = true;

  const panning = tool === 'hand' || spacePan || event.button === 1;
  if (panning) {
    panOrigin = screen;
    camOrigin = { ...camera };
    canvas.style.cursor = 'grabbing';
    return;
  }

  if (tool === 'select' || tool === 'eraser') {
    const id = hitTest(world);
    selectedId = id;
    if (tool === 'eraser' && id) {
      elements = elements.filter((el) => el.id !== id);
      selectedId = null;
      scheduleSave();
    }
    render();
    return;
  }

  if (tool === 'text') {
    const text = window.prompt('Text', 'Text');
    if (text) {
      elements.push({
        id: uid(),
        type: 'text',
        x: world.x,
        y: world.y,
        text,
        stroke: settings.strokeColor,
        size: 28,
      });
      scheduleSave();
      render();
    }
    return;
  }

  if (tool === 'image') {
    const src = await api.pickImage();
    if (src) {
      elements.push({
        id: uid(),
        type: 'image',
        x: world.x,
        y: world.y,
        w: 240,
        h: 180,
        src,
      });
      scheduleSave();
      hideWelcome();
      render();
    }
    return;
  }

  if (tool === 'pencil') {
    drawing = {
      id: uid(),
      type: 'pencil',
      points: [world],
      stroke: settings.strokeColor,
      width: settings.strokeWidth,
    };
    return;
  }

  if (tool === 'line' || tool === 'arrow') {
    drawing = {
      id: uid(),
      type: tool,
      x1: world.x,
      y1: world.y,
      x2: world.x,
      y2: world.y,
      stroke: settings.strokeColor,
      width: settings.strokeWidth,
    };
    return;
  }

  if (tool === 'rect' || tool === 'diamond' || tool === 'ellipse') {
    drawing = {
      id: uid(),
      type: tool,
      x: world.x,
      y: world.y,
      w: 0,
      h: 0,
      stroke: settings.strokeColor,
      width: settings.strokeWidth,
    };
  }
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) {
    return;
  }
  const screen = pointerPos(event);
  const world = screenToWorld(screen);

  if (panOrigin) {
    camera.x = camOrigin.x + (screen.x - panOrigin.x);
    camera.y = camOrigin.y + (screen.y - panOrigin.y);
    render();
    return;
  }

  if (!drawing) {
    return;
  }

  if (drawing.type === 'pencil') {
    drawing.points.push(world);
  } else if (drawing.type === 'line' || drawing.type === 'arrow') {
    drawing.x2 = world.x;
    drawing.y2 = world.y;
  } else if (drawing.type === 'rect' || drawing.type === 'diamond' || drawing.type === 'ellipse') {
    drawing.w = world.x - drawing.x;
    drawing.h = world.y - drawing.y;
  }
  render();
});

canvas.addEventListener('pointerup', () => {
  dragging = false;
  panOrigin = null;
  if (tool === 'hand') {
    canvas.style.cursor = 'grab';
  }
  if (drawing) {
    elements.push(drawing);
    selectedId = drawing.id;
    drawing = null;
    scheduleSave();
    render();
  }
});

canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault();
    const screen = { x: event.clientX, y: event.clientY };
    const before = screenToWorld(screen);
    const factor = event.deltaY > 0 ? 0.9 : 1.1;
    camera.zoom = Math.min(4, Math.max(0.25, camera.zoom * factor));
    camera.x = screen.x - before.x * camera.zoom;
    camera.y = screen.y - before.y * camera.zoom;
    scheduleSave();
    render();
  },
  { passive: false },
);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    spacePan = true;
  }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }
  const key = event.key.toUpperCase();
  const map: Record<string, Tool> = {
    H: 'hand',
    V: 'select',
    R: 'rect',
    D: 'diamond',
    O: 'ellipse',
    A: 'arrow',
    L: 'line',
    P: 'pencil',
    T: 'text',
    E: 'eraser',
  };
  if (map[key]) {
    event.preventDefault();
    setTool(map[key]);
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedId) {
      elements = elements.filter((el) => el.id !== selectedId);
      selectedId = null;
      scheduleSave();
      render();
    }
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    spacePan = false;
  }
});

for (const btn of document.querySelectorAll<HTMLButtonElement>('.tool[data-tool]')) {
  btn.addEventListener('click', () => {
    const next = btn.dataset.tool as Tool;
    setTool(next);
  });
}

menuBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  menu.hidden = !menu.hidden;
});

menu.addEventListener('click', async (event) => {
  const btn = (event.target as HTMLElement).closest('button[data-action]') as HTMLButtonElement | null;
  if (!btn) {
    return;
  }
  const action = btn.dataset.action;
  menu.hidden = true;
  if (action === 'clear') {
    elements = [];
    selectedId = null;
    scheduleSave();
    welcome.hidden = false;
    render();
  } else if (action === 'save') {
    await api.saveScene({ elements, camera });
    api.notify('Scene saved');
  } else if (action === 'close') {
    await api.close();
  }
});

welcomeStart.addEventListener('click', () => {
  hideWelcome();
  setTool('pencil');
});

window.addEventListener('resize', resize);

async function init(): Promise<void> {
  settings = await api.getSettings();
  const scene = await api.loadScene();
  if (scene && Array.isArray(scene.elements)) {
    elements = scene.elements as DrawElement[];
    if (scene.camera) {
      camera = scene.camera;
    }
    if (elements.length > 0) {
      welcome.hidden = true;
    }
  }
  setTool('select');
  resize();
}

void init();
