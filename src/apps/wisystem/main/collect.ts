import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpus, freemem, hostname, totalmem, uptime, userInfo } from 'node:os';
import type {
  CpuInfo,
  GraphicsInfo,
  MotherboardInfo,
  NetworkInfo,
  OsInfo,
  RamInfo,
  StorageInfo,
  SystemReport,
  TempReading,
} from '../../../shared/settings/wisystem';

const execFileAsync = promisify(execFile);

async function runPs(command: string, timeoutMs = 45000): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { windowsHide: true, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 },
  );
  return String(stdout ?? '').trim();
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown, fallback = '—'): string {
  const s = String(value ?? '').trim();
  return s || fallback;
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function collectTemps(): Promise<TempReading[]> {
  try {
    const raw = await runPs(`
$ErrorActionPreference='SilentlyContinue'
$temps = @()
Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | ForEach-Object {
  $c = [math]::Round(($_.CurrentTemperature / 10) - 273.15, 1)
  if ($c -gt -40 -and $c -lt 150) {
    $temps += [pscustomobject]@{ label = $_.InstanceName; celsius = $c }
  }
}
$temps | ConvertTo-Json -Compress
`);
    if (!raw) {
      return [];
    }
    const parsed = parseJson<Array<{ label?: string; celsius?: number }> | { label?: string; celsius?: number }>(
      raw,
    );
    const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return list.map((t, i) => ({
      label: str(t.label, `Zone ${i + 1}`),
      celsius: Number.isFinite(Number(t.celsius)) ? Number(t.celsius) : null,
    }));
  } catch {
    return [];
  }
}

async function collectOs(): Promise<OsInfo> {
  try {
    const raw = await runPs(`
$os = Get-CimInstance Win32_OperatingSystem
[pscustomobject]@{
  caption = $os.Caption
  version = $os.Version
  build = $os.BuildNumber
  architecture = $os.OSArchitecture
  installDate = ($os.InstallDate).ToString('yyyy-MM-dd')
  computerName = $env:COMPUTERNAME
  userName = $env:USERNAME
  uptimeSeconds = [int]((Get-Date) - $os.LastBootUpTime).TotalSeconds
} | ConvertTo-Json -Compress
`);
    const data = parseJson<Partial<OsInfo>>(raw);
    if (data) {
      return {
        caption: str(data.caption),
        version: str(data.version),
        build: str(data.build),
        architecture: str(data.architecture),
        installDate: str(data.installDate),
        computerName: str(data.computerName, hostname()),
        userName: str(data.userName, userInfo().username),
        uptimeSeconds: num(data.uptimeSeconds, Math.floor(uptime())),
      };
    }
  } catch {
    // fallback below
  }
  return {
    caption: `Windows`,
    version: '',
    build: '',
    architecture: process.arch === 'x64' ? '64-bit' : process.arch,
    installDate: '—',
    computerName: hostname(),
    userName: userInfo().username,
    uptimeSeconds: Math.floor(uptime()),
  };
}

async function collectCpu(temps: TempReading[]): Promise<CpuInfo> {
  const logical = cpus();
  try {
    const raw = await runPs(`
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1
[pscustomobject]@{
  name = $cpu.Name
  manufacturer = $cpu.Manufacturer
  cores = $cpu.NumberOfCores
  logicalProcessors = $cpu.NumberOfLogicalProcessors
  maxClockMhz = $cpu.MaxClockSpeed
  currentClockMhz = $cpu.CurrentClockSpeed
  socket = $cpu.SocketDesignation
  l2CacheKb = $cpu.L2CacheSize
  l3CacheKb = $cpu.L3CacheSize
} | ConvertTo-Json -Compress
`);
    const data = parseJson<Partial<CpuInfo>>(raw);
    if (data) {
      return {
        name: str(data.name, logical[0]?.model),
        manufacturer: str(data.manufacturer),
        cores: num(data.cores, logical.length),
        logicalProcessors: num(data.logicalProcessors, logical.length),
        maxClockMhz: num(data.maxClockMhz),
        currentClockMhz: num(data.currentClockMhz),
        socket: str(data.socket),
        l2CacheKb: num(data.l2CacheKb),
        l3CacheKb: num(data.l3CacheKb),
        temps,
      };
    }
  } catch {
    // fallback
  }
  return {
    name: logical[0]?.model ?? 'CPU',
    manufacturer: '—',
    cores: logical.length,
    logicalProcessors: logical.length,
    maxClockMhz: logical[0] ? Math.round(logical[0].speed) : 0,
    currentClockMhz: logical[0] ? Math.round(logical[0].speed) : 0,
    socket: '—',
    l2CacheKb: 0,
    l3CacheKb: 0,
    temps,
  };
}

async function collectRam(): Promise<RamInfo> {
  const totalGb = totalmem() / (1024 ** 3);
  const freeGb = freemem() / (1024 ** 3);
  try {
    const raw = await runPs(`
$mods = @(Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
  [pscustomobject]@{
    bank = $_.BankLabel
    capacityGb = [math]::Round($_.Capacity / 1GB, 2)
    speedMhz = $_.Speed
    manufacturer = $_.Manufacturer
    partNumber = ($_.PartNumber -replace '\\s+$','')
    formFactor = $_.FormFactor
  }
})
$form = @{
  0='Unknown'; 8='DIMM'; 12='SODIMM'; 17='DIMM'
}
$mods = $mods | ForEach-Object {
  $_.formFactor = if ($form.ContainsKey([int]$_.formFactor)) { $form[[int]$_.formFactor] } else { [string]$_.formFactor }
  $_
}
[pscustomobject]@{
  modules = $mods
  count = $mods.Count
} | ConvertTo-Json -Compress -Depth 4
`);
    const data = parseJson<{ modules?: RamInfo['modules'] | RamInfo['modules'][0]; count?: number }>(raw);
    const rawMods = data?.modules;
    const modules = Array.isArray(rawMods) ? rawMods : rawMods ? [rawMods] : [];
    const count = modules.length || num(data?.count);
    return {
      totalGb: Math.round(totalGb * 100) / 100,
      usedGb: Math.round((totalGb - freeGb) * 100) / 100,
      availableGb: Math.round(freeGb * 100) / 100,
      channels: count <= 1 ? 'Single-Channel' : count === 2 ? 'Dual-Channel' : count === 4 ? 'Quad-Channel' : `${count} modules`,
      modules: modules.map((m) => ({
        bank: str(m.bank),
        capacityGb: num(m.capacityGb),
        speedMhz: num(m.speedMhz),
        manufacturer: str(m.manufacturer),
        partNumber: str(m.partNumber),
        formFactor: str(m.formFactor),
      })),
    };
  } catch {
    return {
      totalGb: Math.round(totalGb * 100) / 100,
      usedGb: Math.round((totalGb - freeGb) * 100) / 100,
      availableGb: Math.round(freeGb * 100) / 100,
      channels: '—',
      modules: [],
    };
  }
}

async function collectMotherboard(temps: TempReading[]): Promise<MotherboardInfo> {
  try {
    const raw = await runPs(`
$bb = Get-CimInstance Win32_BaseBoard
$bios = Get-CimInstance Win32_BIOS
[pscustomobject]@{
  manufacturer = $bb.Manufacturer
  product = $bb.Product
  version = $bb.Version
  serial = $bb.SerialNumber
  biosVendor = $bios.Manufacturer
  biosVersion = ($bios.SMBIOSBIOSVersion)
  biosDate = if ($bios.ReleaseDate) { $bios.ReleaseDate.ToString('yyyy-MM-dd') } else { '' }
} | ConvertTo-Json -Compress
`);
    const data = parseJson<Partial<MotherboardInfo>>(raw);
    if (data) {
      return {
        manufacturer: str(data.manufacturer),
        product: str(data.product),
        version: str(data.version),
        serial: str(data.serial),
        biosVendor: str(data.biosVendor),
        biosVersion: str(data.biosVersion),
        biosDate: str(data.biosDate),
        temps,
      };
    }
  } catch {
    // fallback
  }
  return {
    manufacturer: '—',
    product: '—',
    version: '—',
    serial: '—',
    biosVendor: '—',
    biosVersion: '—',
    biosDate: '—',
    temps,
  };
}

async function collectGraphics(): Promise<GraphicsInfo> {
  try {
    const raw = await runPs(`
$gpus = @(Get-CimInstance Win32_VideoController | ForEach-Object {
  [pscustomobject]@{
    name = $_.Name
    adapterRamGb = if ($_.AdapterRAM -and $_.AdapterRAM -gt 0) { [math]::Round($_.AdapterRAM / 1GB, 2) } else { 0 }
    driverVersion = $_.DriverVersion
    videoMode = $_.VideoModeDescription
    refreshRate = $_.CurrentRefreshRate
  }
})
$gpus | ConvertTo-Json -Compress -Depth 3
`);
    if (!raw) {
      return { adapters: [] };
    }
    const parsed = parseJson<GraphicsInfo['adapters'] | GraphicsInfo['adapters'][0]>(raw);
    const adapters = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return {
      adapters: adapters.map((a) => ({
        name: str(a.name),
        adapterRamGb: num(a.adapterRamGb),
        driverVersion: str(a.driverVersion),
        videoMode: str(a.videoMode),
        refreshRate: num(a.refreshRate),
      })),
    };
  } catch {
    return { adapters: [] };
  }
}

async function collectStorage(): Promise<StorageInfo> {
  try {
    const raw = await runPs(`
$disks = @(Get-CimInstance Win32_DiskDrive | ForEach-Object {
  $disk = $_
  $parts = @()
  Get-CimAssociatedInstance -InputObject $disk -ResultClassName Win32_DiskPartition -ErrorAction SilentlyContinue | ForEach-Object {
    $part = $_
    Get-CimAssociatedInstance -InputObject $part -ResultClassName Win32_LogicalDisk -ErrorAction SilentlyContinue | ForEach-Object {
      $parts += [pscustomobject]@{
        name = $_.DeviceID
        sizeGb = [math]::Round($_.Size / 1GB, 2)
        freeGb = [math]::Round($_.FreeSpace / 1GB, 2)
        fileSystem = $_.FileSystem
      }
    }
  }
  [pscustomobject]@{
    model = $disk.Model
    sizeGb = [math]::Round($disk.Size / 1GB, 2)
    interfaceType = $disk.InterfaceType
    mediaType = $disk.MediaType
    serial = $disk.SerialNumber
    partitions = $parts
  }
})
$disks | ConvertTo-Json -Compress -Depth 5
`);
    if (!raw) {
      return { drives: [] };
    }
    const parsed = parseJson<StorageInfo['drives'] | StorageInfo['drives'][0]>(raw);
    const drives = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    return {
      drives: drives.map((d) => ({
        model: str(d.model),
        sizeGb: num(d.sizeGb),
        interfaceType: str(d.interfaceType),
        mediaType: str(d.mediaType),
        serial: str(d.serial),
        partitions: Array.isArray(d.partitions)
          ? d.partitions.map((p) => ({
              name: str(p.name),
              sizeGb: num(p.sizeGb),
              freeGb: num(p.freeGb),
              fileSystem: str(p.fileSystem),
            }))
          : [],
      })),
    };
  } catch {
    return { drives: [] };
  }
}

async function collectNetwork(): Promise<NetworkInfo> {
  try {
    const raw = await runPs(`
$nics = @(Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" | ForEach-Object {
  $cfg = $_
  $adapter = Get-CimInstance Win32_NetworkAdapter -Filter ("Index=$($cfg.Index)") -ErrorAction SilentlyContinue
  [pscustomobject]@{
    name = if ($adapter) { $adapter.Name } else { $cfg.Description }
    mac = $cfg.MACAddress
    speedMbps = if ($adapter -and $adapter.Speed) { [math]::Round($adapter.Speed / 1MB, 0) } else { $null }
    dhcp = [bool]$cfg.DHCPEnabled
    ipv4 = @($cfg.IPAddress | Where-Object { $_ -match '^\\d' })
    ipv6 = @($cfg.IPAddress | Where-Object { $_ -match ':' })
    status = if ($adapter) { $adapter.NetConnectionStatus } else { 2 }
  }
})
$nics | ConvertTo-Json -Compress -Depth 4
`);
    if (!raw) {
      return { adapters: [] };
    }
    const parsed = parseJson<NetworkInfo['adapters'] | NetworkInfo['adapters'][0]>(raw);
    const adapters = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    const statusMap: Record<number, string> = {
      0: 'Disconnected',
      1: 'Connecting',
      2: 'Connected',
      3: 'Disconnecting',
      4: 'Hardware not present',
      5: 'Hardware disabled',
      6: 'Hardware malfunction',
      7: 'Media disconnected',
      8: 'Authenticating',
      9: 'Authentication succeeded',
      10: 'Authentication failed',
      11: 'Invalid address',
      12: 'Credentials required',
    };
    return {
      adapters: adapters.map((a) => ({
        name: str(a.name),
        mac: str(a.mac),
        speedMbps: a.speedMbps == null ? null : num(a.speedMbps),
        dhcp: Boolean(a.dhcp),
        ipv4: Array.isArray(a.ipv4) ? a.ipv4.map(String) : [],
        ipv6: Array.isArray(a.ipv6) ? a.ipv6.map(String) : [],
        status: statusMap[num(a.status, 2)] ?? str(a.status, 'Connected'),
      })),
    };
  } catch {
    return { adapters: [] };
  }
}

export async function collectSystemReport(): Promise<SystemReport> {
  const temps = await collectTemps();
  const [os, cpu, ram, motherboard, graphics, storage, network] = await Promise.all([
    collectOs(),
    collectCpu(temps.slice(0, 1)),
    collectRam(),
    collectMotherboard(temps.slice(1, 2).length ? temps.slice(1, 2) : temps.slice(0, 1)),
    collectGraphics(),
    collectStorage(),
    collectNetwork(),
  ]);

  return {
    collectedAt: new Date().toISOString(),
    os,
    cpu,
    ram,
    motherboard,
    graphics,
    storage,
    network,
  };
}
