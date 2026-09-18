export {};

type WeatherPlace = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

type WiweatherSettings = {
  place: WeatherPlace;
  units: 'celsius' | 'fahrenheit';
};

type ForecastPayload = {
  ok: boolean;
  error?: string;
  place?: WeatherPlace;
  units?: 'celsius' | 'fahrenheit';
  timezone?: string;
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    precipitation: number;
  } | null;
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  } | null;
};

type WiWeatherApi = {
  getSettings(): Promise<WiweatherSettings>;
  saveSettings(settings: Partial<WiweatherSettings>): Promise<{ ok: boolean; settings?: WiweatherSettings }>;
  search(query: string): Promise<{ ok: boolean; places: WeatherPlace[]; error?: string }>;
  forecast(place?: WeatherPlace): Promise<ForecastPayload>;
  notify(message: string): void;
  onSettingsChanged?(listener: (settings: WiweatherSettings) => void): () => void;
};

type ShellApi = { openPopout(appId: string): Promise<{ ok: boolean }> };

const cityInput = document.getElementById('city-input') as HTMLInputElement;
const suggestions = document.getElementById('suggestions') as HTMLDivElement;
const unitBtn = document.getElementById('unit-btn') as HTMLButtonElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const popoutBtn = document.getElementById('popout-btn') as HTMLButtonElement;
const placeName = document.getElementById('place-name') as HTMLParagraphElement;
const conditionEl = document.getElementById('condition') as HTMLParagraphElement;
const weatherIcon = document.getElementById('weather-icon') as HTMLDivElement;
const tempEl = document.getElementById('temp') as HTMLDivElement;
const feelsEl = document.getElementById('feels') as HTMLSpanElement;
const humidityEl = document.getElementById('humidity') as HTMLSpanElement;
const windEl = document.getElementById('wind') as HTMLSpanElement;
const forecastEl = document.getElementById('forecast') as HTMLDivElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;

const state = {
  settings: null as WiweatherSettings | null,
};

let reqId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let searchTimer = 0 as ReturnType<typeof setTimeout> | 0;

function bridgeCall(method: string, args: unknown[] = []): Promise<unknown> {
  const api = (window as unknown as { wiWeather?: Record<string, (...a: unknown[]) => unknown> }).wiWeather;
  if (api && typeof api[method] === 'function') {
    return Promise.resolve(api[method](...args));
  }
  const id = reqId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ channel: 'wi-weather', id, method, args }, '*');
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('WI-Weather bridge timeout'));
      }
    }, 20_000);
  });
}

window.addEventListener('message', (event: MessageEvent) => {
  const data = event.data as {
    channel?: string;
    id?: number;
    result?: unknown;
    error?: string;
    settings?: WiweatherSettings;
  };
  if (data?.channel === 'wi-weather-response' && typeof data.id === 'number') {
    const entry = pending.get(data.id);
    if (!entry) return;
    pending.delete(data.id);
    if (data.error) entry.reject(new Error(data.error));
    else entry.resolve(data.result);
    return;
  }
  if (data?.channel === 'wi-weather-settings' && data.settings) {
    state.settings = data.settings;
    syncUnitButton();
    void loadForecast();
  }
});

async function getApi(): Promise<WiWeatherApi> {
  const existing = (window as unknown as { wiWeather?: WiWeatherApi }).wiWeather;
  if (existing) return existing;
  return {
    getSettings: () => bridgeCall('getSettings') as Promise<WiweatherSettings>,
    saveSettings: (settings) =>
      bridgeCall('saveSettings', [settings]) as Promise<{ ok: boolean; settings?: WiweatherSettings }>,
    search: (query) =>
      bridgeCall('search', [query]) as Promise<{ ok: boolean; places: WeatherPlace[]; error?: string }>,
    forecast: (place) => bridgeCall('forecast', [place]) as Promise<ForecastPayload>,
    notify: (message) => {
      void bridgeCall('notify', [message]);
    },
  };
}

function weatherInfo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'Despejado' };
  if (code <= 3) return { icon: '⛅', label: 'Parcialmente nublado' };
  if (code <= 48) return { icon: '🌫️', label: 'Niebla' };
  if (code <= 57) return { icon: '🌦️', label: 'Llovizna' };
  if (code <= 67) return { icon: '🌧️', label: 'Lluvia' };
  if (code <= 77) return { icon: '🌨️', label: 'Nieve' };
  if (code <= 82) return { icon: '🌧️', label: 'Chubascos' };
  if (code <= 86) return { icon: '🌨️', label: 'Chubascos de nieve' };
  if (code <= 99) return { icon: '⛈️', label: 'Tormenta' };
  return { icon: '☁', label: 'Clima' };
}

function unitSymbol(): string {
  return state.settings?.units === 'fahrenheit' ? '°F' : '°C';
}

function windUnit(): string {
  return state.settings?.units === 'fahrenheit' ? 'mph' : 'km/h';
}

