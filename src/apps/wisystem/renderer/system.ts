type TempReading = { label: string; celsius: number | null };
type SystemSectionId =
  | 'summary'
  | 'os'
  | 'cpu'
  | 'ram'
  | 'motherboard'
  | 'graphics'
  | 'storage'
  | 'network';

type SystemReport = {
  collectedAt: string;
  os: {
    caption: string;
    version: string;
    build: string;
    architecture: string;
    installDate: string;
    computerName: string;
    userName: string;
    uptimeSeconds: number;
  };
  cpu: {
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
  ram: {
    totalGb: number;
    usedGb: number;
    availableGb: number;
    channels: string;
    modules: Array<{
      bank: string;
      capacityGb: number;
      speedMhz: number;
      manufacturer: string;
      partNumber: string;
      formFactor: string;
    }>;
  };
  motherboard: {
    manufacturer: string;
    product: string;
    version: string;
    serial: string;
    biosVendor: string;
    biosVersion: string;
    biosDate: string;
    temps: TempReading[];
  };
  graphics: {
    adapters: Array<{
      name: string;
      adapterRamGb: number;
      driverVersion: string;
      videoMode: string;
      refreshRate: number;
    }>;
  };
  storage: {
    drives: Array<{
      model: string;
      sizeGb: number;
      interfaceType: string;
      mediaType: string;
      serial: string;
      partitions: Array<{ name: string; sizeGb: number; freeGb: number; fileSystem: string }>;
    }>;
  };
  network: {
    adapters: Array<{
      name: string;
      mac: string;
      speedMbps: number | null;
      dhcp: boolean;
      ipv4: string[];
      ipv6: string[];
      status: string;
    }>;
  };
};
type WiSystemApi = {
  getReport(): Promise<{ ok: true; report: SystemReport } | { ok: false; error: string }>;
};

function getSystemApi(): WiSystemApi {
  const existing = (window as unknown as { wiSystem?: WiSystemApi }).wiSystem;
  if (existing) {
    return existing;
  }

  let seq = 0;
  const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e?: unknown) => void }>();

  window.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as {
      channel?: string;
      id?: number;
      result?: unknown;
      error?: string;
    };
    if (data?.channel !== 'wi-system-response' || data.id == null) {
      return;
    }
    const entry = pending.get(data.id);
    if (!entry) {
      return;
    }
    pending.delete(data.id);
    if (data.error) {
      entry.reject(new Error(data.error));
      return;
    }
    entry.resolve(data.result);
  });

  return {
    getReport: () => {
      const id = (seq += 1);
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve: (v) => resolve(v as never), reject });
        window.parent.postMessage({ channel: 'wi-system', id, method: 'getReport', args: [] }, '*');
      });
    },
  };
}

const systemApi = getSystemApi();
const content = document.getElementById('content') as HTMLElement;
const collectedAt = document.getElementById('collected-at') as HTMLElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const sideNav = document.getElementById('side-nav') as HTMLElement;

let report: SystemReport | null = null;
let section: SystemSectionId = 'summary';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h || d) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(' ');
}

function tempHtml(temps: TempReading[]): string {
  const t = temps.find((x) => x.celsius != null);
  if (!t || t.celsius == null) {
    return '';
  }
  const c = t.celsius;
  const pct = Math.max(0, Math.min(100, ((c - 20) / 80) * 100));
  const cls = c >= 80 ? 'hot' : c >= 65 ? 'warn' : '';
  return `<span class="temp">${esc(c.toFixed(0))} °C <span class="temp-bar ${cls}"><i style="width:${pct}%"></i></span></span>`;
}

function row(k: string, v: string): string {
  return `<div class="row"><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`;
}

function block(ico: string, title: string, body: string): string {
  return `<section class="block">
    <div class="block-head"><span class="block-ico ${ico}"></span><h2 class="block-title">${esc(title)}</h2></div>
    <div class="rows">${body}</div>
  </section>`;
}

