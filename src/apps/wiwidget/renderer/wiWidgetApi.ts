import type { WidgetInstance, WidgetType, WiwidgetSettings } from '../../../shared/settings/wiwidget.js';

export type StatsPayload = {
  cpu: number;
  ramUsed: number;
  ramTotal: number;
  ramPct: number;
};

export type WiWidgetApi = {
  getSettings(): Promise<WiwidgetSettings>;
  saveSettings(
    settings: Partial<WiwidgetSettings>,
  ): Promise<{ ok: boolean; settings?: WiwidgetSettings; error?: string }>;
  add(payload?: {
    type?: WidgetType;
    title?: string;
  }): Promise<{ ok: boolean; settings?: WiwidgetSettings; widget?: WidgetInstance }>;
  remove(id: string): Promise<{ ok: boolean; settings?: WiwidgetSettings }>;
  show(id: string): Promise<{ ok: boolean; settings?: WiwidgetSettings }>;
  hide(id: string): Promise<{ ok: boolean; settings?: WiwidgetSettings }>;
  focus(id: string): Promise<{ ok: boolean }>;
  update(payload: Partial<WidgetInstance> & { id: string }): Promise<unknown>;
  getInstance(id: string): Promise<WidgetInstance | null>;
  openIds(): Promise<string[]>;
  stats(): Promise<StatsPayload>;
  closeSelf(): void;
  notify(message: string): void;
  onSettingsChanged?(listener: (settings: WiwidgetSettings) => void): () => void;
  onInstance?(listener: (widget: WidgetInstance) => void): () => void;
};

declare global {
  interface Window {
    wiWidget?: WiWidgetApi;
  }
}

export {};