function syncUnitButton(): void {
  unitBtn.textContent = unitSymbol();
}

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function weekdayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function renderForecast(payload: ForecastPayload): void {
  const place = payload.place;
  const current = payload.current;
  if (!place || !current) {
    conditionEl.textContent = payload.error ?? 'Sin datos';
    return;
  }

  const info = weatherInfo(current.weather_code);
  placeName.textContent = `${place.name}${place.country ? `, ${place.country}` : ''}`;
  conditionEl.textContent = info.label;
  weatherIcon.textContent = info.icon;
  tempEl.textContent = `${Math.round(current.temperature_2m)}${unitSymbol()}`;
  feelsEl.textContent = `Sensación ${Math.round(current.apparent_temperature)}${unitSymbol()}`;
  humidityEl.textContent = `Humedad ${Math.round(current.relative_humidity_2m)}%`;
  windEl.textContent = `Viento ${Math.round(current.wind_speed_10m)} ${windUnit()}`;

  forecastEl.innerHTML = '';
  const daily = payload.daily;
  if (!daily?.time?.length) return;

  for (let i = 0; i < daily.time.length; i += 1) {
    const dayInfo = weatherInfo(daily.weather_code[i] ?? 0);
    const row = document.createElement('div');
    row.className = 'day';
    row.innerHTML = `
      <span class="name"></span>
      <span class="icon"></span>
      <span class="range"></span>
      <span class="rain"></span>
    `;
    (row.querySelector('.name') as HTMLElement).textContent = weekdayLabel(daily.time[i]);
    (row.querySelector('.icon') as HTMLElement).textContent = dayInfo.icon;
    (row.querySelector('.range') as HTMLElement).textContent =
      `${Math.round(daily.temperature_2m_min[i])}° / ${Math.round(daily.temperature_2m_max[i])}°`;
    (row.querySelector('.rain') as HTMLElement).textContent =
      `${Math.round(daily.precipitation_probability_max[i] ?? 0)}%`;
    forecastEl.append(row);
  }
}

async function loadForecast(place?: WeatherPlace): Promise<void> {
  const api = await getApi();
  setStatus('Actualizando…');
  const payload = await api.forecast(place);
  if (!payload.ok) {
    setStatus(payload.error ?? 'Error al cargar clima');
    return;
  }
  renderForecast(payload);
  setStatus(`Actualizado ${new Date().toLocaleTimeString()}`);
}

async function choosePlace(place: WeatherPlace): Promise<void> {
  const api = await getApi();
  suggestions.classList.add('hidden');
  cityInput.value = '';
  const result = await api.saveSettings({
    ...(state.settings ?? { units: 'celsius', place }),
    place,
  });
  if (result.settings) {
    state.settings = result.settings;
  }
  await loadForecast(place);
}

cityInput.addEventListener('input', () => {
  if (searchTimer) clearTimeout(searchTimer);
  const query = cityInput.value.trim();
  if (query.length < 2) {
    suggestions.classList.add('hidden');
    return;
  }
  searchTimer = setTimeout(async () => {
    const api = await getApi();
    const result = await api.search(query);
    suggestions.innerHTML = '';
    if (!result.places?.length) {
      suggestions.classList.add('hidden');
      return;
    }
    for (const place of result.places) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'suggestion';
      btn.textContent = `${place.name}${place.country ? `, ${place.country}` : ''}`;
      btn.addEventListener('click', () => {
        void choosePlace(place);
      });
      suggestions.append(btn);
    }
    suggestions.classList.remove('hidden');
  }, 280);
});

unitBtn.addEventListener('click', async () => {
  if (!state.settings) return;
  const api = await getApi();
  const units = state.settings.units === 'celsius' ? 'fahrenheit' : 'celsius';
  const result = await api.saveSettings({ ...state.settings, units });
  if (result.settings) {
    state.settings = result.settings;
    syncUnitButton();
    await loadForecast();
  }
});

refreshBtn.addEventListener('click', () => {
  void loadForecast();
});

popoutBtn.addEventListener('click', async () => {
  const shell = (window as unknown as { wiShell?: ShellApi }).wiShell;
  if (shell) {
    await shell.openPopout('wiweather');
    return;
  }
  window.parent.postMessage({ channel: 'wi-shell', method: 'openPopout', args: ['wiweather'] }, '*');
});

window.addEventListener('mousedown', (event) => {
  if (!(event.target instanceof HTMLElement)) return;
  if (event.target.closest('.search')) return;
  suggestions.classList.add('hidden');
});

async function boot(): Promise<void> {
  const api = await getApi();
  state.settings = await api.getSettings();
  syncUnitButton();
  await loadForecast();
  api.onSettingsChanged?.((settings) => {
    state.settings = settings;
    syncUnitButton();
    void loadForecast();
  });
}

void boot().catch((error) => {
  setStatus(error instanceof Error ? error.message : String(error));
});
