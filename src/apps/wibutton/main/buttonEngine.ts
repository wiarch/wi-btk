import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { app } from 'electron';
import type { ButtonActionType, MouseButtonId, WibuttonSettings } from '../../../shared/settings/wibutton';

export type RemapStatus = {
  active: boolean;
  message: string;
};

type StatusListener = (status: RemapStatus) => void;

type HookConfig = {
  enabled: boolean;
  middle: string;
  x1: string;
  x2: string;
};

function serializeHookConfig(config: HookConfig): string {
  return [
    `enabled=${config.enabled ? '1' : '0'}`,
    `middle=${config.middle}`,
    `x1=${config.x1}`,
    `x2=${config.x2}`,
    '',
  ].join('\n');
}

const PS_SCRIPT = `$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Windows.Forms;

public class WiButtonHook {
  private const int WH_MOUSE_LL = 14;
  private const int WM_MBUTTONDOWN = 0x0207;
  private const int WM_XBUTTONDOWN = 0x020B;
  private const int HC_ACTION = 0;

  private static IntPtr _hook = IntPtr.Zero;
  private static LowLevelMouseProc _proc = HookCallback;
  private static string _configPath = "";
  private static bool _enabled = true;
  private static string _middle = "default";
  private static string _x1 = "default";
  private static string _x2 = "default";

  private delegate IntPtr LowLevelMouseProc(int nCode, IntPtr wParam, IntPtr lParam);

  [StructLayout(LayoutKind.Sequential)]
  private struct POINT { public int x; public int y; }

  [StructLayout(LayoutKind.Sequential)]
  private struct MSLLHOOKSTRUCT {
    public POINT pt;
    public uint mouseData;
    public uint flags;
    public uint time;
    public IntPtr dwExtraInfo;
  }

  [DllImport("user32.dll", SetLastError = true)]
  private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelMouseProc lpfn, IntPtr hMod, uint dwThreadId);

  [DllImport("user32.dll", SetLastError = true)]
  private static extern bool UnhookWindowsHookEx(IntPtr hhk);

  [DllImport("user32.dll")]
  private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

  [DllImport("kernel32.dll")]
  private static extern IntPtr GetModuleHandle(string lpModuleName);

  [DllImport("user32.dll")]
  private static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

  private const uint KEYEVENTF_KEYUP = 0x0002;
  private const byte VK_CONTROL = 0x11;
  private const byte VK_MENU = 0x12;
  private const byte VK_SHIFT = 0x10;
  private const byte VK_LWIN = 0x5B;
  private const byte VK_VOLUME_MUTE = 0xAD;
  private const byte VK_VOLUME_DOWN = 0xAE;
  private const byte VK_VOLUME_UP = 0xAF;
  private const byte VK_MEDIA_PLAY_PAUSE = 0xB3;

  public static void Start(string configPath) {
    _configPath = configPath;
    Reload();
    using (Process curProcess = Process.GetCurrentProcess())
    using (ProcessModule curModule = curProcess.MainModule) {
      _hook = SetWindowsHookEx(WH_MOUSE_LL, _proc, GetModuleHandle(curModule.ModuleName), 0);
    }
    if (_hook == IntPtr.Zero) throw new Exception("SetWindowsHookEx failed");
    Application.Run();
  }

  public static void Stop() {
    if (_hook != IntPtr.Zero) {
      UnhookWindowsHookEx(_hook);
      _hook = IntPtr.Zero;
    }
    Application.ExitThread();
  }

  public static void Reload() {
    try {
      if (!File.Exists(_configPath)) return;
      _enabled = false;
      _middle = "default";
      _x1 = "default";
      _x2 = "default";
      foreach (string rawLine in File.ReadAllLines(_configPath)) {
        string line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith("#")) continue;
        int eq = line.IndexOf('=');
        if (eq <= 0) continue;
        string key = line.Substring(0, eq).Trim().ToLowerInvariant();
        string val = line.Substring(eq + 1).Trim();
        if (key == "enabled") _enabled = val == "1" || val.Equals("true", StringComparison.OrdinalIgnoreCase);
        else if (key == "middle") _middle = val;
        else if (key == "x1") _x1 = val;
        else if (key == "x2") _x2 = val;
      }
    } catch {}
  }

  private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
    if (nCode == HC_ACTION && _enabled) {
      int msg = wParam.ToInt32();
      if (msg == WM_MBUTTONDOWN) {
        if (Handle(_middle)) return (IntPtr)1;
      } else if (msg == WM_XBUTTONDOWN) {
        MSLLHOOKSTRUCT hs = (MSLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(MSLLHOOKSTRUCT));
        int xb = (int)((hs.mouseData >> 16) & 0xffff);
        if (xb == 1 && Handle(_x1)) return (IntPtr)1;
        if (xb == 2 && Handle(_x2)) return (IntPtr)1;
      }
    }
    return CallNextHookEx(_hook, nCode, wParam, lParam);
  }

  private static bool Handle(string action) {
    if (string.IsNullOrEmpty(action) || action == "default") return false;
    if (action == "disabled") return true;
    try {
      if (action == "copy") { Chord(true, false, false, false, (byte)'C'); return true; }
      if (action == "paste") { Chord(true, false, false, false, (byte)'V'); return true; }
      if (action == "cut") { Chord(true, false, false, false, (byte)'X'); return true; }
      if (action == "undo") { Chord(true, false, false, false, (byte)'Z'); return true; }
      if (action == "redo") { Chord(true, false, false, false, (byte)'Y'); return true; }
      if (action == "volumeUp") { Tap(VK_VOLUME_UP); return true; }
      if (action == "volumeDown") { Tap(VK_VOLUME_DOWN); return true; }
      if (action == "volumeMute") { Tap(VK_VOLUME_MUTE); return true; }
      if (action == "mediaPlayPause") { Tap(VK_MEDIA_PLAY_PAUSE); return true; }
      if (action.StartsWith("key:")) {
        RunKeystroke(action.Substring(4));
        return true;
      }
    } catch {}
    return false;
  }

  private static void Tap(byte vk) {
    keybd_event(vk, 0, 0, UIntPtr.Zero);
    keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
  }

  private static void Chord(bool ctrl, bool alt, bool shift, bool win, byte vk) {
    if (ctrl) keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
    if (alt) keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
    if (shift) keybd_event(VK_SHIFT, 0, 0, UIntPtr.Zero);
    if (win) keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
    keybd_event(vk, 0, 0, UIntPtr.Zero);
    keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    if (win) keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    if (shift) keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    if (alt) keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    if (ctrl) keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
  }

  private static byte VkFromName(string name) {
    name = name.Trim().ToUpperInvariant();
    if (name.Length == 1) return (byte)name[0];
    if (name.StartsWith("F") && name.Length <= 3) {
      int n; if (int.TryParse(name.Substring(1), out n) && n >= 1 && n <= 24) return (byte)(0x70 + n - 1);
    }
    switch (name) {
      case "ENTER": case "RETURN": return 0x0D;
      case "TAB": return 0x09;
      case "ESC": case "ESCAPE": return 0x1B;
      case "SPACE": return 0x20;
      case "BACKSPACE": return 0x08;
      case "DELETE": return 0x2E;
      case "HOME": return 0x24;
      case "END": return 0x23;
      case "LEFT": return 0x25;
      case "UP": return 0x26;
      case "RIGHT": return 0x27;
      case "DOWN": return 0x28;
      case "INSERT": return 0x2D;
      case "PRIOR": case "PAGEUP": return 0x21;
      case "NEXT": case "PAGEDOWN": return 0x22;
      default: return 0;
    }
  }

  private static void RunKeystroke(string accel) {
    bool ctrl = false, alt = false, shift = false, win = false;
    string key = "";
    foreach (string part in accel.Split('+')) {
      string p = part.Trim();
      string u = p.ToUpperInvariant();
      if (u == "CONTROL" || u == "CTRL" || u == "COMMANDORCONTROL" || u == "CMDORCTRL") ctrl = true;
      else if (u == "ALT" || u == "OPTION") alt = true;
      else if (u == "SHIFT") shift = true;
      else if (u == "SUPER" || u == "META" || u == "WIN" || u == "COMMAND") win = true;
      else key = p;
    }
    byte vk = VkFromName(key);
    if (vk == 0 && key.Length == 1) vk = (byte)char.ToUpperInvariant(key[0]);
    if (vk == 0) return;
    Chord(ctrl, alt, shift, win, vk);
  }
}
"@ -ReferencedAssemblies System.Windows.Forms

$configPath = $args[0]
Write-Output 'READY'
[Console]::Out.Flush()

$thread = [System.Threading.Thread]::new([System.Threading.ThreadStart]{
  [WiButtonHook]::Start($configPath)
})
$thread.SetApartmentState([System.Threading.ApartmentState]::STA)
$thread.IsBackground = $true
$thread.Start()

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  $cmd = $line.Trim().ToUpperInvariant()
  if ($cmd -eq 'QUIT') {
    [WiButtonHook]::Stop()
    break
  }
  if ($cmd -eq 'RELOAD') {
    [WiButtonHook]::Reload()
    Write-Output 'RELOADED'
    [Console]::Out.Flush()
  }
}
`;

