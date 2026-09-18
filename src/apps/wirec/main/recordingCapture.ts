import { desktopCapturer, session } from 'electron';

let handlerActive = false;

export function setRecordingMediaHandler(withDesktopAudio: boolean): void {
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 },
    });

    const source = sources[0];
    if (!source) {
      callback({});
      return;
    }

    callback({
      video: source,
      ...(withDesktopAudio ? { audio: 'loopback' as const } : {}),
    });
  });
  handlerActive = true;
}

export function clearRecordingMediaHandler(): void {
  if (!handlerActive) {
    return;
  }

  session.defaultSession.setDisplayMediaRequestHandler(null);
  handlerActive = false;
}
