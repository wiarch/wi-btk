export {};

type FilterId =
  | 'normal'
  | 'noir'
  | 'sepia'
  | 'warm'
  | 'cool'
  | 'invert'
  | 'poster'
  | 'pixel'
  | 'sketch'
  | 'comic'
  | 'vhs'
  | 'neon'
  | 'dream'
  | 'xpro'
  | 'mono-red'
  | 'mono-blue';

type FilterDef = {
  id: FilterId;
  name: string;
  thumb: string;
};

const FILTERS: FilterDef[] = [
  { id: 'normal', name: 'Normal', thumb: 'linear-gradient(135deg,#444,#222)' },
  { id: 'noir', name: 'Noir', thumb: 'linear-gradient(135deg,#111,#777)' },
  { id: 'sepia', name: 'Sepia', thumb: 'linear-gradient(135deg,#6b4423,#d2a679)' },
  { id: 'warm', name: 'Warm', thumb: 'linear-gradient(135deg,#ff7a18,#ffd166)' },
  { id: 'cool', name: 'Cool', thumb: 'linear-gradient(135deg,#3a86ff,#90e0ef)' },
  { id: 'invert', name: 'Invert', thumb: 'linear-gradient(135deg,#fff,#000)' },
  { id: 'poster', name: 'Poster', thumb: 'linear-gradient(135deg,#e63946,#457b9d,#f4a261)' },
  { id: 'pixel', name: 'Pixel', thumb: 'repeating-linear-gradient(90deg,#222 0 8px,#666 8px 16px)' },
  { id: 'sketch', name: 'Sketch', thumb: 'linear-gradient(135deg,#eee,#999)' },
  { id: 'comic', name: 'Comic', thumb: 'linear-gradient(135deg,#ff006e,#8338ec,#ffbe0b)' },
  { id: 'vhs', name: 'VHS', thumb: 'linear-gradient(180deg,#111 0 20%,#2a9d8f 20% 40%,#e9c46a 40% 60%,#e76f51 60% 80%,#111 80%)' },
  { id: 'neon', name: 'Neon', thumb: 'linear-gradient(135deg,#ff00aa,#00ffe0)' },
  { id: 'dream', name: 'Dream', thumb: 'linear-gradient(135deg,#f8edeb,#ffcad4,#bde0fe)' },
  { id: 'xpro', name: 'XPro', thumb: 'linear-gradient(135deg,#264653,#2a9d8f,#e9c46a)' },
  { id: 'mono-red', name: 'Red', thumb: 'linear-gradient(135deg,#3d0000,#ff0033)' },
  { id: 'mono-blue', name: 'Blue', thumb: 'linear-gradient(135deg,#001a33,#00a2ff)' },
];