let worker: ChildProcessWithoutNullStreams | null = null;
let workerReady = false;
let scriptPath: string | null = null;
let configPath: string | null = null;
let active = false;
const listeners = new Set<StatusListener>();

function emit(message: string): void {
  const status: RemapStatus = { active, message };
  for (const listener of listeners) {
    try {
      listener(status);
    } catch {
      // ignore
    }
  }
}

function bindingToken(action: ButtonActionType, keystroke: string): string {
  if (action === 'keystroke') {
    const ks = keystroke.trim();
    return ks ? `key:${ks}` : 'default';
  }
  return action;
}

function toHookConfig(settings: WibuttonSettings): HookConfig {
  return {
    enabled: settings.remappingEnabled,
    middle: bindingToken(settings.bindings.middle.action, settings.bindings.middle.keystroke),
    x1: bindingToken(settings.bindings.x1.action, settings.bindings.x1.keystroke),
    x2: bindingToken(settings.bindings.x2.action, settings.bindings.x2.keystroke),
  };
}

function ensurePaths(): { script: string; config: string } {
  const base = app.isReady() ? app.getPath('temp') : tmpdir();
  scriptPath = join(base, 'wi-button-hook.ps1');
  configPath = join(base, 'wi-button-config.json');
  writeFileSync(scriptPath, PS_SCRIPT, 'utf8');
  return { script: scriptPath, config: configPath };
}

