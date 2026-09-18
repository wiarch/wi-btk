import { ipcMain } from 'electron';
import { collectSystemReport } from './collect';

export function setupWisystemIpc(): void {
  ipcMain.handle('wisystem:getReport', async () => {
    try {
      const report = await collectSystemReport();
      return { ok: true as const, report };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

export function teardownWisystem(): void {
  // nothing persistent
}
