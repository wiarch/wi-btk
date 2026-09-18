import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, HotkeyAction } from '../../../shared/settings';

export type ScreenshotPayload = {
  imageUrl: string;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
  language: AppSettings['language'];
  captureFullScreen: boolean;
  hotkeys: Pick<AppSettings['hotkeys'], 'arrow' | 'rect' | 'save' | 'copy' | 'cancel'>;
  overlayLabels: {
    arrow: string;
    rect: string;
    copy: string;
    save: string;
    close: string;
  };
  snipLabels: {
    screenshot: string;
    record: string;
    voice: string;
    loom: string;
    rectangle: string;
    fullScreen: string;
    close: string;
    audio: string;
  };
  hotkeyDisplay: {
    arrow: string;
    rect: string;
    copy: string;
    save: string;
    close: string;
  };
  saveAsJpeg: boolean;
  jpegQuality: number;
};

contextBridge.exposeInMainWorld('wiRec', {
  onScreenshotReady(callback: (payload: ScreenshotPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: ScreenshotPayload) => {
      callback(payload);
    };

    ipcRenderer.on('screenshot-ready', listener);
    return () => ipcRenderer.removeListener('screenshot-ready', listener);
  },
  saveImage(imageBase64: string, edited: boolean): Promise<void> {
    return ipcRenderer.invoke('overlay:save', { imageBase64, edited });
  },
  copyImage(imageBase64: string, edited: boolean): Promise<void> {
    return ipcRenderer.invoke('overlay:copy', { imageBase64, edited });
  },
  cancel(): void {
    ipcRenderer.send('overlay:cancel');
  },
  switchToRecord(): void {
    ipcRenderer.send('overlay:switchToRecord');
  },
  switchToVoiceRecord(): void {
    ipcRenderer.send('overlay:switchToVoiceRecord');
  },
  switchToLoomRecord(): void {
    ipcRenderer.send('overlay:switchToLoomRecord');
  },
  ready(): void {
    ipcRenderer.send('overlay:ready');
  },
});

contextBridge.exposeInMainWorld('wiRecColorPicker', {
  onStart(callback: (payload: Record<string, unknown>) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: Record<string, unknown>) => {
      callback(payload);
    };

    ipcRenderer.on('colorpicker:start', listener);
    return () => ipcRenderer.removeListener('colorpicker:start', listener);
  },
  copyColor(hex: string): Promise<void> {
    return ipcRenderer.invoke('colorpicker:copy', hex);
  },
  cancel(): void {
    ipcRenderer.send('colorpicker:cancel');
  },
  signalReady(): void {
    ipcRenderer.send('colorpicker:shell-ready');
  },
  signalContentReady(): void {
    ipcRenderer.send('colorpicker:content-ready');
  },
});

contextBridge.exposeInMainWorld('wiRecRecording', {
  onStart(callback: (payload: Record<string, unknown>) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: Record<string, unknown>) => {
      callback(payload);
    };

    ipcRenderer.on('recording:start', listener);
    return () => ipcRenderer.removeListener('recording:start', listener);
  },
  prepareCapture(options: { desktopAudio: boolean }): Promise<void> {
    return ipcRenderer.invoke('recording:prepareCapture', options);
  },
  releaseCapture(): Promise<void> {
    return ipcRenderer.invoke('recording:releaseCapture');
  },
  enterLiveMode(): Promise<void> {
    return ipcRenderer.invoke('recording:enterLiveMode');
  },
  exitLiveMode(): Promise<void> {
    return ipcRenderer.invoke('recording:exitLiveMode');
  },
  setMousePassthrough(enabled: boolean): void {
    ipcRenderer.send('recording:mousePassthrough', enabled);
  },
  playSound(cue: 'start' | 'pause' | 'stop'): void {
    ipcRenderer.send('recording:playSound', cue);
  },
  saveRecording(buffer: ArrayBuffer, options?: { kind?: 'screen' | 'voice' | 'loom' }): Promise<string> {
    return ipcRenderer.invoke('recording:save', buffer, options);
  },
  persistPreferences(options: {
    desktopAudio: boolean;
    micEnabled: boolean;
    micDeviceId: string;
  }): Promise<void> {
    return ipcRenderer.invoke('recording:persistPreferences', options);
  },
  cancel(): void {
    ipcRenderer.send('recording:cancel');
  },
  switchToCapture(): void {
    ipcRenderer.send('recording:switchToCapture');
  },
  switchToScreenRecord(): void {
    ipcRenderer.send('recording:switchToScreenRecord');
  },
  switchToLoomRecord(): void {
    ipcRenderer.send('recording:switchToLoomRecord');
  },
  signalReady(): void {
    ipcRenderer.send('recording:shell-ready');
  },
});

