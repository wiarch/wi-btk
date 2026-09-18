export {};

type ShellApi = {
  openPopout(appId: string): Promise<{ ok: boolean }>;
  isPopoutOpen(appId: string): Promise<{ open: boolean }>;
};

function shellApi(): ShellApi | null {
  return (window as unknown as { wiShell?: ShellApi }).wiShell ?? null;
}

const display = document.getElementById('display') as HTMLDivElement;
const keys = document.getElementById('keys') as HTMLDivElement;
const popoutBtn = document.getElementById('popout-btn') as HTMLButtonElement;

let current = '0';
let stored: number | null = null;
let op: string | null = null;
let fresh = true;

function render(): void {
  display.textContent = current;
}

function inputDigit(digit: string): void {
  if (fresh || current === '0') {
    current = digit === '.' ? '0.' : digit;
    fresh = false;
  } else if (digit === '.' && current.includes('.')) {
    return;
  } else {
    current += digit;
  }
  render();
}

function applyOp(nextOp: string): void {
  const value = Number.parseFloat(current);
  if (stored != null && op && !fresh) {
    stored = compute(stored, value, op);
    current = String(stored);
  } else {
    stored = value;
  }
  op = nextOp;
  fresh = true;
  render();
}

function compute(a: number, b: number, operator: string): number {
  switch (operator) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '*':
      return a * b;
    case '/':
      return b === 0 ? NaN : a / b;
    default:
      return b;
  }
}

function equals(): void {
  if (stored == null || !op) {
    return;
  }
  const value = Number.parseFloat(current);
  const result = compute(stored, value, op);
  current = Number.isFinite(result) ? String(Number(result.toPrecision(12))) : 'Error';
  stored = null;
  op = null;
  fresh = true;
  render();
}

function clearAll(): void {
  current = '0';
  stored = null;
  op = null;
  fresh = true;
  render();
}

const layout: Array<{ label: string; action: string; className?: string }> = [
  { label: 'C', action: 'clear', className: 'op' },
  { label: '±', action: 'sign', className: 'op' },
  { label: '%', action: 'percent', className: 'op' },
  { label: '÷', action: '/', className: 'op' },
  { label: '7', action: '7' },
  { label: '8', action: '8' },
  { label: '9', action: '9' },
  { label: '×', action: '*', className: 'op' },
  { label: '4', action: '4' },
  { label: '5', action: '5' },
  { label: '6', action: '6' },
  { label: '-', action: '-', className: 'op' },
  { label: '1', action: '1' },
  { label: '2', action: '2' },
  { label: '3', action: '3' },
  { label: '+', action: '+', className: 'op' },
  { label: '0', action: '0', className: 'span-2' },
  { label: '.', action: '.' },
  { label: '=', action: '=', className: 'eq' },
];

for (const item of layout) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `key${item.className ? ` ${item.className}` : ''}`;
  btn.textContent = item.label;
  btn.addEventListener('click', () => {
    if (/^[0-9.]$/.test(item.action)) {
      inputDigit(item.action);
      return;
    }
    if (item.action === 'clear') {
      clearAll();
      return;
    }
    if (item.action === 'sign') {
      if (current.startsWith('-')) {
        current = current.slice(1);
      } else if (current !== '0') {
        current = `-${current}`;
      }
      render();
      return;
    }
    if (item.action === 'percent') {
      current = String(Number.parseFloat(current) / 100);
      render();
      return;
    }
    if (item.action === '=') {
      equals();
      return;
    }
    applyOp(item.action);
  });
  keys.append(btn);
}

popoutBtn.addEventListener('click', async () => {
  if (window.parent === window) {
    return;
  }
  const api = shellApi();
  if (api) {
    await api.openPopout('wicalc');
    return;
  }
  await new Promise<void>((resolve) => {
    const id = Date.now();
    const handler = (event: MessageEvent) => {
      const data = event.data as { channel?: string; id?: number };
      if (data?.channel === 'wi-shell-response' && data.id === id) {
        window.removeEventListener('message', handler);
        resolve();
      }
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ channel: 'wi-shell', id, method: 'openPopout', args: ['wicalc'] }, '*');
  });
});

window.addEventListener('keydown', (event) => {
  if (/^[0-9.]$/.test(event.key)) {
    inputDigit(event.key);
    return;
  }
  if (event.key === 'Enter' || event.key === '=') {
    equals();
    return;
  }
  if (event.key === 'Escape') {
    clearAll();
    return;
  }
  if (event.key === 'Backspace') {
    current = current.length <= 1 ? '0' : current.slice(0, -1);
    render();
    return;
  }
  const map: Record<string, string> = { '+': '+', '-': '-', '*': '*', '/': '/', x: '*', X: '*' };
  if (map[event.key]) {
    applyOp(map[event.key]);
  }
});

render();
