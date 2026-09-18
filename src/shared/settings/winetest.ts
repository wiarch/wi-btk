export type NetestConnectionMode = 'multi' | 'single';

export type NetestResult = {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  downLatencyMs: number;
  upLatencyMs: number;
  finishedAt: string;
};

export type NetestSettings = {
  connectionMode: NetestConnectionMode;
  lastResult: NetestResult | null;
  serverLabel: string;
  serverLocation: string;
};

export const DEFAULT_NETEST_SETTINGS: NetestSettings = {
  connectionMode: 'multi',
  lastResult: null,
  serverLabel: 'Cloudflare',
  serverLocation: 'Auto',
};

export const NETEST_APP_ID = 'winetest';