contextBridge.exposeInMainWorld('wiRecSettings', {
  getSettings(): Promise<AppSettings> {
    return ipcRenderer.invoke('settings:get');
  },
  getUi(language: AppSettings['language']): Promise<Record<string, string>> {
    return ipcRenderer.invoke('settings:getUi', language);
  },
  assignHotkey(
    action: HotkeyAction,
    accelerator: string,
    hotkeys: AppSettings['hotkeys'],
    language: AppSettings['language'],
  ): Promise<{ ok: true; hotkeys: AppSettings['hotkeys'] } | { ok: false; reason: string }> {
    return ipcRenderer.invoke('settings:assignHotkey', { action, accelerator, hotkeys, language });
  },
  saveSettings(settings: AppSettings): Promise<{ ok: true } | { ok: false; error: string }> {
    return ipcRenderer.invoke('settings:save', settings);
  },
  browseSaveDirectory(): Promise<string | null> {
    return ipcRenderer.invoke('settings:browseSaveDirectory');
  },
  getResolvedSaveDirectory(): Promise<string> {
    return ipcRenderer.invoke('settings:getResolvedSaveDirectory');
  },
  previewFilename(settings: AppSettings): Promise<string> {
    return ipcRenderer.invoke('settings:previewFilename', settings);
  },
  closeWindow(): void {
    ipcRenderer.send('settings:close');
  },
  previewCaptureSound(settings: AppSettings): Promise<void> {
    return ipcRenderer.invoke('settings:previewCaptureSound', settings);
  },
});

contextBridge.exposeInMainWorld('wiDevice', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('widevice:getSettings');
  },
  saveSettings(settings: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    return ipcRenderer.invoke('widevice:saveSettings', settings);
  },
  listPlayback(): Promise<unknown> {
    return ipcRenderer.invoke('widevice:listPlayback');
  },
  listRecording(): Promise<unknown> {
    return ipcRenderer.invoke('widevice:listRecording');
  },
  setPlayback(id: string): Promise<{ ok: boolean; error?: string }> {
    return ipcRenderer.invoke('widevice:setPlayback', id);
  },
  setRecording(id: string): Promise<{ ok: boolean; error?: string }> {
    return ipcRenderer.invoke('widevice:setRecording', id);
  },
  notify(message: string): void {
    ipcRenderer.send('widevice:notify', message);
  },
});

