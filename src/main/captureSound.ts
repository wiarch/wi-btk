import { app } from 'electron';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { AppSettings, CaptureSoundPreset } from '../shared/settings';
import { log } from './logger';

export type RecordingSoundCue = 'start' | 'pause' | 'stop';

function soundsDir(): string {
  return join(app.getAppPath(), 'dist', 'assets', 'sounds');
}

function soundPath(preset: CaptureSoundPreset): string {
  return join(soundsDir(), `${preset}.wav`);
}

function playOnWindows(filePath: string): void {
  const escaped = filePath.replace(/'/g, "''");
  const child = spawn(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      `(New-Object System.Media.SoundPlayer '${escaped}').PlaySync()`,
    ],
    { detached: true, stdio: 'ignore', windowsHide: true },
  );
  child.unref();
}

function playOnDarwin(filePath: string): void {
  const child = spawn('afplay', [filePath], { detached: true, stdio: 'ignore' });
  child.unref();
}

function playOnLinux(filePath: string): void {
  const tryPlayers = ['paplay', 'aplay', 'pw-play'];
  let index = 0;

  const attempt = (): void => {
    const player = tryPlayers[index];
    if (!player) {
      return;
    }

    const child = spawn(player, [filePath], { detached: true, stdio: 'ignore' });
    child.on('error', () => {
      index += 1;
      attempt();
    });
    child.unref();
  };

  attempt();
}

function playFile(filePath: string): void {
  if (process.platform === 'win32') {
    playOnWindows(filePath);
    return;
  }

  if (process.platform === 'darwin') {
    playOnDarwin(filePath);
    return;
  }

  playOnLinux(filePath);
}

export function playCaptureSound(settings: AppSettings): void {
  if (!settings.captureSoundEnabled) {
    return;
  }

  try {
    playFile(soundPath(settings.captureSoundPreset));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void log(`capture sound failed: ${message}`);
  }
}

export function playRecordingSound(settings: AppSettings, cue: RecordingSoundCue): void {
  if (!settings.captureSoundEnabled) {
    return;
  }

  const filePath = join(soundsDir(), `record-${cue}.wav`);

  try {
    playFile(filePath);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void log(`recording sound failed (${cue}): ${message}`);
  }
}