const video = document.getElementById('cam-video') as HTMLVideoElement;
const canvas = document.getElementById('cam-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
const statusEl = document.getElementById('status') as HTMLElement;
const filtersEl = document.getElementById('filters') as HTMLElement;
const cameraSelect = document.getElementById('camera-select') as HTMLSelectElement;
const btnMirror = document.getElementById('btn-mirror') as HTMLButtonElement;
const btnSnap = document.getElementById('btn-snap') as HTMLButtonElement;
const btnTimer = document.getElementById('btn-timer') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const btnPopout = document.getElementById('btn-popout') as HTMLButtonElement;
const flashEl = document.getElementById('flash') as HTMLElement;
const countdownEl = document.getElementById('countdown') as HTMLElement;
const shotsEl = document.getElementById('shots') as HTMLElement;
const shotsScroll = document.getElementById('shots-scroll') as HTMLElement;

let stream: MediaStream | null = null;
let filterId: FilterId = 'normal';
let mirror = true;
let raf = 0;
let timerOn = false;
let snapping = false;
const shots: string[] = [];

const work = document.createElement('canvas');
const wctx = work.getContext('2d', { willReadFrequently: true })!;
const tmp = document.createElement('canvas');
const tctx = tmp.getContext('2d', { willReadFrequently: true })!;

function setStatus(text: string | null): void {
  if (!text) {
    statusEl.hidden = true;
    statusEl.textContent = '';
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = text;
}

function clamp(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : n;
}

function applyFilter(imageData: ImageData, id: FilterId): void {
  const d = imageData.data;
  const w = imageData.width;
  const h = imageData.height;

  if (id === 'normal') {
    return;
  }

  if (id === 'pixel') {
    const block = 10;
    for (let by = 0; by < h; by += block) {
      for (let bx = 0; bx < w; bx += block) {
        const i = (by * w + bx) * 4;
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];
        for (let y = by; y < Math.min(by + block, h); y += 1) {
          for (let x = bx; x < Math.min(bx + block, w); x += 1) {
            const j = (y * w + x) * 4;
            d[j] = r;
            d[j + 1] = g;
            d[j + 2] = b;
          }
        }
      }
    }
    return;
  }

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];

    if (id === 'noir' || id === 'sketch') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = g = b = gray;
    } else if (id === 'sepia') {
      r = clamp(0.393 * r + 0.769 * g + 0.189 * b);
      g = clamp(0.349 * d[i] + 0.686 * d[i + 1] + 0.168 * d[i + 2]);
      b = clamp(0.272 * d[i] + 0.534 * d[i + 1] + 0.131 * d[i + 2]);
    } else if (id === 'warm') {
      r = clamp(r * 1.15 + 12);
      g = clamp(g * 1.02);
      b = clamp(b * 0.85);
    } else if (id === 'cool') {
      r = clamp(r * 0.9);
      g = clamp(g * 1.02);
      b = clamp(b * 1.18 + 8);
    } else if (id === 'invert') {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    } else if (id === 'poster' || id === 'comic') {
      r = Math.round(r / 64) * 64;
      g = Math.round(g / 64) * 64;
      b = Math.round(b / 64) * 64;
    } else if (id === 'vhs') {
      r = clamp(r * 1.1);
      g = clamp(g * 0.95);
      b = clamp(b * 1.05);
      if (((i / 4) % w) % 3 === 0) {
        r = clamp(r + 18);
      }
    } else if (id === 'neon') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray * 0.2 + (255 - gray) * 0.9);
      g = clamp(gray * 0.1);
      b = clamp(gray * 0.35 + (255 - gray) * 0.75);
    } else if (id === 'dream') {
      r = clamp(r * 0.92 + 28);
      g = clamp(g * 0.95 + 18);
      b = clamp(b * 1.05 + 22);
    } else if (id === 'xpro') {
      r = clamp(r * 1.2 - 10);
      g = clamp(g * 1.05);
      b = clamp(b * 0.8 + 20);
    } else if (id === 'mono-red') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray * 1.2);
      g = clamp(gray * 0.15);
      b = clamp(gray * 0.2);
    } else if (id === 'mono-blue') {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = clamp(gray * 0.15);
      g = clamp(gray * 0.35);
      b = clamp(gray * 1.25);
    }

    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
  }

  if (id === 'sketch' || id === 'comic') {
    const copy = new Uint8ClampedArray(d);
    const row = w * 4;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const i = (y * w + x) * 4;
        const tl = copy[i - row - 4];
        const t = copy[i - row];
        const tr = copy[i - row + 4];
        const l = copy[i - 4];
        const r = copy[i + 4];
        const bl = copy[i + row - 4];
        const btm = copy[i + row];
        const br = copy[i + row + 4];
        const gx = -tl + tr - 2 * l + 2 * r - bl + br;
        const gy = -tl - 2 * t - tr + bl + 2 * btm + br;
        const mag = Math.min(255, Math.hypot(gx, gy));
        if (id === 'sketch') {
          const v = 255 - mag;
          d[i] = d[i + 1] = d[i + 2] = v;
        } else if (mag > 90) {
          d[i] = d[i + 1] = d[i + 2] = 20;
        }
      }
    }
  }

  if (id === 'vhs' || id === 'dream' || id === 'xpro' || id === 'noir') {
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.hypot(cx, cy);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        const v = Math.hypot(x - cx, y - cy) / maxR;
        const dark = 1 - Math.max(0, v - 0.45) * 1.35;
        d[i] = clamp(d[i] * dark);
        d[i + 1] = clamp(d[i + 1] * dark);
        d[i + 2] = clamp(d[i + 2] * dark);
      }
    }
  }

  if (id === 'vhs') {
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 1) {
        const i = (y * w + x) * 4;
        d[i] = clamp(d[i] * 0.75);
        d[i + 1] = clamp(d[i + 1] * 0.75);
        d[i + 2] = clamp(d[i + 2] * 0.75);
      }
    }
  }
}

function drawFrame(): void {
  raf = requestAnimationFrame(drawFrame);
  if (video.readyState < 2) {
    return;
  }

  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  if (canvas.width !== vw || canvas.height !== vh) {
    canvas.width = vw;
    canvas.height = vh;
    work.width = vw;
    work.height = vh;
  }

  wctx.save();
  if (mirror) {
    wctx.translate(vw, 0);
    wctx.scale(-1, 1);
  }
  wctx.drawImage(video, 0, 0, vw, vh);
  wctx.restore();

  if (filterId === 'normal') {
    ctx.drawImage(work, 0, 0);
    return;
  }

  const heavy = filterId === 'sketch' || filterId === 'comic' || filterId === 'pixel';
  const scale = heavy ? 0.5 : filterId === 'vhs' || filterId === 'dream' ? 0.65 : 0.85;
  const sw = Math.max(1, Math.floor(vw * scale));
  const sh = Math.max(1, Math.floor(vh * scale));
  if (tmp.width !== sw || tmp.height !== sh) {
    tmp.width = sw;
    tmp.height = sh;
  }
  tctx.drawImage(work, 0, 0, sw, sh);
  const data = tctx.getImageData(0, 0, sw, sh);
  applyFilter(data, filterId);
  tctx.putImageData(data, 0, 0);
  ctx.imageSmoothingEnabled = filterId !== 'pixel';
  ctx.clearRect(0, 0, vw, vh);
  ctx.drawImage(tmp, 0, 0, vw, vh);
}

