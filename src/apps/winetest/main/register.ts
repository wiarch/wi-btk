import { ipcMain } from 'electron';
import { fetchPublicIp, runSpeedTest, type SpeedProgress } from './speedEngine';

const activeRuns = new Map<number, AbortController>();
let runSeq = 0;

export function setupWinetestIpc(): void {
  ipcMain.handle('winetest:getPublicIp', async () => fetchPublicIp());

  ipcMain.handle('winetest:run', async (event, mode: 'multi' | 'single') => {
    const runId = (runSeq += 1);
    const controller = new AbortController();
    activeRuns.set(runId, controller);

    const sendProgress = (progress: SpeedProgress): void => {
      if (!event.sender.isDestroyed()) {
        event.sender.send('winetest:progress', progress);
      }
    };

    try {
      const sample = await runSpeedTest(
        mode === 'single' ? 'single' : 'multi',
        sendProgress,
        controller.signal,
      );
      return { ok: true as const, runId, sample };
    } catch (error) {
      if (controller.signal.aborted || (error as Error)?.name === 'AbortError') {
        return { ok: false as const, runId, aborted: true as const, error: 'Aborted' };
      }
      return {
        ok: false as const,
        runId,
        aborted: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      activeRuns.delete(runId);
    }
  });

  ipcMain.handle('winetest:abort', async () => {
    for (const controller of activeRuns.values()) {
      controller.abort();
    }
    activeRuns.clear();
    return { ok: true as const };
  });
}

export function teardownWinetest(): void {
  for (const controller of activeRuns.values()) {
    controller.abort();
  }
  activeRuns.clear();
}
