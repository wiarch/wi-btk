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
});
