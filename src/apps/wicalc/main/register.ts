import { ipcMain } from 'electron';

/** Calc is renderer-only; popout handled by shell popout manager. */
export function setupWicalcIpc(): void {
  ipcMain.handle('wicalc:ping', async () => ({ ok: true }));
}

export function teardownWicalc(): void {
  // no-op
}
