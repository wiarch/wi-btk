import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { screen, app } from 'electron';
import {
  intervalToMs,
  type MouseButton,
  type ClickType,
  type WiclickSettings,
} from '../../../shared/settings/wiclick';

export type ClickerStatus = {
  running: boolean;
  clicks: number;
  message: string;
};

type StatusListener = (status: ClickerStatus) => void;

const PS_SCRIPT = `$ErrorActionPreference = 'Stop'
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WiClickMouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
"@
function Invoke-WiClick([string]$button, [string]$kind, [string]$move, [int]$x, [int]$y) {
  if ($move -eq '1') { [void][WiClickMouse]::SetCursorPos($x, $y) }
  $down = 0; $up = 0
  switch ($button) {
    'right'  { $down = 0x0008; $up = 0x0010 }
    'middle' { $down = 0x0020; $up = 0x0040 }
    default  { $down = 0x0002; $up = 0x0004 }
  }
  $times = if ($kind -eq 'double') { 2 } else { 1 }
  for ($i = 0; $i -lt $times; $i++) {
    [WiClickMouse]::mouse_event($down, 0, 0, 0, [UIntPtr]::Zero)
    Start-Sleep -Milliseconds 12
    [WiClickMouse]::mouse_event($up, 0, 0, 0, [UIntPtr]::Zero)
    if ($i -lt $times - 1) { Start-Sleep -Milliseconds 40 }
  }
  Write-Output 'OK'
}
Write-Output 'READY'
[Console]::Out.Flush()
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  $parts = $line.Trim() -split '\\s+'
  if ($parts.Count -lt 1) { continue }
  $cmd = $parts[0].ToUpperInvariant()
  if ($cmd -eq 'QUIT') { break }
  if ($cmd -eq 'CLICK' -and $parts.Count -ge 6) {
    try {
      Invoke-WiClick $parts[1] $parts[2] $parts[3] ([int]$parts[4]) ([int]$parts[5])
    } catch {
      Write-Output ('ERR ' + $_.Exception.Message)
    }
    [Console]::Out.Flush()
    continue
  }
  Write-Output 'ERR bad-command'
  [Console]::Out.Flush()
}
`;

let worker: ChildProcessWithoutNullStreams | null = null;
let workerReady = false;
let scriptPath: string | null = null;
let pendingResolvers: Array<(ok: boolean) => void> = [];
let running = false;
let clickCount = 0;
let timer: ReturnType<typeof setTimeout> | null = null;
let activeSettings: WiclickSettings | null = null;
const listeners = new Set<StatusListener>();

function emit(message: string): void {
  const status: ClickerStatus = { running, clicks: clickCount, message };
  for (const listener of listeners) {
    try {
      listener(status);
    } catch {
      // ignore
    }
  }
}

function ensureScriptFile(): string {
  if (scriptPath && existsSync(scriptPath)) {
    return scriptPath;
  }
  const base = app.isReady() ? app.getPath('temp') : tmpdir();
  scriptPath = join(base, 'wi-click-worker.ps1');
  writeFileSync(scriptPath, PS_SCRIPT, 'utf8');
  return scriptPath;
}

function killWorker(): void {
  workerReady = false;
  pendingResolvers.splice(0).forEach((resolve) => resolve(false));
  if (worker) {
    try {
      worker.stdin.write('QUIT\n');
    } catch {
      // ignore
    }
    try {
      worker.kill();
    } catch {
      // ignore
    }
  }
  worker = null;
}

function ensureWorker(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return Promise.resolve(false);
  }
  if (worker && workerReady && !worker.killed) {
    return Promise.resolve(true);
  }

  killWorker();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(ok);
    };

    let file: string;
    try {
      file = ensureScriptFile();
    } catch {
      finish(false);
      return;
    }

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
    );
    worker = child;
    workerReady = false;

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString('utf8');
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }
        if (trimmed === 'READY') {
          workerReady = true;
          finish(true);
          continue;
        }
        if (trimmed === 'OK' || trimmed.startsWith('ERR')) {
          const resolver = pendingResolvers.shift();
          resolver?.(trimmed === 'OK');
        }
      }
    };

    child.stdout.on('data', onData);
    child.stderr.on('data', () => undefined);
    child.on('exit', () => {
      if (worker === child) {
        worker = null;
        workerReady = false;
        pendingResolvers.splice(0).forEach((r) => r(false));
        if (running) {
          running = false;
          clearTimer();
          emit('Worker exited');
        }
        finish(false);
      }
    });

    setTimeout(() => {
      if (!workerReady) {
        killWorker();
        finish(false);
      }
    }, 8000);
  });
}

function sendClick(button: MouseButton, kind: ClickType, move: boolean, x: number, y: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!worker || !workerReady) {
      resolve(false);
      return;
    }
    pendingResolvers.push(resolve);
    const line = `CLICK ${button} ${kind} ${move ? '1' : '0'} ${Math.trunc(x)} ${Math.trunc(y)}\n`;
    try {
      worker.stdin.write(line);
    } catch {
      resolve(false);
    }
  });
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

async function tick(): Promise<void> {
  if (!running || !activeSettings) {
    return;
  }

  const settings = activeSettings;
  const move = settings.positionMode === 'fixed';
  const ok = await sendClick(
    settings.mouseButton,
    settings.clickType,
    move,
    settings.posX,
    settings.posY,
  );
  if (!ok) {
    running = false;
    clearTimer();
    emit('Click failed');
    return;
  }

  clickCount += 1;
  emit(`Running · ${clickCount} clicks`);

  if (settings.repeatMode === 'count' && clickCount >= settings.repeatCount) {
    running = false;
    clearTimer();
    emit(`Done · ${clickCount} clicks`);
    return;
  }

  timer = setTimeout(() => {
    void tick();
  }, intervalToMs(settings));
}

export function onClickerStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getClickerStatus(): ClickerStatus {
  return {
    running,
    clicks: clickCount,
    message: running
      ? `Running · ${clickCount} clicks`
      : clickCount
        ? `Stopped · ${clickCount} clicks`
        : 'Idle',
  };
}

export async function startClicker(settings: WiclickSettings): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'WI-Click is currently Windows-only' };
  }
  if (running) {
    return { ok: true };
  }

  const ready = await ensureWorker();
  if (!ready) {
    return { ok: false, error: 'Could not start click worker' };
  }

  activeSettings = settings;
  clickCount = 0;
  running = true;
  emit('Running');
  void tick();
  return { ok: true };
}

export function stopClicker(): void {
  if (!running) {
    emit(getClickerStatus().message);
    return;
  }
  running = false;
  clearTimer();
  emit(`Stopped · ${clickCount} clicks`);
}

export function toggleClicker(
  settings: WiclickSettings,
): Promise<{ ok: boolean; error?: string; running: boolean }> {
  if (running) {
    stopClicker();
    return Promise.resolve({ ok: true, running: false });
  }
  return startClicker(settings).then((result) => ({
    ...result,
    running: Boolean(result.ok),
  }));
}

export function getCursorPoint(): { x: number; y: number } {
  const point = screen.getCursorScreenPoint();
  return { x: point.x, y: point.y };
}

export function shutdownClicker(): void {
  stopClicker();
  killWorker();
  if (scriptPath && existsSync(scriptPath)) {
    try {
      unlinkSync(scriptPath);
    } catch {
      // ignore
    }
  }
  scriptPath = null;
}
