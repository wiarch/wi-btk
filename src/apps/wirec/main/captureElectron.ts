import { desktopCapturer, screen } from 'electron';

function getVirtualBounds(): { width: number; height: number } {
  const displays = screen.getAllDisplays();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const display of displays) {
    minX = Math.min(minX, display.bounds.x);
    minY = Math.min(minY, display.bounds.y);
    maxX = Math.max(maxX, display.bounds.x + display.bounds.width);
    maxY = Math.max(maxY, display.bounds.y + display.bounds.height);
  }

  return {
    width: maxX - minX,
    height: maxY - minY,
  };
}

export async function captureScreenElectron(): Promise<Buffer> {
  const displays = screen.getAllDisplays();
  const virtual = getVirtualBounds();
  const maxScale = Math.max(...displays.map((display) => display.scaleFactor), 1);
  const primary = screen.getPrimaryDisplay();

  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.max(1, Math.round(virtual.width * maxScale)),
      height: Math.max(1, Math.round(virtual.height * maxScale)),
    },
  });

  if (sources.length === 0) {
    throw new Error('desktopCapturer returned no screen sources');
  }

  const targetArea = virtual.width * virtual.height * maxScale * maxScale;
  let bestSource = sources[0];
  let bestArea = 0;

  for (const item of sources) {
    const size = item.thumbnail.getSize();
    const area = size.width * size.height;
    const displayMatch = item.display_id === String(primary.id) ? 1.05 : 1;
    const adjusted = area * displayMatch;
    if (adjusted > bestArea) {
      bestArea = adjusted;
      bestSource = item;
    }
  }

  const source =
    bestArea >= targetArea * 0.75
      ? bestSource
      : (sources.find((item) => item.display_id === String(primary.id)) ??
        sources.find((item) => item.id.toLowerCase().includes('screen')) ??
        bestSource);

  const png = source.thumbnail.toPNG();
  if (png.length === 0) {
    throw new Error('desktopCapturer thumbnail is empty');
  }

  return png;
}
