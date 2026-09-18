import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpus, totalmem, freemem } from 'node:os';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { app } from 'electron';

const execFileAsync = promisify(execFile);

export type PowerPlan = {
  guid: string;
  name: string;
  active: boolean;
};

export type DisplayMode = {
  width: number;
  height: number;
  frequency: number;
};

export type DisplayInfo = {
  width: number;
  height: number;
  frequency: number;
  modes: DisplayMode[];
};

export type BootLimits = {
  numProcessors: number | null;
  maxMemoryMb: number | null;
};

export type SystemSnapshot = {
  platform: string;
  logicalProcessors: number;
  totalMemoryMb: number;
  freeMemoryMb: number;
  boot: BootLimits;
  powerPlans: PowerPlan[];
  display: DisplayInfo | null;
  adminHint: string;
};

function tempDir(): string {
  return app.isReady() ? app.getPath('temp') : tmpdir();
}

async function runPs(command: string, timeoutMs = 20000): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { windowsHide: true, timeout: timeoutMs, maxBuffer: 2 * 1024 * 1024 },
  );
  return String(stdout ?? '');
}

async function runCmd(file: string, args: string[], timeoutMs = 15000): Promise<string> {
  const { stdout, stderr } = await execFileAsync(file, args, {
    windowsHide: true,
    timeout: timeoutMs,
    maxBuffer: 1024 * 1024,
  });
  return `${stdout ?? ''}\n${stderr ?? ''}`;
}

async function runElevatedPs(scriptBody: string): Promise<{ ok: boolean; error?: string }> {
  const scriptPath = join(tempDir(), `wi-booster-elev-${Date.now()}.ps1`);
  const logPath = join(tempDir(), `wi-booster-elev-${Date.now()}.log`);
  const wrapped = `
$ErrorActionPreference = 'Stop'
try {
${scriptBody}
  'OK' | Out-File -FilePath '${logPath.replace(/'/g, "''")}' -Encoding utf8
} catch {
  ($_ | Out-String) | Out-File -FilePath '${logPath.replace(/'/g, "''")}' -Encoding utf8
  exit 1
}
`;
  writeFileSync(scriptPath, wrapped, 'utf8');
  try {
    await execFileAsync(
      'powershell.exe',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        `Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','${scriptPath.replace(/'/g, "''")}'`,
      ],
      { windowsHide: true, timeout: 120000 },
    );
    if (!existsSync(logPath)) {
      return { ok: false, error: 'Elevation cancelled or failed' };
    }
    const log = await import('node:fs/promises').then((fs) => fs.readFile(logPath, 'utf8'));
    if (!log.includes('OK')) {
      return { ok: false, error: log.trim() || 'Elevated command failed' };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    for (const path of [scriptPath, logPath]) {
      try {
        if (existsSync(path)) {
          unlinkSync(path);
        }
      } catch {
        // ignore
      }
    }
  }
}

function parseBcdEdit(text: string): BootLimits {
  let numProcessors: number | null = null;
  let maxMemoryMb: number | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const lower = line.toLowerCase();
    if (lower.startsWith('numproc')) {
      const parts = line.split(/\s+/);
      const value = Number.parseInt(parts[parts.length - 1] ?? '', 10);
      if (Number.isFinite(value) && value > 0) {
        numProcessors = value;
      }
    }
    if (lower.startsWith('truncatememory')) {
      const parts = line.split(/\s+/);
      const rawValue = parts[parts.length - 1] ?? '';
      let bytes = Number.NaN;
      if (/^0x/i.test(rawValue)) {
        bytes = Number.parseInt(rawValue, 16);
      } else {
        bytes = Number.parseInt(rawValue, 10);
      }
      if (Number.isFinite(bytes) && bytes > 0) {
        maxMemoryMb = Math.round(bytes / (1024 * 1024));
      }
    }
  }
  return { numProcessors, maxMemoryMb };
}

async function readBootLimits(): Promise<BootLimits> {
  try {
    const out = await runCmd('bcdedit.exe', ['/enum', '{current}']);
    return parseBcdEdit(out);
  } catch {
    return { numProcessors: null, maxMemoryMb: null };
  }
}

