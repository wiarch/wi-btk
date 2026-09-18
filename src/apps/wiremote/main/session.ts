import { createServer, connect, type Server, type Socket } from 'node:net';
import { networkInterfaces } from 'node:os';
import { desktopCapturer, screen } from 'electron';
import { injectRemoteInput } from './inputInject';

const TYPE_JSON = 1;
const TYPE_FRAME = 2;

export type WiremoteRole = 'idle' | 'host' | 'guest';

type JsonMessage =
  | { type: 'hello'; role: 'host' | 'guest'; pin: string }
  | { type: 'auth-ok'; screen: { width: number; height: number } }
  | { type: 'auth-fail'; reason: string }
  | { type: 'bye' }
  | {
      type: 'input';
      payload:
        | { type: 'move'; x: number; y: number }
        | { type: 'down'; button: 'left' | 'right' | 'middle'; x: number; y: number }
        | { type: 'up'; button: 'left' | 'right' | 'middle'; x: number; y: number }
        | { type: 'wheel'; deltaY: number; x: number; y: number }
        | { type: 'key'; action: 'down' | 'up'; key: string; code?: string };
    };

type SessionState = {
  role: WiremoteRole;
  server: Server | null;
  socket: Socket | null;
  pin: string;
  port: number;
  quality: number;
  fps: number;
  allowControl: boolean;
  frameTimer: ReturnType<typeof setInterval> | 0;
  buffer: Buffer;
};

const state: SessionState = {
  role: 'idle',
  server: null,
  socket: null,
  pin: '',
  port: 19876,
  quality: 55,
  fps: 10,
  allowControl: true,
  frameTimer: 0,
  buffer: Buffer.alloc(0),
};

let onEvent:
  | ((
      event:
        | { kind: 'status'; status: string }
        | { kind: 'connected'; role: WiremoteRole }
        | { kind: 'disconnected' }
        | { kind: 'frame'; data: Buffer; width: number; height: number }
        | { kind: 'error'; message: string },
    ) => void)
  | null = null;

export function setWiremoteEventHandler(
  handler: NonNullable<typeof onEvent>,
): void {
  onEvent = handler;
}

export function getLocalAddresses(): string[] {
  const nets = networkInterfaces();
  const list: string[] = [];
  for (const entries of Object.values(nets)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.internal) continue;
      if (String(entry.family) === 'IPv4' || (entry.family as unknown) === 4) {
        list.push(entry.address);
      }
    }
  }
  return list.length ? list : ['127.0.0.1'];
}

function makePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function emitStatus(status: string): void {
  onEvent?.({ kind: 'status', status });
}

function writePacket(socket: Socket, type: number, payload: Buffer): void {
  if (socket.destroyed) return;
  const header = Buffer.alloc(5);
  header.writeUInt32BE(payload.length + 1, 0);
  header.writeUInt8(type, 4);
  socket.write(Buffer.concat([header, payload]));
}

function sendJson(socket: Socket, message: JsonMessage): void {
  writePacket(socket, TYPE_JSON, Buffer.from(JSON.stringify(message), 'utf8'));
}

function stopFrames(): void {
  if (state.frameTimer) {
    clearInterval(state.frameTimer);
    state.frameTimer = 0;
  }
}

async function captureFrame(): Promise<{ jpeg: Buffer; width: number; height: number } | null> {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;
  const maxW = 1280;
  const scale = Math.min(1, maxW / width);
  const tw = Math.max(2, Math.round(width * scale));
  const th = Math.max(2, Math.round(height * scale));
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: tw, height: th },
  });
  const source = sources[0];
  if (!source || source.thumbnail.isEmpty()) {
    return null;
  }
  return {
    jpeg: source.thumbnail.toJPEG(state.quality),
    width: source.thumbnail.getSize().width,
    height: source.thumbnail.getSize().height,
  };
}

function startFrames(socket: Socket): void {
  stopFrames();
  const interval = Math.max(50, Math.round(1000 / state.fps));
  let busy = false;
  state.frameTimer = setInterval(() => {
    if (busy || socket.destroyed) return;
    busy = true;
    void captureFrame()
      .then((frame) => {
        if (!frame || socket.destroyed) return;
        const meta = Buffer.alloc(8);
        meta.writeUInt32BE(frame.width, 0);
        meta.writeUInt32BE(frame.height, 4);
        writePacket(socket, TYPE_FRAME, Buffer.concat([meta, frame.jpeg]));
      })
      .catch(() => undefined)
      .finally(() => {
        busy = false;
      });
  }, interval);
}

