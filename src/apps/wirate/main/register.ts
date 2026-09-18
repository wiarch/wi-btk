import { BrowserWindow, ipcMain } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import { refreshMarketRates } from './marketRates';
import { loadWirateSettings, saveWirateSettings } from './settingsStore';
import {
  convertAmount,
  mergeWirateSettings,
  type RateCurrency,
  type WirateSettings,
} from '../../../shared/settings/wirate';

function broadcast(settings: WirateSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('wirate:settingsChanged', settings);
    }
  }
}

export function setupWirateIpc(): void {
  ipcMain.handle('wirate:getSettings', async () => loadWirateSettings());

  ipcMain.handle('wirate:saveSettings', async (_event, raw: Partial<WirateSettings>) => {
    try {
      const settings = mergeWirateSettings(raw);
      await saveWirateSettings(settings);
      broadcast(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle(
    'wirate:convert',
    async (
      _event,
      payload: { amount: number; from: RateCurrency; to: RateCurrency },
    ) => {
      const settings = await loadWirateSettings();
      const value = convertAmount(
        Number(payload.amount) || 0,
        payload.from,
        payload.to,
        settings,
      );
      return { ok: true as const, value, settings };
    },
  );

  ipcMain.handle('wirate:refreshMarket', async () => {
    const result = await refreshMarketRates();
    if (result.ok) {
      broadcast(result.settings);
      notifySimple('WI-Rate', 'EUR/USD updated');
    }
    return result;
  });

  ipcMain.on('wirate:notify', (_event, message: string) => {
    notifySimple('WI-Rate', String(message));
  });
}

export function teardownWirate(): void {
  // no workers
}
