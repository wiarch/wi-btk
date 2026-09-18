export type VoiceEffectId =
  | 'none'
  | 'robot'
  | 'radio'
  | 'echo'
  | 'reverb'
  | 'deep'
  | 'helium'
  | 'monster'
  | 'alien';

export type VoicePadId = 'honk' | 'rim' | 'laser' | 'boom';

export const VOICE_EFFECT_IDS: VoiceEffectId[] = [
  'none',
  'robot',
  'radio',
  'echo',
  'reverb',
  'deep',
  'helium',
  'monster',
  'alien',
];

export const VOICE_PAD_IDS: VoicePadId[] = ['honk', 'rim', 'laser', 'boom'];

type EffectGraph = {
  input: AudioNode;
  output: AudioNode;
  dispose: () => void;
};

export type VoiceEffectSession = {
  stream: MediaStream;
  setEffect(effect: VoiceEffectId): void;
  setMonitor(enabled: boolean): void;
  playPad(pad: VoicePadId): void;
  dispose(): void;
};

function makeImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(rate * seconds));
  const buffer = ctx.createBuffer(2, length, rate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return buffer;
}

function buildEffectGraph(ctx: AudioContext, effect: VoiceEffectId): EffectGraph {
  const input = ctx.createGain();
  const output = ctx.createGain();
  const nodes: AudioNode[] = [input, output];
  const stoppers: Array<() => void> = [];

  const connect = (...chain: AudioNode[]): void => {
    for (let i = 0; i < chain.length - 1; i += 1) {
      chain[i].connect(chain[i + 1]);
    }
  };

  if (effect === 'none') {
    connect(input, output);
  } else if (effect === 'robot') {
    const carrier = ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.value = 38;
    const carrierGain = ctx.createGain();
    carrierGain.gain.value = 0.55;
    const ring = ctx.createGain();
    ring.gain.value = 0;
    const tone = ctx.createBiquadFilter();
    tone.type = 'bandpass';
    tone.frequency.value = 1200;
    tone.Q.value = 0.7;
    const mix = ctx.createGain();
    mix.gain.value = 1.15;
    carrier.connect(carrierGain);
    carrierGain.connect(ring.gain);
    connect(input, ring, tone, mix, output);
    carrier.start();
    stoppers.push(() => {
      try {
        carrier.stop();
      } catch {
        /* already stopped */
      }
    });
    nodes.push(carrier, carrierGain, ring, tone, mix);
  } else if (effect === 'radio') {
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1800;
    band.Q.value = 1.4;
    const crush = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 3.2) * 0.9;
    }
    crush.curve = curve;
    const hiss = ctx.createGain();
    hiss.gain.value = 0.04;
    const noise = ctx.createBufferSource();
    const noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    noise.buffer = noiseBuf;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2500;
    connect(input, band, crush, output);
    noise.connect(noiseFilter);
    noiseFilter.connect(hiss);
    hiss.connect(output);
    noise.start();
    stoppers.push(() => {
      try {
        noise.stop();
      } catch {
        /* already stopped */
      }
    });
    nodes.push(band, crush, hiss, noise, noiseFilter);
  } else if (effect === 'echo') {
    const dry = ctx.createGain();
    dry.gain.value = 0.85;
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.28;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    input.connect(dry);
    dry.connect(output);
    input.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(output);
    nodes.push(dry, delay, feedback, wet);
  } else if (effect === 'reverb') {
    const dry = ctx.createGain();
    dry.gain.value = 0.7;
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, 2.2, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    input.connect(dry);
    dry.connect(output);
    input.connect(convolver);
    convolver.connect(wet);
    wet.connect(output);
    nodes.push(dry, convolver, wet);
  } else if (effect === 'deep') {
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 180;
    low.gain.value = 10;
    const cut = ctx.createBiquadFilter();
    cut.type = 'lowpass';
    cut.frequency.value = 2200;
    const gain = ctx.createGain();
    gain.gain.value = 1.2;
    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = 0.012;
    connect(input, low, cut, delay, gain, output);
    nodes.push(low, cut, gain, delay);
  } else if (effect === 'helium') {
    const high = ctx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 1800;
    high.gain.value = 9;
    const band = ctx.createBiquadFilter();
    band.type = 'peaking';
    band.frequency.value = 3200;
    band.Q.value = 1.2;
    band.gain.value = 6;
    const delay = ctx.createDelay(0.05);
    delay.delayTime.value = 0.004;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 6.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.0025;
    lfo.connect(lfoGain);
    lfoGain.connect(delay.delayTime);
    lfo.start();
    stoppers.push(() => {
      try {
        lfo.stop();
      } catch {
        /* already stopped */
      }
    });
    const gain = ctx.createGain();
    gain.gain.value = 1.05;
    connect(input, high, band, delay, gain, output);
    nodes.push(high, band, delay, lfo, lfoGain, gain);
  } else if (effect === 'monster') {
    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 120;
    low.gain.value = 12;
    const crush = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < curve.length; i += 1) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.sign(x) * Math.pow(Math.abs(x), 0.55);
    }
    crush.curve = curve;
    const delay = ctx.createDelay(0.08);
    delay.delayTime.value = 0.028;
    const gain = ctx.createGain();
    gain.gain.value = 1.1;
    connect(input, low, crush, delay, gain, output);
    nodes.push(low, crush, delay, gain);
  } else {
    // alien
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = 70;
    const carrierGain = ctx.createGain();
    carrierGain.gain.value = 0.7;
    const ring = ctx.createGain();
    ring.gain.value = 0;
    const delay = ctx.createDelay(0.2);
    delay.delayTime.value = 0.08;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.25;
    const wet = ctx.createGain();
    wet.gain.value = 0.9;
    carrier.connect(carrierGain);
    carrierGain.connect(ring.gain);
    input.connect(ring);
    ring.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(output);
    ring.connect(output);
    carrier.start();
    stoppers.push(() => {
      try {
        carrier.stop();
      } catch {
        /* already stopped */
      }
    });
    nodes.push(carrier, carrierGain, ring, delay, feedback, wet);
  }

  return {
    input,
    output,
    dispose: () => {
      for (const stop of stoppers) stop();
      for (const node of nodes) {
        try {
          node.disconnect();
        } catch {
          /* already disconnected */
        }
      }
    },
  };
}

