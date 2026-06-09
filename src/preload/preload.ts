import { contextBridge, ipcRenderer } from 'electron';

export type ScreenshotPayload = {
  imageUrl: string;
  width: number;
  height: number;
  displayWidth: number;
  displayHeight: number;
};

contextBridge.exposeInMainWorld('wiPrint', {
  onScreenshotReady(callback: (payload: ScreenshotPayload) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, payload: ScreenshotPayload) => {
      callback(payload);
    };

    ipcRenderer.on('screenshot-ready', listener);
    return () => ipcRenderer.removeListener('screenshot-ready', listener);
  },
  saveImage(imageBase64: string): Promise<void> {
    return ipcRenderer.invoke('overlay:save', imageBase64);
  },
  copyImage(imageBase64: string): Promise<void> {
    return ipcRenderer.invoke('overlay:copy', imageBase64);
  },
  cancel(): void {
    ipcRenderer.send('overlay:cancel');
  },
});
