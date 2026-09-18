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

async function waitForBusName(bus: { name?: string | null; once: (event: string, listener: () => void) => void }): Promise<string> {
  if (bus.name) {
    return bus.name;
  }

  return new Promise((resolve, reject) => {
    bus.once('connected', () => {
      if (bus.name) {
        resolve(bus.name);
        return;
      }
      reject(new Error('dbus session bus connected without unique name'));
    });
    bus.once('error', reject);
  });
}

function portalRequestPath(uniqueName: string, handleToken: string): string {
  const sender = uniqueName.replace(/^:/, '').replace(/\./g, '_');
  return `/org/freedesktop/portal/desktop/request/${sender}/${handleToken}`;
}

const PORTAL_REQUEST_INTROSPECTION = `<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN" "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node>
  <interface name="org.freedesktop.portal.Request">
    <signal name="Response">
      <arg type="u" name="response"/>
      <arg type="a{sv}" name="results"/>
    </signal>
  </interface>
</node>`;

async function captureViaPortal(): Promise<Buffer> {
  const dbus = await import('dbus-next');
  const { Variant } = dbus;
  const bus = dbus.sessionBus();
  const uniqueName = await waitForBusName(bus);
  const handleToken = `wi_rec_${Date.now()}`;
  const requestPath = portalRequestPath(uniqueName, handleToken);

  const desktop = await bus.getProxyObject(
    'org.freedesktop.portal.Desktop',
    '/org/freedesktop/portal/desktop',
  );
  const screenshot = desktop.getInterface('org.freedesktop.portal.Screenshot');
  const requestObject = await bus.getProxyObject(
    'org.freedesktop.portal.Desktop',
    requestPath,
    PORTAL_REQUEST_INTROSPECTION,
  );
  const request = requestObject.getInterface('org.freedesktop.portal.Request');

  const uri = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('portal timeout')), 15000);

    request.on('Response', (response: number, results: Record<string, unknown>) => {
      clearTimeout(timeout);

      if (response !== 0) {
        reject(new Error(`portal response code ${response}`));
        return;
      }

      const uriEntry = results?.uri;
      const value =
        uriEntry instanceof Variant
          ? String(uriEntry.value)
          : typeof uriEntry === 'object' && uriEntry !== null && 'value' in uriEntry
            ? String((uriEntry as { value: unknown }).value)
            : typeof uriEntry === 'string'
              ? uriEntry
              : null;

      if (!value) {
        reject(new Error('portal returned no uri'));
        return;
      }

      resolve(value);
    });

    void screenshot
      .Screenshot({
        interactive: new Variant('b', false),
        handle_token: new Variant('s', handleToken),
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
  const attempts: Array<{ name: string; run: () => Promise<Buffer> }> = [];
  const onWayland = process.env.XDG_SESSION_TYPE === 'wayland';

  if (await commandExists('grim')) {
    attempts.push({ name: 'grim', run: captureViaGrim });
  }

  if (onWayland) {
    attempts.push({ name: 'xdg-desktop-portal', run: captureViaPortal });
  }

  if (await commandExists('scrot')) {
    attempts.push({ name: 'scrot', run: captureViaScrot });
  }

  if (!onWayland) {
    attempts.push({
      name: 'screenshot-desktop',
      run: async () => {
        const image = await screenshot({ format: 'png' });
        return Buffer.isBuffer(image) ? image : Buffer.from(image);
      },
    });

    if (await commandExists('import')) {
      attempts.push({ name: 'import', run: captureViaImport });
    }

    attempts.push({ name: 'xdg-desktop-portal', run: captureViaPortal });
  }

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