function handleJson(message: JsonMessage, socket: Socket): void {
  if (message.type === 'hello') {
    if (state.role !== 'host') return;
    if (message.pin !== state.pin) {
      sendJson(socket, { type: 'auth-fail', reason: 'PIN incorrecto' });
      socket.end();
      return;
    }
    const display = screen.getPrimaryDisplay().size;
    sendJson(socket, {
      type: 'auth-ok',
      screen: { width: display.width, height: display.height },
    });
    state.socket = socket;
    onEvent?.({ kind: 'connected', role: 'host' });
    emitStatus('Cliente conectado — compartiendo pantalla');
    startFrames(socket);
    return;
  }

  if (message.type === 'auth-ok') {
    onEvent?.({ kind: 'connected', role: 'guest' });
    emitStatus('Conectado al host');
    return;
  }

  if (message.type === 'auth-fail') {
    onEvent?.({ kind: 'error', message: message.reason });
    detachSocket();
    return;
  }

  if (message.type === 'input') {
    if (state.role !== 'host' || !state.allowControl) return;
    injectRemoteInput(message.payload);
    return;
  }

  if (message.type === 'bye') {
    detachSocket();
  }
}

function onSocketData(chunk: Buffer): void {
  state.buffer = Buffer.concat([state.buffer, chunk]);
  while (state.buffer.length >= 5) {
    const total = state.buffer.readUInt32BE(0);
    if (state.buffer.length < 4 + total) {
      return;
    }
    const type = state.buffer.readUInt8(4);
    const payload = state.buffer.subarray(5, 4 + total);
    state.buffer = state.buffer.subarray(4 + total);

    if (type === TYPE_JSON) {
      try {
        const message = JSON.parse(payload.toString('utf8')) as JsonMessage;
        if (state.socket) {
          handleJson(message, state.socket);
        }
      } catch {
        // ignore bad json
      }
    } else if (type === TYPE_FRAME && state.role === 'guest') {
      if (payload.length < 8) continue;
      const width = payload.readUInt32BE(0);
      const height = payload.readUInt32BE(4);
      const jpeg = payload.subarray(8);
      onEvent?.({ kind: 'frame', data: jpeg, width, height });
    }
  }
}

function wireSocket(socket: Socket): void {
  state.socket = socket;
  state.buffer = Buffer.alloc(0);
  socket.on('data', onSocketData);
  socket.on('close', () => {
    if (state.socket === socket) {
      detachSocket(false);
    }
  });
  socket.on('error', () => {
    if (state.socket === socket) {
      detachSocket(false);
    }
  });
}

function detachSocket(emit = true): void {
  stopFrames();
  const socket = state.socket;
  state.socket = null;
  state.buffer = Buffer.alloc(0);
  if (socket && !socket.destroyed) {
    try {
      sendJson(socket, { type: 'bye' });
    } catch {
      // ignore
    }
    socket.destroy();
  }
  if (emit) {
    onEvent?.({ kind: 'disconnected' });
    emitStatus(state.role === 'host' ? 'Esperando cliente…' : 'Desconectado');
  }
}

export function stopWiremoteSession(): void {
  stopFrames();
  detachSocket(false);
  if (state.server) {
    state.server.close();
    state.server = null;
  }
  state.role = 'idle';
  state.pin = '';
  onEvent?.({ kind: 'disconnected' });
  emitStatus('Inactivo');
}

export async function startWiremoteHost(options: {
  port: number;
  quality: number;
  fps: number;
  allowControl: boolean;
}): Promise<{ ok: true; pin: string; port: number; addresses: string[] } | { ok: false; error: string }> {
  stopWiremoteSession();
  state.role = 'host';
  state.port = options.port;
  state.quality = options.quality;
  state.fps = options.fps;
  state.allowControl = options.allowControl;
  state.pin = makePin();

  try {
    await new Promise<void>((resolve, reject) => {
      const server = createServer((socket) => {
        if (state.socket && !state.socket.destroyed) {
          socket.destroy();
          return;
        }
        wireSocket(socket);
        emitStatus('Autenticando…');
      });
      server.once('error', reject);
      server.listen(options.port, '0.0.0.0', () => {
        state.server = server;
        resolve();
      });
    });
  } catch (error) {
    state.role = 'idle';
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  emitStatus('Esperando cliente…');
  return {
    ok: true,
    pin: state.pin,
    port: state.port,
    addresses: getLocalAddresses(),
  };
}

export async function connectWiremoteGuest(options: {
  host: string;
  port: number;
  pin: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  stopWiremoteSession();
  state.role = 'guest';
  state.pin = options.pin;

  try {
    const socket = await new Promise<Socket>((resolve, reject) => {
      const sock = connect({ host: options.host, port: options.port }, () => resolve(sock));
      sock.once('error', reject);
    });
    wireSocket(socket);
    sendJson(socket, { type: 'hello', role: 'guest', pin: options.pin });
    emitStatus('Conectando…');
    return { ok: true };
  } catch (error) {
    state.role = 'idle';
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function sendWiremoteInput(payload: {
  type: 'move' | 'down' | 'up' | 'wheel' | 'key';
  x?: number;
  y?: number;
  button?: 'left' | 'right' | 'middle';
  deltaY?: number;
  action?: 'down' | 'up';
  key?: string;
  code?: string;
}): void {
  if (state.role !== 'guest' || !state.socket || state.socket.destroyed) {
    return;
  }
  sendJson(state.socket, { type: 'input', payload: payload as never });
}

export function getWiremoteRole(): WiremoteRole {
  return state.role;
}
