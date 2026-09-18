export type WeatherPlace = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type WiweatherSettings = {
  place: WeatherPlace;
  units: 'celsius' | 'fahrenheit';
};

export const DEFAULT_WIWEATHER_SETTINGS: WiweatherSettings = {
  place: {
    name: 'Caracas',
    country: 'Venezuela',
    latitude: 10.4806,
    longitude: -66.9036,
    timezone: 'America/Caracas',
  },
  units: 'celsius',
};

export const WIWEATHER_APP_ID = 'wiweather';

export function mergeWiweatherSettings(
  partial?: Partial<WiweatherSettings> | null,
): WiweatherSettings {
  const base = {
    place: { ...DEFAULT_WIWEATHER_SETTINGS.place },
    units: DEFAULT_WIWEATHER_SETTINGS.units,
  };
  if (!partial) return base;
  const place = partial.place ?? base.place;
  return {
    units: partial.units === 'fahrenheit' ? 'fahrenheit' : 'celsius',
    place: {
      name: String(place.name || base.place.name),
      country: String(place.country || base.place.country),
      latitude: Number(place.latitude) || base.place.latitude,
      longitude: Number(place.longitude) || base.place.longitude,
      timezone: String(place.timezone || base.place.timezone),
    },
  };
}
