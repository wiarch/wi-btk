import { appendFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { app } from 'electron';

function getLogFile(): string {
  try {
    return join(app.getPath('userData'), 'wi-rec.log');
  } catch {
    return join(homedir(), '.config', 'wi-rec', 'wi-rec.log');
  }
}

export async function log(message: string): Promise<void> {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  console.log(`[WI-Rec] ${message}`);

  try {
    const logFile = getLogFile();
    await mkdir(join(logFile, '..'), { recursive: true });
    await appendFile(logFile, line, 'utf8');
  } catch {
    // ignore log failures
  }
}
