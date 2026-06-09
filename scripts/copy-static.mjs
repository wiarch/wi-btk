import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist', 'renderer');

const assetsOut = join(root, 'dist', 'assets');

mkdirSync(out, { recursive: true });
mkdirSync(assetsOut, { recursive: true });
cpSync(join(root, 'src', 'renderer', 'overlay.html'), join(out, 'overlay.html'));
cpSync(join(root, 'src', 'renderer', 'overlay.css'), join(out, 'overlay.css'));
cpSync(join(root, 'assets', 'tray-icon.png'), join(assetsOut, 'tray-icon.png'));
