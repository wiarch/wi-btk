import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
