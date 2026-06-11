import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { nativeImage, type NativeImage } from 'electron';

const TRAY_ICON_SIZE = 22;

const FALLBACK_TRAY_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAABVklEQVR4nO2bQQ7CIBREv8aVHk4voofRi+jhdKsbSUxD4VPoH77M27bFmWEotlERQggh47Kpufh4fr5bCanlcTss8rLoop6MTykNoujkno1P0Qax1Q7oybyIXq8qAG/mAxrd2QC8mg/k9KuXwL+SDMD77AdSPoZvwOxWoZ39+3XfTs2X0+XVfEyR+NZY1YA1zK85bozhl8Cu1UAtams584HhG8AA0ALQMAC0ADTDB9BsGywFseXFMA+gF+MB0yXQm3kRwwBKzVuFNfxN0CSApbNp0QI2AC0ADQNAC0DT7IuQp3eDvwzfgKoA1pwhi9kXabAESoVqloqVeRHAw1AwFwvC0ngA9jiMMBuDN0G0ADQMAC0ADQNAC0DDANAC0DCAuQNLf3vbK3N+2IDUwX9pQcoHG5A7wXsLcvpVDfAagka3egl4C0Grl/8YqfmwnoLw1lBCCOmCD7LSXkP+P4AJAAAAAElFTkSuQmCC';

export function getTrayIconPath(): string {
  const candidates = [
    join(__dirname, '..', '..', 'assets', 'tray-icon.png'),
    join(process.resourcesPath, 'assets', 'tray-icon.png'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return join(__dirname, '..', '..', 'assets', 'tray-icon.png');
}

export function loadTrayIcon(onFallback?: (reason: string) => void): NativeImage {
  const iconPath = getTrayIconPath();
  const fromFile = nativeImage.createFromPath(iconPath);

  if (!fromFile.isEmpty()) {
    return fromFile.resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });
  }

  onFallback?.(`tray icon missing at ${iconPath}`);
  const fallback = nativeImage.createFromDataURL(
    `data:image/png;base64,${FALLBACK_TRAY_ICON_BASE64}`,
  );
  return fallback.resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });
}