function renderSummary(r: SystemReport): string {
  const ramSpeed = r.ram.modules[0]?.speedMhz
    ? ` @ ${r.ram.modules[0].speedMhz}MHz`
    : '';
  const cpuTemp = tempHtml(r.cpu.temps);
  const mbTemp = tempHtml(r.motherboard.temps);
  const gpu = r.graphics.adapters[0]?.name ?? '—';
  const disk = r.storage.drives[0]
    ? `${r.storage.drives[0].model} (${r.storage.drives[0].sizeGb} GB)`
    : '—';

  return [
    block(
      'os',
      'Operating System',
      `<div class="headline">${esc(r.os.caption)} ${esc(r.os.architecture)}</div>`,
    ),
    block(
      'cpu',
      'CPU',
      `<div class="headline">${esc(r.cpu.name)}${cpuTemp ? ` &nbsp; ${cpuTemp}` : ''}</div>
       <div class="muted">${esc(r.cpu.cores)} cores / ${esc(r.cpu.logicalProcessors)} threads · max ${esc(r.cpu.maxClockMhz)} MHz</div>`,
    ),
    block(
      'ram',
      'RAM',
      `<div class="headline">${esc(r.ram.totalGb.toFixed(2))}GB ${esc(r.ram.channels)}${esc(ramSpeed)}</div>
       <div class="muted">${esc(r.ram.usedGb.toFixed(2))} GB used · ${esc(r.ram.availableGb.toFixed(2))} GB free</div>
       <div class="bar"><i style="width:${Math.min(100, (r.ram.usedGb / Math.max(0.01, r.ram.totalGb)) * 100)}%"></i></div>`,
    ),
    block(
      'mb',
      'Motherboard',
      `<div class="headline">${esc(r.motherboard.manufacturer)} ${esc(r.motherboard.product)}${mbTemp ? ` &nbsp; ${mbTemp}` : ''}</div>
       <div class="muted">BIOS ${esc(r.motherboard.biosVersion)} · ${esc(r.motherboard.biosDate)}</div>`,
    ),
    block('gpu', 'Graphics', `<div class="headline">${esc(gpu)}</div>`),
    block('disk', 'Storage', `<div class="headline">${esc(disk)}</div>`),
  ].join('');
}

function renderOs(r: SystemReport): string {
  return block(
    'os',
    'Operating System',
    [
      row('Name', esc(r.os.caption)),
      row('Version', esc(r.os.version)),
      row('Build', esc(r.os.build)),
      row('Architecture', esc(r.os.architecture)),
      row('Install date', esc(r.os.installDate)),
      row('Computer', esc(r.os.computerName)),
      row('User', esc(r.os.userName)),
      row('Uptime', esc(formatUptime(r.os.uptimeSeconds))),
    ].join(''),
  );
}

function renderCpu(r: SystemReport): string {
  const temps =
    r.cpu.temps.length > 0
      ? r.cpu.temps
          .map((t) =>
            t.celsius == null
              ? row(t.label, '—')
              : row(t.label, tempHtml([t])),
          )
          .join('')
      : row('Temperature', 'n/a');
  return block(
    'cpu',
    'CPU',
    [
      row('Name', esc(r.cpu.name)),
      row('Manufacturer', esc(r.cpu.manufacturer)),
      row('Cores', esc(r.cpu.cores)),
      row('Threads', esc(r.cpu.logicalProcessors)),
      row('Max clock', `${esc(r.cpu.maxClockMhz)} MHz`),
      row('Current clock', `${esc(r.cpu.currentClockMhz)} MHz`),
      row('Socket', esc(r.cpu.socket)),
      row('L2 cache', r.cpu.l2CacheKb ? `${esc(r.cpu.l2CacheKb)} KB` : '—'),
      row('L3 cache', r.cpu.l3CacheKb ? `${esc(r.cpu.l3CacheKb)} KB` : '—'),
      temps,
    ].join(''),
  );
}

function renderRam(r: SystemReport): string {
  const mods = r.ram.modules
    .map(
      (m, i) =>
        `<div class="headline" style="margin-top:10px">Slot ${i + 1}: ${esc(m.bank)}</div>
         ${row('Capacity', `${esc(m.capacityGb)} GB`)}
         ${row('Speed', `${esc(m.speedMhz)} MHz`)}
         ${row('Manufacturer', esc(m.manufacturer))}
         ${row('Part', esc(m.partNumber))}
         ${row('Form factor', esc(m.formFactor))}`,
    )
    .join('');
  return block(
    'ram',
    'RAM',
    [
      row('Total', `${esc(r.ram.totalGb.toFixed(2))} GB`),
      row('Used', `${esc(r.ram.usedGb.toFixed(2))} GB`),
      row('Available', `${esc(r.ram.availableGb.toFixed(2))} GB`),
      row('Channels', esc(r.ram.channels)),
      `<div class="bar"><i style="width:${Math.min(100, (r.ram.usedGb / Math.max(0.01, r.ram.totalGb)) * 100)}%"></i></div>`,
      mods || '<div class="muted" style="margin-top:8px">No module details</div>',
    ].join(''),
  );
}

function renderMb(r: SystemReport): string {
  return block(
    'mb',
    'Motherboard',
    [
      row('Manufacturer', esc(r.motherboard.manufacturer)),
      row('Product', esc(r.motherboard.product)),
      row('Version', esc(r.motherboard.version)),
      row('Serial', esc(r.motherboard.serial)),
      row('BIOS vendor', esc(r.motherboard.biosVendor)),
      row('BIOS version', esc(r.motherboard.biosVersion)),
      row('BIOS date', esc(r.motherboard.biosDate)),
      r.motherboard.temps.length
        ? r.motherboard.temps
            .map((t) => (t.celsius == null ? row(t.label, '—') : row(t.label, tempHtml([t]))))
            .join('')
        : row('Temperature', 'n/a'),
    ].join(''),
  );
}

