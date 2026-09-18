/** Catalog of WI-BTK micro-apps. Add new apps here. */
export const MICRO_APP_IDS = [
  'wirec',
  'wiclick',
  'wibutton',
  'wibooster',
  'wicalc',
  'wiclock',
  'winotes',
  'wirate',
  'wisystem',
  'widimmer',
  'witranslate',
  'widraw',
  'widevice',
  'winetest',
  'wicam',
] as const;

export type MicroAppId = (typeof MICRO_APP_IDS)[number] | (string & {});

export type AppEnablement = Record<string, boolean>;

export const DEFAULT_APP_ENABLEMENT: AppEnablement = {
  wirec: true,
  wiclick: true,
  wibutton: true,
  wibooster: true,
  wicalc: true,
  wiclock: true,
  winotes: true,
  wirate: true,
  wisystem: true,
  widimmer: true,
  witranslate: true,
  widraw: true,
  widevice: true,
  winetest: true,
  wicam: true,
};

export function mergeAppEnablement(partial?: Partial<AppEnablement> | null): AppEnablement {
  const next: AppEnablement = { ...DEFAULT_APP_ENABLEMENT };
  if (partial) {
    for (const [id, value] of Object.entries(partial)) {
      next[id] = Boolean(value);
    }
  }
  return next;
}

export function isAppEnabled(enablement: AppEnablement | undefined, appId: string): boolean {
  if (!enablement || !(appId in enablement)) {
    return DEFAULT_APP_ENABLEMENT[appId] ?? true;
  }
  return Boolean(enablement[appId]);
}

/** Register a future app id with default enabled=true. */
export function ensureAppInEnablement(
  enablement: AppEnablement,
  appId: string,
  defaultEnabled = true,
): AppEnablement {
  if (appId in enablement) {
    return enablement;
  }
  return { ...enablement, [appId]: defaultEnabled };
}
