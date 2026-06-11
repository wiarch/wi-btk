import { execFile } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import screenshot from 'screenshot-desktop';

const execFileAsync = promisify(execFile);

function withSystemPath<T>(run: () => Promise<T>): Promise<T> {
  const originalPath = process.env.PATH ?? '';
  const extra = ['/usr/local/sbin', '/usr/local/bin', '/usr/sbin', '/usr/bin', '/sbin', '/bin'];
  process.env.PATH = [...new Set([...extra, ...originalPath.split(':')])].join(':');
  return run().finally(() => {
    process.env.PATH = originalPath;
  });
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync('which', [command]);
    return true;
  } catch {
    return false;
  }
}

async function readCaptureFile(path: string): Promise<Buffer> {
  const buffer = await readFile(path);
  await unlink(path).catch(() => undefined);
  return buffer;
}

async function captureViaScrot(): Promise<Buffer> {
  const output = join(tmpdir(), `wi-rec-scrot-${Date.now()}.png`);
  return withSystemPath(async () => {
    await execFileAsync('scrot', ['-o', output], { maxBuffer: 1024 * 1024 });
    return readCaptureFile(output);
  });
}

async function captureViaGrim(): Promise<Buffer> {
  const output = join(tmpdir(), `wi-rec-grim-${Date.now()}.png`);
  return withSystemPath(async () => {
    await execFileAsync('grim', [output], { maxBuffer: 1024 * 1024 });
    return readCaptureFile(output);
  });
}

async function captureViaImport(): Promise<Buffer> {
  const output = join(tmpdir(), `wi-rec-import-${Date.now()}.png`);
  await execFileAsync('import', ['-window', 'root', output], {
    maxBuffer: 1024 * 1024,
  });
  return readCaptureFile(output);
}

async function captureViaPortal(): Promise<Buffer> {
  const dbus = await import('dbus-next');
  const bus = dbus.sessionBus();
  const handleToken = `wi_rec_${Date.now()}`;
  const requestPath = `/org/freedesktop/portal/desktop/request/${handleToken}`;

  const desktop = await bus.getProxyObject(
    'org.freedesktop.portal.Desktop',
    '/org/freedesktop/portal/desktop',
  );
  const screenshot = desktop.getInterface('org.freedesktop.portal.Screenshot');
  const requestObject = await bus.getProxyObject(
    'org.freedesktop.portal.Desktop',
    requestPath,
  );
  const request = requestObject.getInterface('org.freedesktop.portal.Request');

  const uri = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('portal timeout')), 15000);

    request.on('Response', (response: number, results: Record<string, { value: string }>) => {
      clearTimeout(timeout);

      if (response !== 0) {
        reject(new Error(`portal response code ${response}`));
        return;
      }

      const value = results?.uri?.value;
      if (!value) {
        reject(new Error('portal returned no uri'));
        return;
      }

      resolve(value);
    });

    void screenshot
      .Screenshot({
        interactive: false,
        handle_token: handleToken,
      })
      .catch((error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });

  const filePath = uri.startsWith('file://') ? decodeURI(uri.slice(7)) : uri;
  const data = await readFile(filePath);
  await unlink(filePath).catch(() => undefined);
  return data;
}

async function captureWindows(): Promise<Buffer> {
  const image = await screenshot({ format: 'png' });
  return Buffer.isBuffer(image) ? image : Buffer.from(image);
}

async function captureLinux(): Promise<Buffer> {
  const attempts: Array<{ name: string; run: () => Promise<Buffer> }> = [
    {
      name: 'screenshot-desktop',
      run: async () => {
        const image = await screenshot({ format: 'png' });
        return Buffer.isBuffer(image) ? image : Buffer.from(image);
      },
    },
  ];

  if (await commandExists('grim')) {
    attempts.push({ name: 'grim', run: captureViaGrim });
  }

  if (await commandExists('scrot')) {
    attempts.push({ name: 'scrot', run: captureViaScrot });
  }

  if (await commandExists('import')) {
    attempts.push({ name: 'import', run: captureViaImport });
  }

  attempts.push({ name: 'xdg-desktop-portal', run: captureViaPortal });

  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const buffer = await attempt.run();
      if (buffer.length > 0) {
        return buffer;
      }
      errors.push(`${attempt.name}: empty buffer`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${attempt.name}: ${message}`);
    }
  }

  throw new Error(`Linux capture failed:\n${errors.join('\n')}`);
}

export async function captureScreen(): Promise<Buffer> {
  if (process.platform === 'win32') {
    return captureWindows();
  }

  if (process.platform === 'linux') {
    return captureLinux();
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}
