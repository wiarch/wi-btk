import { appendFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

const LOG_DIR = join(homedir(), '.config', 'wi-print');
const LOG_FILE = join(LOG_DIR, 'wi-print.log');

export async function log(message: string): Promise<void> {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  console.log(`[WI-Print] ${message}`);

  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, line, 'utf8');
  } catch {
    // ignore log failures
  }
}
