import { BrowserWindow, ipcMain, net } from 'electron';
import { notifySimple } from '../../shell/main/notifications';
import { loadWiweatherSettings, saveWiweatherSettings } from './settingsStore';
import {
  mergeWiweatherSettings,
  type WeatherPlace,
  type WiweatherSettings,
} from '../../../shared/settings/wiweather';

function broadcast(settings: WiweatherSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('wiweather:settingsChanged', settings);
    }
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await net.fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

type GeocodeResult = {
  results?: Array<{
    name: string;
    country?: string;
    latitude: number;
    longitude: number;
    timezone?: string;
  }>;
};

type ForecastResult = {
  timezone?: string;
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

export function setupWiweatherIpc(): void {
  ipcMain.handle('wiweather:getSettings', async () => loadWiweatherSettings());

  ipcMain.handle('wiweather:saveSettings', async (_event, raw: Partial<WiweatherSettings>) => {
    try {
      const settings = mergeWiweatherSettings(raw);
      await saveWiweatherSettings(settings);
      broadcast(settings);
      return { ok: true as const, settings };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle('wiweather:search', async (_event, query: string) => {
    const q = String(query || '').trim();
    if (q.length < 2) {
      return { ok: true as const, places: [] as WeatherPlace[] };
    }
    try {
      const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
        `&count=8&language=es&format=json`;
      const data = (await fetchJson(url)) as GeocodeResult;
      const places: WeatherPlace[] = (data.results ?? []).map((item) => ({
        name: item.name,
        country: item.country || '',
        latitude: item.latitude,
        longitude: item.longitude,
        timezone: item.timezone || 'auto',
      }));
      return { ok: true as const, places };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
        places: [] as WeatherPlace[],
      };
    }
  });

  ipcMain.handle('wiweather:forecast', async (_event, place?: WeatherPlace) => {
    const settings = await loadWiweatherSettings();
    const target = place ?? settings.place;
    const tempUnit = settings.units === 'fahrenheit' ? 'fahrenheit' : 'celsius';
    const windUnit = settings.units === 'fahrenheit' ? 'mph' : 'kmh';
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${target.latitude}` +
        `&longitude=${target.longitude}` +
        `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
        `&timezone=${encodeURIComponent(target.timezone || 'auto')}` +
        `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}&forecast_days=7`;
      const data = (await fetchJson(url)) as ForecastResult;
      return {
        ok: true as const,
        place: target,
        units: settings.units,
        current: data.current ?? null,
        daily: data.daily ?? null,
        timezone: data.timezone || target.timezone,
      };
    } catch (error) {
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.on('wiweather:notify', (_event, message: string) => {
    notifySimple('WI-Weather', String(message));
  });
}

export function teardownWiweather(): void {
  // no workers
}
