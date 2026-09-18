import type { Language } from './types';
import {
  DEFAULT_APP_ENABLEMENT,
  mergeAppEnablement,
  type AppEnablement,
} from '../apps/registry';

export type ShellSettings = {
  language: Language;
  launchAtStartup: boolean;
  sidebarIconsOnly: boolean;
  /** Per micro-app on/off. Missing ids default to enabled. */
  enabledApps: AppEnablement;
};

export const DEFAULT_SHELL_SETTINGS: ShellSettings = {
  language: 'es',
  launchAtStartup: false,
  sidebarIconsOnly: false,
  enabledApps: { ...DEFAULT_APP_ENABLEMENT },
};

export const SHELL_APP_ID = 'shell';

export { mergeAppEnablement, type AppEnablement };
