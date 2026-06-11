import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets', 'sounds');
mkdirSync(outDir, { recursive: true });

function writeWav(filePath, samples, sampleRate = 44100) {
  const numSamples = samples.length;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  writeFileSync(filePath, buffer);
}

function tone(freq, durationSec, sampleRate, volume = 0.35) {
  const count = Math.floor(durationSec * sampleRate);
  const samples = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    const env = Math.min(1, i / (sampleRate * 0.01)) * Math.exp(-t * 8);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * env * volume;
  }
  return samples;
}

function concat(...parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Float64Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function silence(durationSec, sampleRate) {
  return new Float64Array(Math.floor(durationSec * sampleRate));
}

function pop(sampleRate) {
  const count = Math.floor(sampleRate * 0.06);
  const samples = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const env = Math.exp(-i / (sampleRate * 0.015));
    samples[i] = (Math.random() * 2 - 1) * env * 0.5;
  }
  return samples;
}

function shutter(sampleRate) {
  const count = Math.floor(sampleRate * 0.12);
  const samples = new Float64Array(count);
  for (let i = 0; i < count; i += 1) {
    const t = i / sampleRate;
    const freq = 1800 - t * 9000;
    const env = Math.exp(-t * 18);
    samples[i] = Math.sin(2 * Math.PI * Math.max(120, freq) * t) * env * 0.45;
  }
  return samples;
}

const sampleRate = 44100;

writeWav(
  join(outDir, 'chime.wav'),
  concat(tone(880, 0.09, sampleRate), silence(0.03, sampleRate), tone(1175, 0.14, sampleRate)),
  sampleRate,
);
writeWav(join(outDir, 'pop.wav'), pop(sampleRate), sampleRate);
writeWav(join(outDir, 'shutter.wav'), shutter(sampleRate), sampleRate);
writeWav(join(outDir, 'ding.wav'), tone(660, 0.22, sampleRate, 0.4), sampleRate);

writeWav(
  join(outDir, 'record-start.wav'),
  concat(tone(523, 0.08, sampleRate, 0.38), silence(0.02, sampleRate), tone(784, 0.12, sampleRate, 0.38)),
  sampleRate,
);
writeWav(
  join(outDir, 'record-pause.wav'),
  tone(392, 0.16, sampleRate, 0.36),
  sampleRate,
);
writeWav(
  join(outDir, 'record-stop.wav'),
  concat(tone(622, 0.07, sampleRate, 0.34), silence(0.04, sampleRate), tone(440, 0.18, sampleRate, 0.34)),
  sampleRate,
);

console.log('Generated capture sounds in', outDir);