function writeConfig(settings: WibuttonSettings): void {
  const { config } = ensurePaths();
  writeFileSync(config, serializeHookConfig(toHookConfig(settings)), 'utf8');
}

function killWorker(): void {
  workerReady = false;
  active = false;
  if (worker) {
    try {
      worker.stdin.write('QUIT\n');
    } catch {
      // ignore
    }
    try {
      worker.kill();
    } catch {
      // ignore
    }
  }
  worker = null;
}

function ensureWorker(): Promise<boolean> {
  if (process.platform !== 'win32') {
    return Promise.resolve(false);
  }
  if (worker && workerReady && !worker.killed) {
    return Promise.resolve(true);
  }

  killWorker();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(ok);
    };

    let script: string;
    let config: string;
    try {
      ({ script, config } = ensurePaths());
      if (!existsSync(config)) {
        writeFileSync(
          config,
          serializeHookConfig({
            enabled: false,
            middle: 'default',
            x1: 'default',
            x2: 'default',
          }),
          'utf8',
        );
      }
    } catch {
      finish(false);
      return;
    }

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, config],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
    );
    worker = child;
    workerReady = false;

    child.stdout.on('data', (chunk: Buffer) => {
      for (const line of chunk.toString('utf8').split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed === 'READY') {
          workerReady = true;
          active = true;
          finish(true);
          emit('Remapping active');
        }
      }
    });
    child.stderr.on('data', () => undefined);
    child.on('exit', () => {
      if (worker === child) {
        worker = null;
        workerReady = false;
        active = false;
        emit('Hook stopped');
        finish(false);
      }
    });

    setTimeout(() => {
      if (!workerReady) {
        killWorker();
        finish(false);
      }
    }, 12000);
  });
}

export function onRemapStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRemapStatus(): RemapStatus {
  return {
    active,
    message: active ? 'Remapping active' : 'Remapping off',
  };
}

export async function applyWibuttonEngine(
  settings: WibuttonSettings,
  appEnabled: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (process.platform !== 'win32') {
    return { ok: false, error: 'WI-Button is currently Windows-only' };
  }

  const shouldRun = appEnabled && settings.remappingEnabled;
  writeConfig(settings);

  if (!shouldRun) {
    killWorker();
    emit('Remapping off');
    return { ok: true };
  }

  const ready = await ensureWorker();
  if (!ready) {
    return { ok: false, error: 'Could not start mouse hook' };
  }

  try {
    worker?.stdin.write('RELOAD\n');
  } catch {
    return { ok: false, error: 'Could not reload hook config' };
  }

  active = true;
  emit('Remapping active');
  return { ok: true };
}

export function shutdownWibuttonEngine(): void {
  killWorker();
  for (const path of [scriptPath, configPath]) {
    if (path && existsSync(path)) {
      try {
        unlinkSync(path);
      } catch {
        // ignore
      }
    }
  }
  scriptPath = null;
  configPath = null;
}

export type { MouseButtonId };
