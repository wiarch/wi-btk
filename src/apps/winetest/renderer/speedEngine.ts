export type SpeedPhase = 'idle' | 'ping' | 'download' | 'upload' | 'done';

export type SpeedSample = {
  downloadMbps: number;
  uploadMbps: number;
  pingMs: number;
  jitterMs: number;
  downLatencyMs: number;
  upLatencyMs: number;
};

export type SpeedProgress = {
  phase: SpeedPhase;
  liveMbps: number;
  sample: Partial<SpeedSample>;
};

function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    const err = new Error('Aborted');
    err.name = 'AbortError';
    throw err;
  }
}

async function readBody(
  response: Response,
  onChunk?: (bytes: number) => void,
): Promise<number> {
  if (!response.body) {
    const buf = await response.arrayBuffer();
    onChunk?.(buf.byteLength);
    return buf.byteLength;
  }
  const reader = response.body.getReader();
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    const n = value?.byteLength ?? 0;
    received += n;
    onChunk?.(n);
  }
  return received;
}

async function pingOnce(signal: AbortSignal): Promise<number> {
  const url = `https://www.cloudflare.com/cdn-cgi/trace?r=${Math.random()}`;
  const start = performance.now();
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`ping HTTP ${response.status}`);
  }
  await response.arrayBuffer();
  return performance.now() - start;
}

async function measurePing(
  signal: AbortSignal,
  onTick?: (ms: number) => void,
): Promise<{ pingMs: number; jitterMs: number }> {
  const samples: number[] = [];
  let lastError: Error | null = null;
  for (let i = 0; i < 6; i += 1) {
    throwIfAborted(signal);
    try {
      const ms = await pingOnce(signal);
      samples.push(ms);
      onTick?.(ms);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  if (samples.length === 0) {
    throw lastError ?? new Error('Ping failed');
  }
  const pingMs = median(samples);
  const jitterMs =
    samples.length > 1
      ? median(samples.slice(1).map((value, index) => Math.abs(value - samples[index])))
      : 0;
  return { pingMs, jitterMs };
}

async function downloadOnce(
  bytes: number,
  signal: AbortSignal,
  onChunk?: (bytes: number) => void,
): Promise<number> {
  const url = `https://speed.cloudflare.com/__down?bytes=${bytes}&r=${Math.random()}`;
  const start = performance.now();
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`download failed: ${response.status}`);
  }
  const received = await readBody(response, onChunk);
  const seconds = (performance.now() - start) / 1000;
  return seconds > 0 ? (received * 8) / (seconds * 1_000_000) : 0;
}

async function uploadOnce(
  bytes: number,
  signal: AbortSignal,
  onTick?: (loaded: number) => void,
): Promise<number> {
  const payload = new Uint8Array(bytes);
  const url = `https://speed.cloudflare.com/__up?r=${Math.random()}`;
  const start = performance.now();
  const tickId = window.setInterval(() => {
    const elapsed = (performance.now() - start) / 1000;
    const estimate = Math.min(bytes, bytes * Math.min(0.95, elapsed / Math.max(0.4, bytes / 2_000_000)));
    onTick?.(estimate);
  }, 80);
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: payload,
      signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`upload failed: ${response.status}`);
    }
    await response.arrayBuffer();
  } finally {
    window.clearInterval(tickId);
  }
  onTick?.(bytes);
  const seconds = (performance.now() - start) / 1000;
  return seconds > 0 ? (bytes * 8) / (seconds * 1_000_000) : 0;
}

async function runParallel(count: number, job: () => Promise<number>): Promise<number[]> {
  const results = await Promise.allSettled(Array.from({ length: count }, () => job()));
  const ok = results
    .filter((r): r is PromiseFulfilledResult<number> => r.status === 'fulfilled')
    .map((r) => r.value);
  if (ok.length === 0) {
    const first = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
    throw first?.reason instanceof Error
      ? first.reason
      : new Error(String(first?.reason ?? 'all streams failed'));
  }
  return ok;
}

function createLiveMeter(
  onProgress: (progress: SpeedProgress) => void,
  phase: SpeedPhase,
  sample: Partial<SpeedSample>,
): { add: (bytes: number) => void } {
  let total = 0;
  let lastEmit = 0;
  const start = performance.now();
  return {
    add(bytes: number) {
      total += bytes;
      const now = performance.now();
      if (now - lastEmit < 80) {
        return;
      }
      lastEmit = now;
      const seconds = (now - start) / 1000;
      const liveMbps = seconds > 0 ? (total * 8) / (seconds * 1_000_000) : 0;
      onProgress({ phase, liveMbps, sample: { ...sample } });
    },
  };
}

