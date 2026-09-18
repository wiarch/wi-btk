import { ipcMain } from 'electron';

/** WI-Cam is renderer-only (getUserMedia + canvas filters). */
export function setupWicamIpc(): void {
  ipcMain.handle('wicam:ping', async () => ({ ok: true }));
}

export function teardownWicam(): void {
  // no-op
}
