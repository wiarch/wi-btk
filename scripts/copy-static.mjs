import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function copyFile(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to);
}

function copyDir(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

const shellRenderer = join(root, 'src', 'apps', 'shell', 'renderer');
const wirecRenderer = join(root, 'src', 'apps', 'wirec', 'renderer');
const wirecAssets = join(root, 'src', 'apps', 'wirec', 'assets');
const winetestRenderer = join(root, 'src', 'apps', 'winetest', 'renderer');
const wideviceRenderer = join(root, 'src', 'apps', 'widevice', 'renderer');

const shellOut = join(root, 'dist', 'apps', 'shell', 'renderer');
const wirecOut = join(root, 'dist', 'apps', 'wirec', 'renderer');
const wirecAssetsOut = join(root, 'dist', 'apps', 'wirec', 'assets');
const winetestOut = join(root, 'dist', 'apps', 'winetest', 'renderer');
const wideviceOut = join(root, 'dist', 'apps', 'widevice', 'renderer');
const trayOut = join(root, 'dist', 'assets');

mkdirSync(shellOut, { recursive: true });
mkdirSync(wirecOut, { recursive: true });
mkdirSync(wirecAssetsOut, { recursive: true });
mkdirSync(winetestOut, { recursive: true });
mkdirSync(wideviceOut, { recursive: true });
mkdirSync(trayOut, { recursive: true });

copyFile(join(shellRenderer, 'shell.html'), join(shellOut, 'shell.html'));
copyFile(join(shellRenderer, 'shell.css'), join(shellOut, 'shell.css'));

for (const name of [
  'overlay.html',
  'overlay.css',
  'colorPicker.html',
  'colorPicker.css',
  'recording.html',
  'recording.css',
  'snip-toolbar.css',
]) {
  copyFile(join(wirecRenderer, name), join(wirecOut, name));
}

for (const name of ['netest.html', 'netest.css']) {
  copyFile(join(winetestRenderer, name), join(winetestOut, name));
}

const wicamRenderer = join(root, 'src', 'apps', 'wicam', 'renderer');
const wicamOut = join(root, 'dist', 'apps', 'wicam', 'renderer');
mkdirSync(wicamOut, { recursive: true });
for (const name of ['cam.html', 'cam.css']) {
  copyFile(join(wicamRenderer, name), join(wicamOut, name));
}

for (const name of ['device.html', 'device.css']) {
  copyFile(join(wideviceRenderer, name), join(wideviceOut, name));
}

const wiclickRenderer = join(root, 'src', 'apps', 'wiclick', 'renderer');
const wiclickOut = join(root, 'dist', 'apps', 'wiclick', 'renderer');
mkdirSync(wiclickOut, { recursive: true });
for (const name of ['click.html', 'click.css']) {
  copyFile(join(wiclickRenderer, name), join(wiclickOut, name));
}

const widrawRenderer = join(root, 'src', 'apps', 'widraw', 'renderer');
const widrawOut = join(root, 'dist', 'apps', 'widraw', 'renderer');
mkdirSync(widrawOut, { recursive: true });
for (const name of ['draw.html', 'draw.css', 'settings.html', 'settings.css']) {
  copyFile(join(widrawRenderer, name), join(widrawOut, name));
}

const wibuttonRenderer = join(root, 'src', 'apps', 'wibutton', 'renderer');
const wibuttonOut = join(root, 'dist', 'apps', 'wibutton', 'renderer');
mkdirSync(wibuttonOut, { recursive: true });
for (const name of ['button.html', 'button.css']) {
  copyFile(join(wibuttonRenderer, name), join(wibuttonOut, name));
}

const wiboosterRenderer = join(root, 'src', 'apps', 'wibooster', 'renderer');
const wiboosterOut = join(root, 'dist', 'apps', 'wibooster', 'renderer');
mkdirSync(wiboosterOut, { recursive: true });
for (const name of ['booster.html', 'booster.css']) {
  copyFile(join(wiboosterRenderer, name), join(wiboosterOut, name));
}

const wicalcRenderer = join(root, 'src', 'apps', 'wicalc', 'renderer');
const wicalcOut = join(root, 'dist', 'apps', 'wicalc', 'renderer');
mkdirSync(wicalcOut, { recursive: true });
for (const name of ['calc.html', 'calc.css']) {
  copyFile(join(wicalcRenderer, name), join(wicalcOut, name));
}

const wiclockRenderer = join(root, 'src', 'apps', 'wiclock', 'renderer');
const wiclockOut = join(root, 'dist', 'apps', 'wiclock', 'renderer');
mkdirSync(wiclockOut, { recursive: true });
for (const name of ['clock.html', 'clock.css']) {
  copyFile(join(wiclockRenderer, name), join(wiclockOut, name));
}

const winotesRenderer = join(root, 'src', 'apps', 'winotes', 'renderer');
const winotesOut = join(root, 'dist', 'apps', 'winotes', 'renderer');
mkdirSync(winotesOut, { recursive: true });
for (const name of ['notes.html', 'notes.css']) {
  copyFile(join(winotesRenderer, name), join(winotesOut, name));
}

const wirateRenderer = join(root, 'src', 'apps', 'wirate', 'renderer');
const wirateOut = join(root, 'dist', 'apps', 'wirate', 'renderer');
mkdirSync(wirateOut, { recursive: true });
for (const name of ['rate.html', 'rate.css']) {
  copyFile(join(wirateRenderer, name), join(wirateOut, name));
}

const wisystemRenderer = join(root, 'src', 'apps', 'wisystem', 'renderer');
const wisystemOut = join(root, 'dist', 'apps', 'wisystem', 'renderer');
mkdirSync(wisystemOut, { recursive: true });
for (const name of ['system.html', 'system.css']) {
  copyFile(join(wisystemRenderer, name), join(wisystemOut, name));
}

const widimmerRenderer = join(root, 'src', 'apps', 'widimmer', 'renderer');
const widimmerOut = join(root, 'dist', 'apps', 'widimmer', 'renderer');
mkdirSync(widimmerOut, { recursive: true });
for (const name of ['dimmer.html', 'dimmer.css']) {
  copyFile(join(widimmerRenderer, name), join(widimmerOut, name));
}

const witranslateRenderer = join(root, 'src', 'apps', 'witranslate', 'renderer');
const witranslateOut = join(root, 'dist', 'apps', 'witranslate', 'renderer');
mkdirSync(witranslateOut, { recursive: true });
for (const name of ['translate.html', 'translate.css']) {
  copyFile(join(witranslateRenderer, name), join(witranslateOut, name));
}

copyDir(join(wirecAssets, 'sounds'), join(wirecAssetsOut, 'sounds'));
copyFile(join(root, 'assets', 'tray-icon.png'), join(trayOut, 'tray-icon.png'));