function renderGpu(r: SystemReport): string {
  if (!r.graphics.adapters.length) {
    return block('gpu', 'Graphics', '<div class="muted">No adapters found</div>');
  }
  return r.graphics.adapters
    .map((a, i) =>
      block(
        'gpu',
        r.graphics.adapters.length > 1 ? `Graphics ${i + 1}` : 'Graphics',
        [
          row('Name', esc(a.name)),
          row('VRAM', a.adapterRamGb ? `${esc(a.adapterRamGb)} GB` : '—'),
          row('Driver', esc(a.driverVersion)),
          row('Mode', esc(a.videoMode)),
          row('Refresh', a.refreshRate ? `${esc(a.refreshRate)} Hz` : '—'),
        ].join(''),
      ),
    )
    .join('');
}

function renderStorage(r: SystemReport): string {
  if (!r.storage.drives.length) {
    return block('disk', 'Storage', '<div class="muted">No drives found</div>');
  }
  return r.storage.drives
    .map((d, i) => {
      const parts = d.partitions
        .map(
          (p) =>
            `<div class="headline" style="margin-top:8px">${esc(p.name)} · ${esc(p.fileSystem)}</div>
             ${row('Size', `${esc(p.sizeGb)} GB`)}
             ${row('Free', `${esc(p.freeGb)} GB`)}
             <div class="bar"><i style="width:${Math.min(100, ((p.sizeGb - p.freeGb) / Math.max(0.01, p.sizeGb)) * 100)}%"></i></div>`,
        )
        .join('');
      return block(
        'disk',
        r.storage.drives.length > 1 ? `Drive ${i + 1}` : 'Storage',
        [
          row('Model', esc(d.model)),
          row('Size', `${esc(d.sizeGb)} GB`),
          row('Interface', esc(d.interfaceType)),
          row('Media', esc(d.mediaType)),
          row('Serial', esc(d.serial)),
          parts,
        ].join(''),
      );
    })
    .join('');
}

function renderNetwork(r: SystemReport): string {
  if (!r.network.adapters.length) {
    return block('net', 'Network', '<div class="muted">No adapters found</div>');
  }
  return r.network.adapters
    .map((a, i) =>
      block(
        'net',
        r.network.adapters.length > 1 ? `Adapter ${i + 1}` : 'Network',
        [
          row('Name', esc(a.name)),
          row('Status', esc(a.status)),
          row('MAC', esc(a.mac)),
          row('Speed', a.speedMbps != null ? `${esc(a.speedMbps)} Mbps` : '—'),
          row('DHCP', a.dhcp ? 'Yes' : 'No'),
          row(
            'IPv4',
            a.ipv4.map((ip) => `<span class="chip">${esc(ip)}</span>`).join('') || '—',
          ),
          row(
            'IPv6',
            a.ipv6.slice(0, 3).map((ip) => `<span class="chip">${esc(ip)}</span>`).join('') || '—',
          ),
        ].join(''),
      ),
    )
    .join('');
}

function render(): void {
  if (!report) {
    content.innerHTML = '<div class="loading">Collecting system information…</div>';
    return;
  }
  switch (section) {
    case 'os':
      content.innerHTML = renderOs(report);
      break;
    case 'cpu':
      content.innerHTML = renderCpu(report);
      break;
    case 'ram':
      content.innerHTML = renderRam(report);
      break;
    case 'motherboard':
      content.innerHTML = renderMb(report);
      break;
    case 'graphics':
      content.innerHTML = renderGpu(report);
      break;
    case 'storage':
      content.innerHTML = renderStorage(report);
      break;
    case 'network':
      content.innerHTML = renderNetwork(report);
      break;
    default:
      content.innerHTML = renderSummary(report);
  }
}

async function load(): Promise<void> {
  refreshBtn.disabled = true;
  collectedAt.textContent = 'Refreshing…';
  content.innerHTML = '<div class="loading">Collecting system information…</div>';
  try {
    const result = await systemApi.getReport();
    if (!result.ok) {
      content.innerHTML = `<div class="error">${esc(result.error)}</div>`;
      collectedAt.textContent = 'Failed';
      return;
    }
    report = result.report;
    collectedAt.textContent = `Updated ${new Date(report.collectedAt).toLocaleString()}`;
    render();
  } catch (error) {
    content.innerHTML = `<div class="error">${esc(error instanceof Error ? error.message : String(error))}</div>`;
    collectedAt.textContent = 'Failed';
  } finally {
    refreshBtn.disabled = false;
  }
}

sideNav.addEventListener('click', (event) => {
  const btn = (event.target as HTMLElement).closest('button.side-item') as HTMLButtonElement | null;
  if (!btn?.dataset.section) {
    return;
  }
  section = btn.dataset.section as SystemSectionId;
  for (const item of sideNav.querySelectorAll('.side-item')) {
    item.classList.toggle('active', item === btn);
  }
  render();
});

refreshBtn.addEventListener('click', () => {
  void load();
});

void load();
