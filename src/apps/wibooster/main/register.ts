import { ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import { loadWiboosterSettings, saveWiboosterSettings } from './settingsStore';
import {
  getSystemSnapshot,
  setBootLimits,
  setDisplayFrequency,
  setPowerPlan,
} from './systemControl';
import {
  mergeWiboosterSettings,
  type WiboosterSettings,
} from '../../../shared/settings/wibooster';

export function setupWiboosterIpc(): void {
  ipcMain.handle('wibooster:getSettings', async () => loadWiboosterSettings());

  ipcMain.handle('wibooster:saveSettings', async (_event, raw: Partial<WiboosterSettings>) => {
    try {
      const settings = mergeWiboosterSettings(raw);
      await saveWiboosterSettings(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('wibooster:snapshot', async () => getSystemSnapshot());

  ipcMain.handle('wibooster:setPowerPlan', async (_event, guid: string) => {
    const result = await setPowerPlan(String(guid));
    if (result.ok) {
      notifySimple('WI-Booster', 'Power plan applied');
    }
    return result;
  });

  ipcMain.handle('wibooster:setRefreshRate', async (_event, frequency: number) => {
    const result = await setDisplayFrequency(Number(frequency));
    if (result.ok) {
      notifySimple('WI-Booster', `Display set to ${Math.trunc(frequency)} Hz`);
    }
    return result;
  });

  ipcMain.handle(
    'wibooster:setBootLimits',
    async (_event, payload: { processors: number; memoryMb: number }) => {
      const result = await setBootLimits({
        processors: Number(payload?.processors) || 0,
        memoryMb: Number(payload?.memoryMb) || 0,
      });
      if (result.ok) {
        await saveWiboosterSettings(
          mergeWiboosterSettings({
            preferredProcessors: Number(payload?.processors) || 0,
            preferredMemoryMb: Number(payload?.memoryMb) || 0,
          }),
        );
        notifySimple('WI-Booster', 'Boot limits saved — reboot required');
      }
      return result;
    },
  );

  ipcMain.on('wibooster:notify', (_event, message: string) => {
    notifySimple('WI-Booster', String(message));
  });
}

export function teardownWibooster(): void {
  // no long-running workers
}