contextBridge.exposeInMainWorld('wiClick', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wiclick:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiclick:saveSettings', settings);
  },
  start(settings?: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiclick:start', settings);
  },
  stop(): Promise<unknown> {
    return ipcRenderer.invoke('wiclick:stop');
  },
  toggle(settings?: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiclick:toggle', settings);
  },
  status(): Promise<unknown> {
    return ipcRenderer.invoke('wiclick:status');
  },
  getCursor(): Promise<unknown> {
    return ipcRenderer.invoke('wiclick:getCursor');
  },
  pickLocation(): Promise<unknown> {
    return ipcRenderer.invoke('wiclick:pickLocation');
  },
  notify(message: string): void {
    ipcRenderer.send('wiclick:notify', message);
  },
  onStatus(listener: (status: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, status: unknown): void => {
      listener(status);
    };
    ipcRenderer.on('wiclick:status', handler);
    return () => {
      ipcRenderer.removeListener('wiclick:status', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiDraw', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('widraw:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('widraw:saveSettings', settings);
  },
  isOpen(): Promise<unknown> {
    return ipcRenderer.invoke('widraw:isOpen');
  },
  open(): Promise<unknown> {
    return ipcRenderer.invoke('widraw:open');
  },
  close(): Promise<unknown> {
    return ipcRenderer.invoke('widraw:close');
  },
  toggle(): Promise<unknown> {
    return ipcRenderer.invoke('widraw:toggle');
  },
  loadScene(): Promise<unknown> {
    return ipcRenderer.invoke('widraw:loadScene');
  },
  saveScene(scene: unknown): Promise<unknown> {
    return ipcRenderer.invoke('widraw:saveScene', scene);
  },
  pickImage(): Promise<unknown> {
    return ipcRenderer.invoke('widraw:pickImage');
  },
  notify(message: string): void {
    ipcRenderer.send('widraw:notify', message);
  },
  onOpenState(listener: (state: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, state: unknown): void => {
      listener(state);
    };
    ipcRenderer.on('widraw:openState', handler);
    return () => {
      ipcRenderer.removeListener('widraw:openState', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiButton', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wibutton:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wibutton:saveSettings', settings);
  },
  status(): Promise<unknown> {
    return ipcRenderer.invoke('wibutton:status');
  },
  toggleRemap(): Promise<unknown> {
    return ipcRenderer.invoke('wibutton:toggleRemap');
  },
  notify(message: string): void {
    ipcRenderer.send('wibutton:notify', message);
  },
  onStatus(listener: (status: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, status: unknown): void => {
      listener(status);
    };
    ipcRenderer.on('wibutton:status', handler);
    return () => {
      ipcRenderer.removeListener('wibutton:status', handler);
    };
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('wibutton:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('wibutton:settingsChanged', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiBooster', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wibooster:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wibooster:saveSettings', settings);
  },
  snapshot(): Promise<unknown> {
    return ipcRenderer.invoke('wibooster:snapshot');
  },
  setPowerPlan(guid: string): Promise<unknown> {
    return ipcRenderer.invoke('wibooster:setPowerPlan', guid);
  },
  setRefreshRate(frequency: number): Promise<unknown> {
    return ipcRenderer.invoke('wibooster:setRefreshRate', frequency);
  },
  setBootLimits(payload: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wibooster:setBootLimits', payload);
  },
  notify(message: string): void {
    ipcRenderer.send('wibooster:notify', message);
  },
});

contextBridge.exposeInMainWorld('wiShell', {
  openPopout(appId: string): Promise<unknown> {
    return ipcRenderer.invoke('shell:openPopout', appId);
  },
  closePopout(appId: string): Promise<unknown> {
    return ipcRenderer.invoke('shell:closePopout', appId);
  },
  togglePopout(appId: string): Promise<unknown> {
    return ipcRenderer.invoke('shell:togglePopout', appId);
  },
  isPopoutOpen(appId: string): Promise<unknown> {
    return ipcRenderer.invoke('shell:isPopoutOpen', appId);
  },
});

contextBridge.exposeInMainWorld('wiClock', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wiclock:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiclock:saveSettings', settings);
  },
  addAlarm(partial: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiclock:addAlarm', partial);
  },
  notify(message: string): void {
    ipcRenderer.send('wiclock:notify', message);
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('wiclock:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('wiclock:settingsChanged', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiNotes', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('winotes:getSettings');
  },
  upsert(note: unknown): Promise<unknown> {
    return ipcRenderer.invoke('winotes:upsert', note);
  },
  remove(id: string): Promise<unknown> {
    return ipcRenderer.invoke('winotes:remove', id);
  },
  notify(message: string): void {
    ipcRenderer.send('winotes:notify', message);
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('winotes:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('winotes:settingsChanged', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiRate', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wirate:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wirate:saveSettings', settings);
  },
  convert(payload: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wirate:convert', payload);
  },
  refreshMarket(): Promise<unknown> {
    return ipcRenderer.invoke('wirate:refreshMarket');
  },
  notify(message: string): void {
    ipcRenderer.send('wirate:notify', message);
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('wirate:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('wirate:settingsChanged', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiWidget', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:saveSettings', settings);
  },
  add(payload?: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:add', payload);
  },
  remove(id: string): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:remove', id);
  },
  show(id: string): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:show', id);
  },
  hide(id: string): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:hide', id);
  },
  focus(id: string): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:focus', id);
  },
  update(payload: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:update', payload);
  },
  getInstance(id: string): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:getInstance', id);
  },
  openIds(): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:openIds');
  },
  stats(): Promise<unknown> {
    return ipcRenderer.invoke('wiwidget:stats');
  },
  closeSelf(): void {
    ipcRenderer.send('wiwidget:closeSelf');
  },
  notify(message: string): void {
    ipcRenderer.send('wiwidget:notify', message);
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('wiwidget:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('wiwidget:settingsChanged', handler);
    };
  },
  onInstance(listener: (widget: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, widget: unknown): void => {
      listener(widget);
    };
    ipcRenderer.on('wiwidget:instance', handler);
    return () => {
      ipcRenderer.removeListener('wiwidget:instance', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiWeather', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wiweather:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiweather:saveSettings', settings);
  },
  search(query: string): Promise<unknown> {
    return ipcRenderer.invoke('wiweather:search', query);
  },
  forecast(place?: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiweather:forecast', place);
  },
  notify(message: string): void {
    ipcRenderer.send('wiweather:notify', message);
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('wiweather:settingsChanged', handler);
    return () => ipcRenderer.removeListener('wiweather:settingsChanged', handler);
  },
});

