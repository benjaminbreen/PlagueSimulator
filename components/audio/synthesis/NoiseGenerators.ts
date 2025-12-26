/**
 * Noise generation utilities for ambient sound synthesis
 * Provides filtered noise, drones, and texture generators
 */

// Shared noise buffer for efficiency (reused across generators)
let sharedNoiseBuffer: AudioBuffer | null = null;

export function createNoiseBuffer(ctx: AudioContext, duration: number = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  return buffer;
}

export function getSharedNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (!sharedNoiseBuffer || sharedNoiseBuffer.sampleRate !== ctx.sampleRate) {
    sharedNoiseBuffer = createNoiseBuffer(ctx, 4);
  }
  return sharedNoiseBuffer;
}

/**
 * Creates a looping filtered noise source
 */
export function createFilteredNoise(
  ctx: AudioContext,
  options: {
    lowFreq: number;
    highFreq: number;
    gain?: number;
    Q?: number;
  }
): { source: AudioBufferSourceNode; filter: BiquadFilterNode; gainNode: GainNode } {
  const { lowFreq, highFreq, gain = 0.1, Q = 1 } = options;

  const buffer = getSharedNoiseBuffer(ctx);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  // Bandpass filter for the frequency range
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (lowFreq + highFreq) / 2;
  filter.Q.value = Q;

  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;

  source.connect(filter);
  filter.connect(gainNode);

  return { source, filter, gainNode };
}

/**
 * Creates a lowpass filtered noise for wind effects
 */
export function createWindNoise(
  ctx: AudioContext,
  options: {
    cutoff: number;
    gain?: number;
    resonance?: number;
  }
): { source: AudioBufferSourceNode; filter: BiquadFilterNode; gainNode: GainNode } {
  const { cutoff, gain = 0.05, resonance = 0.5 } = options;

  const buffer = getSharedNoiseBuffer(ctx);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  filter.Q.value = resonance;

  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;

  source.connect(filter);
  filter.connect(gainNode);

  return { source, filter, gainNode };
}

/**
 * Creates brown noise (deeper, more rumbling)
 */
export function createBrownNoiseBuffer(ctx: AudioContext, duration: number = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let lastOut = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5; // Compensate for volume loss
  }

  return buffer;
}

/**
 * Creates pink noise (balanced frequency spectrum)
 */
export function createPinkNoiseBuffer(ctx: AudioContext, duration: number = 2): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  return buffer;
}

/**
 * Amplitude modulated noise for crowd murmur
 */
export function createModulatedNoise(
  ctx: AudioContext,
  options: {
    lowFreq: number;
    highFreq: number;
    modRate: number;  // LFO rate for modulation
    modDepth: number; // 0-1
    gain?: number;
  }
): {
  source: AudioBufferSourceNode;
  filter: BiquadFilterNode;
  lfo: OscillatorNode;
  gainNode: GainNode;
  modGain: GainNode;
} {
  const { lowFreq, highFreq, modRate, modDepth, gain = 0.1 } = options;

  const buffer = getSharedNoiseBuffer(ctx);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = (lowFreq + highFreq) / 2;
  filter.Q.value = 0.5;

  // LFO for amplitude modulation
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = modRate;

  const modGain = ctx.createGain();
  modGain.gain.value = modDepth * gain;

  const gainNode = ctx.createGain();
  gainNode.gain.value = gain * (1 - modDepth * 0.5);

  source.connect(filter);
  filter.connect(gainNode);
  lfo.connect(modGain);
  modGain.connect(gainNode.gain);

  return { source, filter, lfo, gainNode, modGain };
}

/**
 * Grain cloud for subtle texture
 */
export class GrainCloud {
  private ctx: AudioContext;
  private output: GainNode;
  private grainInterval: number | null = null;
  private grainBuffer: AudioBuffer;
  private isPlaying: boolean = false;

  constructor(
    ctx: AudioContext,
    private options: {
      grainSize: number;      // seconds
      grainDensity: number;   // grains per second
      pitchVariation: number; // semitones
      panSpread: number;      // 0-1
      gain?: number;
    }
  ) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = options.gain ?? 0.1;
    this.grainBuffer = getSharedNoiseBuffer(ctx);
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.scheduleGrains();
  }

  stop(): void {
    if (this.grainInterval !== null) {
      clearInterval(this.grainInterval);
      this.grainInterval = null;
    }
    this.isPlaying = false;
  }

  private scheduleGrains(): void {
    const intervalMs = 1000 / this.options.grainDensity;

    this.grainInterval = window.setInterval(() => {
      if (!this.isPlaying) return;
      this.playGrain();
    }, intervalMs);
  }

  private playGrain(): void {
    const source = this.ctx.createBufferSource();
    source.buffer = this.grainBuffer;

    // Random start position
    const startOffset = Math.random() * (this.grainBuffer.duration - this.options.grainSize);

    // Pitch variation
    const pitchVar = this.options.pitchVariation;
    source.playbackRate.value = Math.pow(2, (Math.random() * 2 - 1) * pitchVar / 12);

    // Envelope
    const envelope = this.ctx.createGain();
    envelope.gain.value = 0;

    const now = this.ctx.currentTime;
    const attackTime = this.options.grainSize * 0.3;
    const releaseTime = this.options.grainSize * 0.5;

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(1, now + attackTime);
    envelope.gain.linearRampToValueAtTime(0, now + this.options.grainSize);

    // Panning
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() * 2 - 1) * this.options.panSpread;

    source.connect(envelope);
    envelope.connect(panner);
    panner.connect(this.output);

    source.start(now, startOffset, this.options.grainSize);

    // Cleanup
    source.onended = () => {
      source.disconnect();
      envelope.disconnect();
      panner.disconnect();
    };
  }

  setGain(value: number): void {
    this.output.gain.setTargetAtTime(value, this.ctx.currentTime, 0.1);
  }

  getOutput(): GainNode {
    return this.output;
  }
}