export async function fetchPublicIp(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    if (!response.ok) {
      return '—';
    }
    const data = (await response.json()) as { ip?: string };
    return data.ip ?? '—';
  } catch {
    return '—';
  }
}

export async function runSpeedTest(
  mode: 'multi' | 'single',
  onProgress: (progress: SpeedProgress) => void,
  signal: AbortSignal,
): Promise<SpeedSample> {
  throwIfAborted(signal);

  if (!navigator.onLine) {
    throw new Error('Sin conexión a internet');
  }

  const sample: Partial<SpeedSample> = {
    downloadMbps: 0,
    uploadMbps: 0,
    pingMs: 0,
    jitterMs: 0,
    downLatencyMs: 0,
    upLatencyMs: 0,
  };

  onProgress({ phase: 'ping', liveMbps: 0, sample: { ...sample } });
  const ping = await measurePing(signal, (ms) => {
    sample.pingMs = ms;
    onProgress({ phase: 'ping', liveMbps: 0, sample: { ...sample } });
  });
  sample.pingMs = ping.pingMs;
  sample.jitterMs = ping.jitterMs;
  sample.downLatencyMs = ping.pingMs;

  const parallel = mode === 'multi' ? 4 : 1;
  // Smaller first probe, then scale up — more reliable on flaky links
  const downChunks =
    mode === 'multi' ? [2_000_000, 8_000_000, 16_000_000] : [4_000_000, 12_000_000];
  const upChunks = mode === 'multi' ? [500_000, 2_000_000, 4_000_000] : [1_000_000, 3_000_000];

  onProgress({ phase: 'download', liveMbps: 0, sample: { ...sample } });
  let downRates: number[] = [];
  let lastDownError: Error | null = null;
  for (const chunk of downChunks) {
    throwIfAborted(signal);
    try {
      const meter = createLiveMeter(onProgress, 'download', sample);
      downRates = await runParallel(parallel, () => downloadOnce(chunk, signal, (n) => meter.add(n)));
      // Keep going with larger chunks if first succeeded and rate looks capped by size
      const rate = downRates.reduce((s, r) => s + r, 0);
      sample.downloadMbps = rate;
      onProgress({ phase: 'download', liveMbps: rate, sample: { ...sample } });
      if (chunk >= 8_000_000 || rate < 40) {
        break;
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        throw error;
      }
      lastDownError = error instanceof Error ? error : new Error(String(error));
    }
  }
  if (downRates.length === 0) {
    throw lastDownError ?? new Error('Download failed');
  }
  sample.downloadMbps = downRates.reduce((sum, rate) => sum + rate, 0);
  // Measure loaded latency under download pressure
  try {
    const loaded = await pingOnce(signal);
    sample.downLatencyMs = loaded;
  } catch {
    // keep idle ping
  }
  onProgress({
    phase: 'download',
    liveMbps: sample.downloadMbps,
    sample: { ...sample },
  });

  onProgress({ phase: 'upload', liveMbps: 0, sample: { ...sample } });
  let upRates: number[] = [];
  let lastUpError: Error | null = null;
  for (const chunk of upChunks) {
    throwIfAborted(signal);
    try {
      const meter = createLiveMeter(onProgress, 'upload', sample);
      upRates = await runParallel(parallel, () => uploadOnce(chunk, signal, (n) => meter.add(n)));
      const rate = upRates.reduce((s, r) => s + r, 0);
      sample.uploadMbps = rate;
      onProgress({ phase: 'upload', liveMbps: rate, sample: { ...sample } });
      if (chunk >= 2_000_000 || rate < 20) {
        break;
      }
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        throw error;
      }
      lastUpError = error instanceof Error ? error : new Error(String(error));
    }
  }
  if (upRates.length === 0) {
    throw lastUpError ?? new Error('Upload failed');
  }
  sample.uploadMbps = upRates.reduce((sum, rate) => sum + rate, 0);
  sample.upLatencyMs = sample.pingMs;

  const result: SpeedSample = {
    downloadMbps: sample.downloadMbps ?? 0,
    uploadMbps: sample.uploadMbps ?? 0,
    pingMs: sample.pingMs ?? 0,
    jitterMs: sample.jitterMs ?? 0,
    downLatencyMs: sample.downLatencyMs ?? 0,
    upLatencyMs: sample.upLatencyMs ?? 0,
  };

  onProgress({ phase: 'done', liveMbps: result.downloadMbps, sample: result });
  return result;
}