contextBridge.exposeInMainWorld('wiRemote', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wiremote:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiremote:saveSettings', settings);
  },
  getInfo(): Promise<unknown> {
    return ipcRenderer.invoke('wiremote:getInfo');
  },
  hostStart(): Promise<unknown> {
    return ipcRenderer.invoke('wiremote:hostStart');
  },
  connect(payload: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiremote:connect', payload);
  },
  stop(): Promise<unknown> {
    return ipcRenderer.invoke('wiremote:stop');
  },
  sendInput(payload: unknown): void {
    ipcRenderer.send('wiremote:input', payload);
  },
  notify(message: string): void {
    ipcRenderer.send('wiremote:notify', message);
  },
  onStatus(listener: (status: string) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, payload: { status?: string }): void => {
      if (payload?.status) listener(payload.status);
    };
    ipcRenderer.on('wiremote:status', handler);
    return () => ipcRenderer.removeListener('wiremote:status', handler);
  },
  onConnected(listener: (role: string) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, payload: { role?: string }): void => {
      if (payload?.role) listener(payload.role);
    };
    ipcRenderer.on('wiremote:connected', handler);
    return () => ipcRenderer.removeListener('wiremote:connected', handler);
  },
  onDisconnected(listener: () => void): () => void {
    const handler = (): void => listener();
    ipcRenderer.on('wiremote:disconnected', handler);
    return () => ipcRenderer.removeListener('wiremote:disconnected', handler);
  },
  onFrame(listener: (frame: { data: string; width: number; height: number }) => void): () => void {
    const handler = (
      _event: Electron.IpcRendererEvent,
      frame: { data: string; width: number; height: number },
    ): void => listener(frame);
    ipcRenderer.on('wiremote:frame', handler);
    return () => ipcRenderer.removeListener('wiremote:frame', handler);
  },
  onError(listener: (message: string) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, payload: { message?: string }): void => {
      if (payload?.message) listener(payload.message);
    };
    ipcRenderer.on('wiremote:error', handler);
    return () => ipcRenderer.removeListener('wiremote:error', handler);
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('wiremote:settingsChanged', handler);
    return () => ipcRenderer.removeListener('wiremote:settingsChanged', handler);
  },
});

