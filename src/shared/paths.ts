import { app } from 'electron';
import { join } from 'node:path';

/** Resolve a path under dist/ (dev + packaged). */
export function distPath(...parts: string[]): string {
  return join(app.getAppPath(), 'dist', ...parts);
}

export function shellRenderer(...parts: string[]): string {
  return distPath('apps', 'shell', 'renderer', ...parts);
}

export function shellPreload(...parts: string[]): string {
  return distPath('apps', 'shell', 'preload', ...parts);
}

export function wirecRenderer(...parts: string[]): string {
  return distPath('apps', 'wirec', 'renderer', ...parts);
}

export function wirecAssets(...parts: string[]): string {
  return distPath('apps', 'wirec', 'assets', ...parts);
}

export function shellAssets(...parts: string[]): string {
  return distPath('assets', ...parts);
}

/** Per-app config directory under Electron userData. */
export function appConfigDir(appId: string): string {
  return join(app.getPath('userData'), 'apps', appId);
}
