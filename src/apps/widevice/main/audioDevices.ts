import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type AudioEndpoint = {
  id: string;
  name: string;
  isDefault: boolean;
  kind: 'playback' | 'recording';
};

const LIST_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Collections.Generic;

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
class MMDeviceEnumerator {}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator {
  int NotImpl1();
  int GetDefaultAudioEndpoint(int dataFlow, int role, out IntPtr ppEndpoint);
  int NotImpl2();
  int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
}

[Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceCollection {
  int GetCount(out uint count);
  int Item(uint index, out IntPtr device);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice {
  int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, out IntPtr ppInterface);
  int OpenPropertyStore(int stgmAccess, out IntPtr ppProperties);
  int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
}

[Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPropertyStore {
  int GetCount(out uint cProps);
  int GetAt(uint iProp, out PROPERTYKEY pkey);
  int GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
}

[StructLayout(LayoutKind.Sequential)]
struct PROPERTYKEY { public Guid fmtid; public uint pid; }

[StructLayout(LayoutKind.Sequential)]
struct PROPVARIANT {
  public ushort vt;
  public ushort wReserved1;
  public ushort wReserved2;
  public ushort wReserved3;
  public IntPtr p;
}

public static class AudioList {
  static readonly PROPERTYKEY PKEY_Device_FriendlyName = new PROPERTYKEY {
    fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14
  };

  public static string Run(int flow) {
    var enumerator = (IMMDeviceEnumerator)(object)new MMDeviceEnumerator();
    IntPtr collectionPtr;
    enumerator.EnumAudioEndpoints(flow, 1, out collectionPtr); // DEVICE_STATE_ACTIVE=1
    var collection = (IMMDeviceCollection)Marshal.GetObjectForIUnknown(collectionPtr);
    uint count;
    collection.GetCount(out count);

    IntPtr defaultPtr = IntPtr.Zero;
    string defaultId = "";
    try {
      enumerator.GetDefaultAudioEndpoint(flow, 0, out defaultPtr); // eConsole=0
      var defDev = (IMMDevice)Marshal.GetObjectForIUnknown(defaultPtr);
      defDev.GetId(out defaultId);
    } catch {}

    var lines = new List<string>();
    for (uint i = 0; i < count; i++) {
      IntPtr devicePtr;
      collection.Item(i, out devicePtr);
      var device = (IMMDevice)Marshal.GetObjectForIUnknown(devicePtr);
      string id;
      device.GetId(out id);
      IntPtr storePtr;
      device.OpenPropertyStore(0, out storePtr);
      var store = (IPropertyStore)Marshal.GetObjectForIUnknown(storePtr);
      var key = PKEY_Device_FriendlyName;
      PROPVARIANT pv;
      store.GetValue(ref key, out pv);
      string name = Marshal.PtrToStringUni(pv.p) ?? id;
      bool isDefault = id == defaultId;
      lines.Add(id.Replace("|", "/") + "|" + name.Replace("|", "/") + "|" + (isDefault ? "1" : "0"));
    }
    return string.Join("\\n", lines);
  }
}
"@
param([string]$Flow)
if ($Flow -eq 'playback') { [AudioList]::Run(0) } else { [AudioList]::Run(1) }
`;

const SET_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")]
class PolicyConfigClient {}

[Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IPolicyConfig {
  int NotImpl1();
  int NotImpl2();
  int NotImpl3();
  int NotImpl4();
  int NotImpl5();
  int NotImpl6();
  int NotImpl7();
  int NotImpl8();
  int NotImpl9();
  int NotImpl10();
  int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string deviceId, int role);
}

public static class AudioSet {
  public static void Set(string id) {
    var cfg = (IPolicyConfig)(object)new PolicyConfigClient();
    cfg.SetDefaultEndpoint(id, 0);
    cfg.SetDefaultEndpoint(id, 1);
    cfg.SetDefaultEndpoint(id, 2);
  }
}
"@
param([string]$Id)
[AudioSet]::Set($Id)
`;

function parseList(stdout: string, kind: 'playback' | 'recording'): AudioEndpoint[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, name, isDefault] = line.split('|');
      return {
        id: (id ?? '').replace(/\//g, '|'),
        name: name ?? id ?? 'Device',
        isDefault: isDefault === '1',
        kind,
      };
    })
    .filter((device) => Boolean(device.id));
}

async function runPowerShell(script: string, args: string[]): Promise<string> {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded, ...args],
    { windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
  );
  return stdout.trim();
}

/** EncodedCommand can't take extra args easily — bake params into script. */
async function runPowerShellWithParam(script: string, paramLine: string): Promise<string> {
  const full = `${paramLine}\n${script}`;
  const encoded = Buffer.from(full, 'utf16le').toString('base64');
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
    { windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
  );
  return stdout.trim();
}

export async function listAudioEndpoints(kind: 'playback' | 'recording'): Promise<AudioEndpoint[]> {
  if (process.platform !== 'win32') {
    return [];
  }
  try {
    const flow = kind === 'playback' ? 'playback' : 'recording';
    // Rewrite script end to call with flow embedded
    const script = LIST_SCRIPT.replace(
      `param([string]$Flow)\nif ($Flow -eq 'playback') { [AudioList]::Run(0) } else { [AudioList]::Run(1) }`,
      kind === 'playback' ? '[AudioList]::Run(0)' : '[AudioList]::Run(1)',
    );
    const stdout = await runPowerShell(script, []);
    return parseList(stdout, kind);
  } catch (error) {
    console.error('[WI-Device] listAudioEndpoints failed', error);
    return [];
  }
}

export async function setDefaultAudioEndpoint(deviceId: string): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Only Windows is supported for system audio switching' };
  }
  try {
    const escaped = deviceId.replace(/'/g, "''");
    const script = SET_SCRIPT.replace(
      'param([string]$Id)\n[AudioSet]::Set($Id)',
      `[AudioSet]::Set('${escaped}')`,
    );
    await runPowerShell(script, []);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

// silence unused helper warning if tree-shaken oddly
void runPowerShellWithParam;