async function listCameras(): Promise<void> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter((d) => d.kind === 'videoinput');
  const prev = cameraSelect.value;
  cameraSelect.innerHTML = '';
  for (const cam of cams) {
    const opt = document.createElement('option');
    opt.value = cam.deviceId;
    opt.textContent = cam.label || `Cámara ${cameraSelect.options.length + 1}`;
    cameraSelect.append(opt);
  }
  if (prev && [...cameraSelect.options].some((o) => o.value === prev)) {
    cameraSelect.value = prev;
  }
}

async function startCamera(deviceId?: string): Promise<void> {
  setStatus('Pidiendo permiso de cámara…');
  stream?.getTracks().forEach((t) => t.stop());
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    video.srcObject = stream;
    await video.play();
    await listCameras();
    setStatus(null);
    cancelAnimationFrame(raf);
    drawFrame();
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    setStatus(`Sin cámara: ${msg}`);
  }
}

function buildFilters(): void {
  filtersEl.innerHTML = '';
  for (const f of FILTERS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `filter-chip${f.id === filterId ? ' active' : ''}`;
    btn.dataset.id = f.id;
    btn.setAttribute('role', 'option');
    btn.innerHTML = `<div class="thumb" style="background:${f.thumb}"></div><span class="name">${f.name}</span>`;
    btn.addEventListener('click', () => {
      filterId = f.id;
      for (const el of filtersEl.querySelectorAll('.filter-chip')) {
        el.classList.toggle('active', (el as HTMLElement).dataset.id === filterId);
      }
    });
    filtersEl.append(btn);
  }
}

function renderShots(): void {
  if (shots.length === 0) {
    shotsEl.hidden = true;
    btnClear.hidden = true;
    shotsScroll.innerHTML = '';
    return;
  }
  shotsEl.hidden = false;
  btnClear.hidden = false;
  shotsScroll.innerHTML = '';
  shots.forEach((url, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'shot';
    const img = document.createElement('img');
    img.src = url;
    img.alt = `Foto ${i + 1}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `wi-cam-${Date.now()}-${i}.png`;
    link.title = 'Descargar';
    const del = document.createElement('button');
    del.type = 'button';
    del.textContent = '×';
    del.title = 'Quitar';
    del.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      shots.splice(i, 1);
      renderShots();
    });
    wrap.append(img, link, del);
    shotsScroll.append(wrap);
  });
}

function captureNow(): void {
  flashEl.hidden = false;
  void flashEl.offsetWidth;
  flashEl.addEventListener(
    'animationend',
    () => {
      flashEl.hidden = true;
    },
    { once: true },
  );
  shots.unshift(canvas.toDataURL('image/png'));
  if (shots.length > 24) {
    shots.length = 24;
  }
  renderShots();
}

async function snap(): Promise<void> {
  if (snapping || video.readyState < 2) {
    return;
  }
  snapping = true;
  try {
    if (timerOn) {
      countdownEl.hidden = false;
      for (let n = 3; n >= 1; n -= 1) {
        countdownEl.textContent = String(n);
        await new Promise((r) => setTimeout(r, 700));
      }
      countdownEl.hidden = true;
    }
    captureNow();
  } finally {
    snapping = false;
  }
}

function init(): void {
  buildFilters();
  btnMirror.setAttribute('aria-pressed', mirror ? 'true' : 'false');

  btnMirror.addEventListener('click', () => {
    mirror = !mirror;
    btnMirror.setAttribute('aria-pressed', mirror ? 'true' : 'false');
  });

  btnTimer.addEventListener('click', () => {
    timerOn = !timerOn;
    btnTimer.textContent = timerOn ? '3s✓' : '3s';
    btnTimer.style.borderColor = timerOn ? 'var(--accent)' : '';
  });

  btnSnap.addEventListener('click', () => {
    void snap();
  });

  btnClear.addEventListener('click', () => {
    shots.length = 0;
    renderShots();
  });

  cameraSelect.addEventListener('change', () => {
    void startCamera(cameraSelect.value || undefined);
  });

  btnPopout.addEventListener('click', () => {
    window.parent.postMessage({ channel: 'wi-shell', method: 'openPopout', args: ['wicam'] }, '*');
  });

  window.addEventListener('keydown', (e) => {
    if (
      e.code === 'Space' &&
      !(e.target instanceof HTMLInputElement) &&
      !(e.target instanceof HTMLSelectElement)
    ) {
      e.preventDefault();
      void snap();
    }
  });

  void startCamera();
}

void init();
