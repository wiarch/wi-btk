import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

function logDir(): string {
  if (process.platform === 'win32') {
    return join(process.env.APPDATA || homedir(), 'WI-Rec', 'logs');
  }

  return join(homedir(), '.config', 'wi-rec', 'logs');
}

const LOG_FILE = join(logDir(), 'boot.log');

export function bootLog(message: string): void {
  const line = `[${new Date().toISOString()}] [pid ${process.pid}] ${message}\n`;

  try {
    mkdirSync(logDir(), { recursive: true });
    appendFileSync(LOG_FILE, line, 'utf8');
  } catch {
    // ignore
  }
}

export function getBootLogPath(): string {
  return LOG_FILE;
}