function playPadTone(ctx: AudioContext, dest: AudioNode, pad: VoicePadId): void {
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.0001;
  master.connect(dest);

  if (pad === 'honk') {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(280, now + 0.35);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.connect(master);
    osc.start(now);
    osc.stop(now + 0.42);
    return;
  }

  if (pad === 'rim') {
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 180;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.4, now + 0.005);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(filter);
    filter.connect(master);
    osc.start(now);
    osc.stop(now + 0.14);
    return;
  }

  if (pad === 'laser') {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.28);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.28, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(master);
    osc.start(now);
    osc.stop(now + 0.32);
    return;
  }

  // boom
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(90, now);
  osc.frequency.exponentialRampToValueAtTime(35, now + 0.45);
  const crush = ctx.createWaveShaper();
  const curve = new Float32Array(128);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 4);
  }
  crush.curve = curve;
  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.55, now + 0.01);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  osc.connect(crush);
  crush.connect(master);
  osc.start(now);
  osc.stop(now + 0.52);
}

export async function createVoiceEffectSession(
  micStream: MediaStream,
  effect: VoiceEffectId,
  monitor = false,
): Promise<VoiceEffectSession> {
  const ctx = new AudioContext();
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  const source = ctx.createMediaStreamSource(micStream);
  const destination = ctx.createMediaStreamDestination();
  const monitorGain = ctx.createGain();
  monitorGain.gain.value = monitor ? 0.7 : 0;
  monitorGain.connect(ctx.destination);

  let graph = buildEffectGraph(ctx, effect);
  source.connect(graph.input);
  graph.output.connect(destination);
  graph.output.connect(monitorGain);

  return {
    stream: destination.stream,
    setEffect(next) {
      source.disconnect();
      graph.output.disconnect();
      graph.dispose();
      graph = buildEffectGraph(ctx, next);
      source.connect(graph.input);
      graph.output.connect(destination);
      graph.output.connect(monitorGain);
    },
    setMonitor(enabled) {
      monitorGain.gain.value = enabled ? 0.7 : 0;
    },
    playPad(pad) {
      playPadTone(ctx, destination, pad);
      if (monitorGain.gain.value > 0) {
        playPadTone(ctx, monitorGain, pad);
      }
    },
    dispose() {
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      graph.dispose();
      monitorGain.disconnect();
      void ctx.close();
    },
  };
}
