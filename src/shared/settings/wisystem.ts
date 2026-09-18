export type SystemSectionId =
  | 'summary'
  | 'os'
  | 'cpu'
  | 'ram'
  | 'motherboard'
  | 'graphics'
  | 'storage'
  | 'network';

export type TempReading = {
  label: string;
  celsius: number | null;
};

export type OsInfo = {
  caption: string;
  version: string;
  build: string;
  architecture: string;
  installDate: string;
  computerName: string;
  userName: string;
  uptimeSeconds: number;
};

export type CpuInfo = {
  name: string;
  manufacturer: string;
  cores: number;
  logicalProcessors: number;
  maxClockMhz: number;
  currentClockMhz: number;
  socket: string;
  l2CacheKb: number;
  l3CacheKb: number;
  temps: TempReading[];
};

export type RamModule = {
  bank: string;
  capacityGb: number;
  speedMhz: number;
  manufacturer: string;
  partNumber: string;
  formFactor: string;
};

export type RamInfo = {
  totalGb: number;
  usedGb: number;
  availableGb: number;
  channels: string;
  modules: RamModule[];
};

export type MotherboardInfo = {
  manufacturer: string;
  product: string;
  version: string;
  serial: string;
  biosVendor: string;
  biosVersion: string;
  biosDate: string;
  temps: TempReading[];
};

export type GpuAdapter = {
  name: string;
  adapterRamGb: number;
  driverVersion: string;
  videoMode: string;
  refreshRate: number;
};

export type GraphicsInfo = {
  adapters: GpuAdapter[];
};

export type StorageDrive = {
  model: string;
  sizeGb: number;
  interfaceType: string;
  mediaType: string;
  serial: string;
  partitions: Array<{ name: string; sizeGb: number; freeGb: number; fileSystem: string }>;
};

export type StorageInfo = {
  drives: StorageDrive[];
};

export type NetworkAdapter = {
  name: string;
  mac: string;
  speedMbps: number | null;
  dhcp: boolean;
  ipv4: string[];
  ipv6: string[];
  status: string;
};

export type NetworkInfo = {
  adapters: NetworkAdapter[];
};

export type SystemReport = {
  collectedAt: string;
  os: OsInfo;
  cpu: CpuInfo;
  ram: RamInfo;
  motherboard: MotherboardInfo;
  graphics: GraphicsInfo;
  storage: StorageInfo;
  network: NetworkInfo;
};

export const WISYSTEM_APP_ID = 'wisystem';
