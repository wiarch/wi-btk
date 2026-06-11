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
cpSync(join(root, 'src', 'renderer', 'settings.html'), join(out, 'settings.html'));
cpSync(join(root, 'src', 'renderer', 'settings.css'), join(out, 'settings.css'));
cpSync(join(root, 'src', 'renderer', 'colorPicker.html'), join(out, 'colorPicker.html'));
cpSync(join(root, 'src', 'renderer', 'colorPicker.css'), join(out, 'colorPicker.css'));
cpSync(join(root, 'src', 'renderer', 'recording.html'), join(out, 'recording.html'));
cpSync(join(root, 'src', 'renderer', 'recording.css'), join(out, 'recording.css'));
cpSync(join(root, 'src', 'renderer', 'snip-toolbar.css'), join(out, 'snip-toolbar.css'));
cpSync(join(root, 'assets', 'tray-icon.png'), join(assetsOut, 'tray-icon.png'));
cpSync(join(root, 'assets', 'sounds'), join(assetsOut, 'sounds'), { recursive: true });