async function readPowerPlans(): Promise<PowerPlan[]> {
  try {
    const list = await runCmd('powercfg.exe', ['/list']);
    const activeOut = await runCmd('powercfg.exe', ['/getactivescheme']);
    const activeMatch = activeOut.match(
      /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/,
    );
    const activeGuid = activeMatch?.[1]?.toLowerCase() ?? '';
    const plans: PowerPlan[] = [];
    const re =
      /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s+\((.+?)\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(list))) {
      const guid = match[1];
      const name = match[2].replace(/\*$/, '').trim();
      plans.push({
        guid,
        name,
        active: guid.toLowerCase() === activeGuid,
      });
    }
    return plans;
  } catch {
    return [];
  }
}

async function readDisplayInfo(): Promise<DisplayInfo | null> {
  const script = `
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class WiBoostDisplay {
  public const int ENUM_CURRENT_SETTINGS = -1;
  public const int CDS_UPDATEREGISTRY = 0x01;
  public const int CDS_TEST = 0x02;
  public const int DISP_CHANGE_SUCCESSFUL = 0;
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public struct DEVMODE {
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
    public short dmSpecVersion;
    public short dmDriverVersion;
    public short dmSize;
    public short dmDriverExtra;
    public int dmFields;
    public int dmPositionX;
    public int dmPositionY;
    public int dmDisplayOrientation;
    public int dmDisplayFixedOutput;
    public short dmColor;
    public short dmDuplex;
    public short dmYResolution;
    public short dmTTOption;
    public short dmCollate;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
    public short dmLogPixels;
    public int dmBitsPerPel;
    public int dmPelsWidth;
    public int dmPelsHeight;
    public int dmDisplayFlags;
    public int dmDisplayFrequency;
    public int dmICMMethod;
    public int dmICMIntent;
    public int dmMediaType;
    public int dmDitherType;
    public int dmReserved1;
    public int dmReserved2;
    public int dmPanningWidth;
    public int dmPanningHeight;
  }
  [DllImport("user32.dll")] public static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);
  [DllImport("user32.dll")] public static extern int ChangeDisplaySettings(ref DEVMODE devMode, int flags);
}
"@
$dm = New-Object WiBoostDisplay+DEVMODE
$dm.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($dm)
[void][WiBoostDisplay]::EnumDisplaySettings($null, [WiBoostDisplay]::ENUM_CURRENT_SETTINGS, [ref]$dm)
$modes = New-Object System.Collections.Generic.List[string]
$i = 0
while ($true) {
  $m = New-Object WiBoostDisplay+DEVMODE
  $m.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($m)
  if (-not [WiBoostDisplay]::EnumDisplaySettings($null, $i, [ref]$m)) { break }
  if ($m.dmBitsPerPel -ge 32 -and $m.dmPelsWidth -eq $dm.dmPelsWidth -and $m.dmPelsHeight -eq $dm.dmPelsHeight -and $m.dmDisplayFrequency -gt 0) {
    $modes.Add("$($m.dmDisplayFrequency)")
  }
  $i++
}
$uniq = $modes | Sort-Object { [int]$_ } -Unique
@{
  width = $dm.dmPelsWidth
  height = $dm.dmPelsHeight
  frequency = $dm.dmDisplayFrequency
  frequencies = @($uniq)
} | ConvertTo-Json -Compress
`;
  try {
    const out = await runPs(script);
    const json = JSON.parse(out.trim()) as {
      width: number;
      height: number;
      frequency: number;
      frequencies: string[] | number[];
    };
    const freqs = (json.frequencies ?? [])
      .map((value) => Number.parseInt(String(value), 10))
      .filter((value) => Number.isFinite(value) && value > 0);
    const unique = [...new Set(freqs)].sort((a, b) => a - b);
    return {
      width: json.width,
      height: json.height,
      frequency: json.frequency,
      modes: unique.map((frequency) => ({
        width: json.width,
        height: json.height,
        frequency,
      })),
    };
  } catch {
    return null;
  }
}

export async function getSystemSnapshot(): Promise<SystemSnapshot> {
  if (process.platform !== 'win32') {
    return {
      platform: process.platform,
      logicalProcessors: cpus().length,
      totalMemoryMb: Math.round(totalmem() / (1024 * 1024)),
      freeMemoryMb: Math.round(freemem() / (1024 * 1024)),
      boot: { numProcessors: null, maxMemoryMb: null },
      powerPlans: [],
      display: null,
      adminHint: 'WI-Booster is currently Windows-only',
    };
  }

  const [boot, powerPlans, display] = await Promise.all([
    readBootLimits(),
    readPowerPlans(),
    readDisplayInfo(),
  ]);

  return {
    platform: 'win32',
    logicalProcessors: cpus().length,
    totalMemoryMb: Math.round(totalmem() / (1024 * 1024)),
    freeMemoryMb: Math.round(freemem() / (1024 * 1024)),
    boot,
    powerPlans,
    display,
    adminHint: 'Changing CPU/RAM boot limits needs Administrator and a reboot.',
  };
}

