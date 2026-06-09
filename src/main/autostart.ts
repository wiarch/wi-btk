import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { app } from 'electron';

const DESKTOP_NAME = 'wi-print.desktop';

function linuxAutostartPath(): string {
  return join(homedir(), '.config', 'autostart', DESKTOP_NAME);
}

function linuxExecPath(): string {
  if (app.isPackaged) {
    return app.getPath('exe');
  }
  return process.execPath;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function setLinuxAutostart(enabled: boolean): Promise<void> {
  const filePath = linuxAutostartPath();

  if (!enabled) {
    if (await fileExists(filePath)) {
      await unlink(filePath);
    }
    return;
  }

  const execPath = linuxExecPath();
  const args = app.isPackaged ? '' : `"${app.getAppPath()}"`;
  const content = [
    '[Desktop Entry]',
    'Type=Application',
    'Version=1.0',
    'Name=WI-Print',
    `Exec=${execPath}${args ? ` ${args}` : ''}`,
    'Terminal=false',
    'Categories=Graphics;',
    'X-GNOME-Autostart-enabled=true',
    '',
  ].join('\n');

  await mkdir(join(homedir(), '.config', 'autostart'), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

export async function applyLaunchAtStartup(enabled: boolean): Promise<void> {
  if (process.platform === 'linux') {
    await setLinuxAutostart(enabled);
    return;
  }

  app.setLoginItemSettings({
    openAtLogin: enabled,
    name: 'WI-Print',
    path: process.execPath,
    args: app.isPackaged ? [] : [app.getAppPath()],
  });
}