contextBridge.exposeInMainWorld('wiView', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wiview:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wiview:saveSettings', settings);
  },
  pickFiles(): Promise<unknown> {
    return ipcRenderer.invoke('wiview:pickFiles');
  },
  resolveMedia(path: string): Promise<unknown> {
    return ipcRenderer.invoke('wiview:resolveMedia', path);
  },
  clearRecent(): Promise<unknown> {
    return ipcRenderer.invoke('wiview:clearRecent');
  },
  notify(message: string): void {
    ipcRenderer.send('wiview:notify', message);
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('wiview:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('wiview:settingsChanged', handler);
    };
  },
  onOpenFiles(listener: (paths: string[]) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, paths: string[]): void => {
      listener(paths);
    };
    ipcRenderer.on('wiview:openFiles', handler);
    return () => {
      ipcRenderer.removeListener('wiview:openFiles', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiColor', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('wicolor:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('wicolor:saveSettings', settings);
  },
  pickScreen(): Promise<unknown> {
    return ipcRenderer.invoke('wicolor:pickScreen');
  },
  getPickHotkey(): Promise<string> {
    return ipcRenderer.invoke('wicolor:getPickHotkey');
  },
  copyHex(hex: string): Promise<unknown> {
    return ipcRenderer.invoke('wicolor:copyHex', hex);
  },
  notify(message: string): void {
    ipcRenderer.send('wicolor:notify', message);
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('wicolor:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('wicolor:settingsChanged', handler);
    };
  },
  onPicked(listener: (hex: string) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, hex: string): void => {
      listener(hex);
    };
    ipcRenderer.on('wicolor:picked', handler);
    return () => {
      ipcRenderer.removeListener('wicolor:picked', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiNetest', {
  getPublicIp(): Promise<string> {
    return ipcRenderer.invoke('winetest:getPublicIp');
  },
  run(mode: 'multi' | 'single'): Promise<unknown> {
    return ipcRenderer.invoke('winetest:run', mode);
  },
  abort(): Promise<unknown> {
    return ipcRenderer.invoke('winetest:abort');
  },
  onProgress(listener: (progress: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, progress: unknown): void => {
      listener(progress);
    };
    ipcRenderer.on('winetest:progress', handler);
    return () => {
      ipcRenderer.removeListener('winetest:progress', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiSystem', {
  getReport(): Promise<unknown> {
    return ipcRenderer.invoke('wisystem:getReport');
  },
});

contextBridge.exposeInMainWorld('wiDimmer', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('widimmer:getSettings');
  },
  listMonitors(): Promise<unknown> {
    return ipcRenderer.invoke('widimmer:listMonitors');
  },
  live(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('widimmer:live', settings);
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('widimmer:saveSettings', settings);
  },
  apply(): Promise<unknown> {
    return ipcRenderer.invoke('widimmer:apply');
  },
  reset(): Promise<unknown> {
    return ipcRenderer.invoke('widimmer:reset');
  },
  onSettingsChanged(listener: (payload: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
      listener(payload);
    };
    ipcRenderer.on('widimmer:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('widimmer:settingsChanged', handler);
    };
  },
});

contextBridge.exposeInMainWorld('wiTranslate', {
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke('witranslate:getSettings');
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke('witranslate:saveSettings', settings);
  },
  translate(payload: unknown): Promise<unknown> {
    return ipcRenderer.invoke('witranslate:translate', payload);
  },
  translateImage(payload: unknown): Promise<unknown> {
    return ipcRenderer.invoke('witranslate:translateImage', payload);
  },
  clipboardWrite(text: unknown): Promise<unknown> {
    return ipcRenderer.invoke('witranslate:clipboardWrite', text);
  },
  clipboardRead(): Promise<unknown> {
    return ipcRenderer.invoke('witranslate:clipboardRead');
  },
  clipboardReadImage(): Promise<unknown> {
    return ipcRenderer.invoke('witranslate:clipboardReadImage');
  },
  onSettingsChanged(listener: (settings: unknown) => void): () => void {
    const handler = (_event: Electron.IpcRendererEvent, settings: unknown): void => {
      listener(settings);
    };
    ipcRenderer.on('witranslate:settingsChanged', handler);
    return () => {
      ipcRenderer.removeListener('witranslate:settingsChanged', handler);
    };
  },
});