export async function setPowerPlan(guid: string): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Windows only' };
  }
  try {
    await runCmd('powercfg.exe', ['/setactive', guid]);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function setDisplayFrequency(
  frequency: number,
): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Windows only' };
  }
  const hz = Math.trunc(frequency);
  if (!Number.isFinite(hz) || hz < 1) {
    return { ok: false, error: 'Invalid frequency' };
  }
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class WiBoostDisplaySet {
  public const int ENUM_CURRENT_SETTINGS = -1;
  public const int CDS_UPDATEREGISTRY = 0x01;
  public const int DM_DISPLAYFREQUENCY = 0x400000;
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public struct DEVMODE {
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
    public short dmSpecVersion;
    public short dmDriverVersion;
    public short dmSize;
    public short dmDriverExtra;
    public int dmFields;
    public int dmPositionX;
    public int dmPositionY;
    public int dmDisplayOrientation;
    public int dmDisplayFixedOutput;
    public short dmColor;
    public short dmDuplex;
    public short dmYResolution;
    public short dmTTOption;
    public short dmCollate;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
    public short dmLogPixels;
    public int dmBitsPerPel;
    public int dmPelsWidth;
    public int dmPelsHeight;
    public int dmDisplayFlags;
    public int dmDisplayFrequency;
    public int dmICMMethod;
    public int dmICMIntent;
    public int dmMediaType;
    public int dmDitherType;
    public int dmReserved1;
    public int dmReserved2;
    public int dmPanningWidth;
    public int dmPanningHeight;
  }
  [DllImport("user32.dll")] public static extern bool EnumDisplaySettings(string deviceName, int modeNum, ref DEVMODE devMode);
  [DllImport("user32.dll")] public static extern int ChangeDisplaySettings(ref DEVMODE devMode, int flags);
}
"@
$dm = New-Object WiBoostDisplaySet+DEVMODE
$dm.dmSize = [System.Runtime.InteropServices.Marshal]::SizeOf($dm)
if (-not [WiBoostDisplaySet]::EnumDisplaySettings($null, [WiBoostDisplaySet]::ENUM_CURRENT_SETTINGS, [ref]$dm)) {
  throw 'EnumDisplaySettings failed'
}
$dm.dmFields = [WiBoostDisplaySet]::DM_DISPLAYFREQUENCY
$dm.dmDisplayFrequency = ${hz}
$code = [WiBoostDisplaySet]::ChangeDisplaySettings([ref]$dm, [WiBoostDisplaySet]::CDS_UPDATEREGISTRY)
if ($code -ne 0) { throw "ChangeDisplaySettings failed: $code" }
'OK'
`;
  try {
    const out = await runPs(script);
    if (!out.includes('OK')) {
      return { ok: false, error: out.trim() || 'Failed to set refresh rate' };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function setBootLimits(options: {
  processors: number;
  memoryMb: number;
}): Promise<{ ok: boolean; error?: string; needsReboot?: boolean }> {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'Windows only' };
  }

  const logical = cpus().length;
  const totalMb = Math.round(totalmem() / (1024 * 1024));
  const processors = Math.max(0, Math.min(logical, Math.trunc(options.processors)));
  const memoryMb = Math.max(0, Math.min(totalMb, Math.trunc(options.memoryMb)));

  const lines: string[] = [];
  if (processors <= 0 || processors >= logical) {
    lines.push('bcdedit /deletevalue {current} numproc');
  } else {
    lines.push(`bcdedit /set {current} numproc ${processors}`);
  }

  if (memoryMb <= 0 || memoryMb >= totalMb) {
    lines.push('bcdedit /deletevalue {current} truncatememory');
  } else {
    const bytes = memoryMb * 1024 * 1024;
    lines.push(`bcdedit /set {current} truncatememory ${bytes}`);
  }

  const elevated = `
$ErrorActionPreference = 'Continue'
${lines.map((line) => `cmd.exe /c "${line.replace(/"/g, '""')}" | Out-Null`).join('\n')}
`;

  const result = await runElevatedPs(elevated);
  if (!result.ok) {
    return result;
  }
  return { ok: true, needsReboot: true };
}
