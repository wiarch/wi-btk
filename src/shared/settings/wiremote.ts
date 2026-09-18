export type WiremoteSettings = {
  port: number;
  allowControl: boolean;
  quality: number;
  fps: number;
};

export const DEFAULT_WIREMOTE_SETTINGS: WiremoteSettings = {
  port: 19876,
  allowControl: true,
  quality: 55,
  fps: 10,
};

export const WIREMOTE_APP_ID = 'wiremote';

export function mergeWiremoteSettings(partial?: Partial<WiremoteSettings> | null): WiremoteSettings {
  const base = { ...DEFAULT_WIREMOTE_SETTINGS };
  if (!partial) return base;
  return {
    port: Math.min(65535, Math.max(1024, Math.trunc(Number(partial.port) || base.port))),
    allowControl: partial.allowControl ?? base.allowControl,
    quality: Math.min(90, Math.max(20, Math.trunc(Number(partial.quality) || base.quality))),
    fps: Math.min(20, Math.max(4, Math.trunc(Number(partial.fps) || base.fps))),
  };
}
