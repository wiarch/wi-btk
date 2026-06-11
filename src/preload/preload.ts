import { contextBridge, ipcRenderer } from 'electron';
import type { AppSettings, HotkeyAction } from '../shared/settings';

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
  saveRecording(buffer: ArrayBuffer): Promise<string> {
    return ipcRenderer.invoke('recording:save', buffer);
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
