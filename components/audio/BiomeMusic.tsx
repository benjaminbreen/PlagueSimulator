/**
 * BiomeMusic - Physically Modeled Middle Eastern Music
 *
 * Uses Karplus-Strong synthesis for realistic plucked strings (oud, qanun)
 * Modal synthesis for authentic drum sounds (darbuka, riq)
 * Waveguide-inspired nay (reed flute) with breath noise
 */

import React, { useEffect, useRef, useCallback } from 'react';

export type BiomeType = 'marketplace' | 'wealthy' | 'hovels' | 'desert' | 'civic';

interface BiomeMusicProps {
  biome: BiomeType;
  enabled?: boolean;
  volume?: number;
  isPreview?: boolean;
}

// Maqam scales - frequency ratios
const MAQAM_SCALES = {
  hijaz: [1.0, 1.059, 1.26, 1.335, 1.5, 1.587, 1.782, 2.0],
  bayati: [1.0, 1.09, 1.19, 1.335, 1.5, 1.587, 1.782, 2.0],
  rast: [1.0, 1.125, 1.26, 1.335, 1.5, 1.682, 1.87, 2.0],
  saba: [1.0, 1.09, 1.19, 1.26, 1.5, 1.587, 1.782, 2.0],
  nahawand: [1.0, 1.125, 1.19, 1.335, 1.5, 1.587, 1.89, 2.0],
};

// Rhythm patterns - velocity values (0-1)
const RHYTHM_PATTERNS = {
  maqsum: [1, 0, 0.4, 0, 0, 0.6, 0, 0, 0.9, 0, 0.4, 0, 0, 0.6, 0, 0],
  baladi: [1, 0, 0.9, 0, 0, 0.5, 0, 0, 0.8, 0, 0, 0.5, 0, 0.4, 0, 0],
  saidi: [1, 0, 0, 0.8, 0, 0, 0.5, 0, 1, 0, 0, 0.6, 0, 0, 0.4, 0],
  sparse: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0],
  ceremonial: [1, 0, 0, 0, 0, 0, 0, 0.6, 0, 0, 0, 0, 0.7, 0, 0, 0],
};

interface BiomeConfig {
  scale: number[];
  baseFreq: number;
  tempo: number;
  rhythm: number[];
  melodyPattern: number[];
  bassPattern: number[];
  // Instrument levels (0-1)
  oud: number;
  qanun: number;
  nay: number;
  darbuka: number;
  riq: number;
  drone: number;
  // Tonal characteristics
  brightness: number; // 0-1, affects filter cutoff
  reverbMix: number; // 0-1
}

const BIOME_CONFIGS: Record<BiomeType, BiomeConfig> = {
  marketplace: {
    scale: MAQAM_SCALES.hijaz,
    baseFreq: 220,
    tempo: 100,
    rhythm: RHYTHM_PATTERNS.maqsum,
    melodyPattern: [
      0, 2, 3, 4, 3, 2, 4, 3,
      5, 4, 3, 2, 3, 4, 2, 0,
      4, 5, 6, 5, 4, 3, 4, 5,
      3, 2, 0, 2, 0, -1, 0, 0,
    ],
    bassPattern: [0, 0, 4, 0, 0, 0, 3, 0],
    oud: 0.8,
    qanun: 0.6,
    nay: 0.15,
    darbuka: 0.75,
    riq: 0.5,
    drone: 0.12,
    brightness: 0.7,
    reverbMix: 0.25,
  },
  wealthy: {
    scale: MAQAM_SCALES.rast,
    baseFreq: 196,
    tempo: 68,
    rhythm: RHYTHM_PATTERNS.baladi,
    melodyPattern: [
      0, -1, 0, 2, 4, 5, 4, 2,
      0, 2, 3, 4, 5, 6, 5, 4,
      5, 4, 2, 0, 2, 4, 2, 0,
      6, 5, 4, 2, 0, -1, 0, 0,
    ],
    bassPattern: [0, 0, 0, 0, 4, 0, 0, 0],
    oud: 0.9,
    qanun: 0.7,
    nay: 0.35,
    darbuka: 0.25,
    riq: 0.35,
    drone: 0.2,
    brightness: 0.5,
    reverbMix: 0.4,
  },
  hovels: {
    scale: MAQAM_SCALES.bayati,
    baseFreq: 165,
    tempo: 54,
    rhythm: RHYTHM_PATTERNS.sparse,
    melodyPattern: [
      0, 0, 0, 2, 0, 0, -1, 0,
      2, 3, 2, 0, -1, -2, -1, 0,
      0, 2, 4, 2, 0, 0, -1, 0,
      2, 0, 0, 0, -1, 0, 0, 0,
    ],
    bassPattern: [0, 0, 0, 0, 0, 0, -3, 0],
    oud: 0.5,
    qanun: 0.0,
    nay: 0.8,
    darbuka: 0.1,
    riq: 0.0,
    drone: 0.35,
    brightness: 0.3,
    reverbMix: 0.5,
  },
  desert: {
    scale: MAQAM_SCALES.saba,
    baseFreq: 147,
    tempo: 42,
    rhythm: RHYTHM_PATTERNS.sparse,
    melodyPattern: [
      0, 0, 0, 0, 0, 2, 0, 0,
      0, 0, 4, 0, 0, 0, 2, 0,
      5, 4, 0, 0, 2, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ],
    bassPattern: [],
    oud: 0.2,
    qanun: 0.0,
    nay: 0.9,
    darbuka: 0.0,
    riq: 0.0,
    drone: 0.5,
    brightness: 0.25,
    reverbMix: 0.6,
  },
  civic: {
    scale: MAQAM_SCALES.nahawand,
    baseFreq: 174,
    tempo: 62,
    rhythm: RHYTHM_PATTERNS.ceremonial,
    melodyPattern: [
      0, 2, 4, 5, 4, 2, 4, 2,
      0, 0, 2, 4, 5, 6, 5, 4,
      5, 5, 4, 2, 0, 2, 0, 0,
      4, 5, 4, 2, 0, -1, 0, 0,
    ],
    bassPattern: [0, 0, 0, 0, 3, 0, 0, 0],
    oud: 0.6,
    qanun: 0.7,
    nay: 0.25,
    darbuka: 0.35,
    riq: 0.2,
    drone: 0.28,
    brightness: 0.45,
    reverbMix: 0.45,
  },
};

/**
 * Karplus-Strong plucked string synthesis
 * Creates realistic plucked string sounds using a noise burst + filtered delay line
 */
class KarplusStrongString {
  private ctx: AudioContext;
  private delayLine: Float32Array;
  private delayIndex: number = 0;
  private delayLength: number;
  private filterState: number = 0;
  private dampening: number;

  constructor(ctx: AudioContext, frequency: number, dampening: number = 0.5) {
    this.ctx = ctx;
    this.delayLength = Math.round(ctx.sampleRate / frequency);
    this.delayLine = new Float32Array(this.delayLength);
    this.dampening = dampening;
  }

  // Excite the string with noise burst
  pluck(amplitude: number = 1) {
    for (let i = 0; i < this.delayLength; i++) {
      // Shaped noise - less harsh than pure white noise
      this.delayLine[i] = (Math.random() * 2 - 1) * amplitude * 0.5;
    }
  }

  // Get next sample and advance
  tick(): number {
    const index1 = this.delayIndex;
    const index2 = (this.delayIndex + 1) % this.delayLength;

    // Simple averaging lowpass filter (Karplus-Strong algorithm)
    const output = (this.delayLine[index1] + this.delayLine[index2]) * 0.5 * this.dampening;

    // Additional smoothing for warmer tone
    this.filterState = this.filterState * 0.3 + output * 0.7;

    this.delayLine[this.delayIndex] = this.filterState;
    this.delayIndex = (this.delayIndex + 1) % this.delayLength;

    return output;
  }
}

/**
 * Modal drum synthesis
 * Drums modeled as multiple resonant modes with different decay rates
 */
interface DrumMode {
  freq: number;
  amp: number;
  decay: number;
}

const DARBUKA_DUM_MODES: DrumMode[] = [
  { freq: 80, amp: 1.0, decay: 0.15 },
  { freq: 160, amp: 0.5, decay: 0.1 },
  { freq: 240, amp: 0.25, decay: 0.08 },
  { freq: 400, amp: 0.1, decay: 0.05 },
];

const DARBUKA_TAK_MODES: DrumMode[] = [
  { freq: 400, amp: 0.6, decay: 0.04 },
  { freq: 800, amp: 0.8, decay: 0.03 },
  { freq: 1200, amp: 0.5, decay: 0.025 },
  { freq: 2000, amp: 0.3, decay: 0.02 },
];

const RIQ_MODES: DrumMode[] = [
  { freq: 3000, amp: 0.4, decay: 0.08 },
  { freq: 4500, amp: 0.5, decay: 0.06 },
  { freq: 6000, amp: 0.35, decay: 0.05 },
  { freq: 8000, amp: 0.2, decay: 0.04 },
];

class PhysicalMusicEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private reverbGain: GainNode;
  private dryGain: GainNode;
  private convolver: ConvolverNode;
  private config: BiomeConfig;
  private isPlaying: boolean = false;
  private schedulerInterval: ReturnType<typeof setInterval> | null = null;
  private currentStep: number = 0;
  private melodyIndex: number = 0;
  private nextNoteTime: number = 0;
  private volume: number;
  private scriptNodes: ScriptProcessorNode[] = [];
  private activeOscillators: OscillatorNode[] = [];
  private droneNodes: AudioNode[] = [];

  constructor(config: BiomeConfig, volume: number = 0.15) {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.config = config;
    this.volume = volume;

    // Master output chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1 - config.reverbMix;

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.value = config.reverbMix;

    // Create reverb
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createReverbImpulse(2.2, 3);

    // Routing
    this.masterGain.connect(this.dryGain);
    this.masterGain.connect(this.convolver);
    this.convolver.connect(this.reverbGain);
    this.dryGain.connect(this.ctx.destination);
    this.reverbGain.connect(this.ctx.destination);
  }

  private createReverbImpulse(duration: number, decay: number): AudioBuffer {
    const length = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        // Exponential decay with early reflections
        const env = Math.pow(1 - i / length, decay);
        // Add some diffusion
        const diffusion = i < length * 0.1 ? 0.3 : 1;
        data[i] = (Math.random() * 2 - 1) * env * diffusion;
      }
    }
    return buffer;
  }

  private getFrequency(degree: number): number {
    const scale = this.config.scale;
    const octave = Math.floor(degree / scale.length);
    const idx = ((degree % scale.length) + scale.length) % scale.length;
    return this.config.baseFreq * scale[idx] * Math.pow(2, octave);
  }

  /**
   * Karplus-Strong plucked string (Oud)
   * Rich, warm, realistic plucked sound
   */
  private playOud(freq: number, time: number, duration: number, velocity: number) {
    if (this.config.oud <= 0) return;

    const bufferSize = 4096;
    const dampening = 0.996 - (1 - this.config.brightness) * 0.01;

    // Create the string
    const string = new KarplusStrongString(this.ctx, freq, dampening);
    string.pluck(velocity);

    // Create ScriptProcessor for custom synthesis
    const scriptNode = this.ctx.createScriptProcessor(bufferSize, 0, 1);
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let sampleCount = 0;
    const totalSamples = duration * this.ctx.sampleRate;
    const vol = this.volume * this.config.oud * velocity * 0.6;

    // Gentle envelope
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(vol * 0.4, time + duration * 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    // Warm filter
    filter.type = 'lowpass';
    filter.frequency.value = freq * 4 * this.config.brightness + 500;
    filter.Q.value = 0.7;

    scriptNode.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        if (sampleCount < totalSamples) {
          output[i] = string.tick();
          sampleCount++;
        } else {
          output[i] = 0;
        }
      }
    };

    scriptNode.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    this.scriptNodes.push(scriptNode);

    // Clean up after duration
    setTimeout(() => {
      scriptNode.disconnect();
      filter.disconnect();
      gain.disconnect();
      const idx = this.scriptNodes.indexOf(scriptNode);
      if (idx > -1) this.scriptNodes.splice(idx, 1);
    }, (duration + 0.5) * 1000);
  }

  /**
   * Karplus-Strong with chorus for Qanun (plucked zither)
   * Multiple strings with slight detuning for shimmer
   */
  private playQanun(freq: number, time: number, duration: number, velocity: number) {
    if (this.config.qanun <= 0) return;

    const detunes = [-4, 0, 4]; // Cents converted to frequency multipliers
    const vol = this.volume * this.config.qanun * velocity * 0.35;

    detunes.forEach((cents, idx) => {
      const detunedFreq = freq * Math.pow(2, cents / 1200);
      const bufferSize = 2048;
      const dampening = 0.994;

      const string = new KarplusStrongString(this.ctx, detunedFreq, dampening);
      string.pluck(velocity * 0.8);

      const scriptNode = this.ctx.createScriptProcessor(bufferSize, 0, 1);
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      let sampleCount = 0;
      const totalSamples = duration * this.ctx.sampleRate;

      // Staggered attack for natural feel
      const attackDelay = idx * 0.008;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(vol / detunes.length, time + attackDelay + 0.005);
      gain.gain.exponentialRampToValueAtTime(vol * 0.3 / detunes.length, time + duration * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      // Brighter filter for qanun
      filter.type = 'bandpass';
      filter.frequency.value = freq * 2;
      filter.Q.value = 1.5;

      scriptNode.onaudioprocess = (e) => {
        const output = e.outputBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          if (sampleCount < totalSamples) {
            output[i] = string.tick();
            sampleCount++;
          } else {
            output[i] = 0;
          }
        }
      };

      scriptNode.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      this.scriptNodes.push(scriptNode);

      setTimeout(() => {
        scriptNode.disconnect();
        filter.disconnect();
        gain.disconnect();
        const i = this.scriptNodes.indexOf(scriptNode);
        if (i > -1) this.scriptNodes.splice(i, 1);
      }, (duration + 0.5) * 1000);
    });
  }

  /**
   * Nay (reed flute) with breath noise and formants
   */
  private playNay(freq: number, time: number, duration: number, velocity: number) {
    if (this.config.nay <= 0) return;

    const vol = this.volume * this.config.nay * velocity * 0.25;

    // Main tone - triangle for hollow sound
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    // Subtle second harmonic
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    // Vibrato
    const vibrato = this.ctx.createOscillator();
    const vibratoGain = this.ctx.createGain();
    vibrato.frequency.value = 5.5;
    vibratoGain.gain.value = freq * 0.012;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    // Breath noise
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * 0.3;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Formant filter for flute character
    const formant1 = this.ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.value = freq * 1.5;
    formant1.Q.value = 8;

    const formant2 = this.ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.value = freq * 3;
    formant2.Q.value = 5;

    // Gains
    const oscGain = this.ctx.createGain();
    const osc2Gain = this.ctx.createGain();
    const noiseGain = this.ctx.createGain();
    const masterNayGain = this.ctx.createGain();

    // Breath envelope - slow attack
    const attackTime = 0.12;
    masterNayGain.gain.setValueAtTime(0, time);
    masterNayGain.gain.linearRampToValueAtTime(vol, time + attackTime);
    masterNayGain.gain.setValueAtTime(vol, time + duration - 0.15);
    masterNayGain.gain.linearRampToValueAtTime(0, time + duration);

    oscGain.gain.value = 0.7;
    osc2Gain.gain.value = 0.15;
    noiseGain.gain.value = 0.15;

    // Connect
    osc.connect(formant1);
    formant1.connect(oscGain);
    osc2.connect(osc2Gain);
    noise.connect(formant2);
    formant2.connect(noiseGain);

    oscGain.connect(masterNayGain);
    osc2Gain.connect(masterNayGain);
    noiseGain.connect(masterNayGain);
    masterNayGain.connect(this.masterGain);

    // Start
    osc.start(time);
    osc2.start(time);
    vibrato.start(time);
    noise.start(time);

    osc.stop(time + duration + 0.1);
    osc2.stop(time + duration + 0.1);
    vibrato.stop(time + duration + 0.1);
    noise.stop(time + duration);

    this.activeOscillators.push(osc, osc2, vibrato);
  }

  /**
   * Modal synthesis for Darbuka
   */
  private playDarbuka(time: number, velocity: number, isDum: boolean) {
    if (this.config.darbuka <= 0) return;

    const modes = isDum ? DARBUKA_DUM_MODES : DARBUKA_TAK_MODES;
    const vol = this.volume * this.config.darbuka * velocity * 0.5;

    modes.forEach((mode) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.frequency.value = mode.freq;
      osc.type = 'sine';

      gain.gain.setValueAtTime(vol * mode.amp, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + mode.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + mode.decay + 0.05);

      this.activeOscillators.push(osc);
    });

    // Add transient noise for attack
    const noiseLength = isDum ? 0.02 : 0.01;
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * noiseLength, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = isDum ? 'lowpass' : 'highpass';
    noiseFilter.frequency.value = isDum ? 500 : 2000;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = vol * 0.4;

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + noiseLength);
  }

  /**
   * Modal synthesis for Riq (tambourine)
   */
  private playRiq(time: number, velocity: number) {
    if (this.config.riq <= 0) return;

    const vol = this.volume * this.config.riq * velocity * 0.15;

    // Jingles - modal synthesis
    RIQ_MODES.forEach((mode) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Slight randomization for natural feel
      osc.frequency.value = mode.freq * (0.95 + Math.random() * 0.1);
      osc.type = 'sine';

      gain.gain.setValueAtTime(vol * mode.amp, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + mode.decay);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + mode.decay + 0.02);

      this.activeOscillators.push(osc);
    });

    // Skin tap noise
    const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseData.length);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2500;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = vol * 0.5;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.03);
  }

  /**
   * Drone - sustained tonic and fifth
   */
  private startDrone() {
    if (this.config.drone <= 0) return;

    const fundamental = this.config.baseFreq / 2;
    const vol = this.volume * this.config.drone * 0.12;

    // Root
    const osc1 = this.ctx.createOscillator();
    osc1.frequency.value = fundamental;
    osc1.type = 'sine';

    // Fifth
    const osc2 = this.ctx.createOscillator();
    osc2.frequency.value = fundamental * 1.5;
    osc2.type = 'sine';

    // Very slow LFO for subtle movement
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = fundamental * 0.015;

    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();
    gain1.gain.value = vol;
    gain2.gain.value = vol * 0.4;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(filter);
    gain2.connect(filter);
    filter.connect(this.masterGain);

    osc1.start();
    osc2.start();
    lfo.start();

    this.droneNodes.push(osc1, osc2, lfo, gain1, gain2, lfoGain, filter);
  }

  private scheduler() {
    const secondsPerBeat = 60 / this.config.tempo;
    const secondsPer16th = secondsPerBeat / 4;

    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += secondsPer16th;
      this.currentStep = (this.currentStep + 1) % 16;
    }
  }

  private scheduleNote(step: number, time: number) {
    const velocity = this.config.rhythm[step];

    // Percussion
    if (velocity > 0) {
      const isDum = step === 0 || step === 8;
      this.playDarbuka(time, velocity, isDum);

      if (velocity > 0.35 && step % 2 === 0) {
        this.playRiq(time, velocity * 0.6);
      }
    }

    // Melody every 4 steps
    if (step % 4 === 0 && this.config.melodyPattern.length > 0) {
      const degree = this.config.melodyPattern[this.melodyIndex % this.config.melodyPattern.length];
      const freq = this.getFrequency(degree);
      const noteDuration = (60 / this.config.tempo) * 0.9;

      // Rotate through instruments
      const choice = this.melodyIndex % 4;
      if (choice === 0 || choice === 2) {
        this.playOud(freq, time, noteDuration, 0.8);
      } else if (choice === 1) {
        this.playQanun(freq, time, noteDuration * 0.8, 0.7);
      } else {
        this.playNay(freq, time, noteDuration * 1.3, 0.6);
      }

      this.melodyIndex++;
    }

    // Bass on downbeats
    if (step === 0 && this.config.bassPattern.length > 0) {
      const bassIdx = Math.floor(this.melodyIndex / 8) % this.config.bassPattern.length;
      const bassDegree = this.config.bassPattern[bassIdx];
      if (bassDegree !== 0) {
        this.playOud(this.getFrequency(bassDegree - 7), time, (60 / this.config.tempo) * 1.2, 0.5);
      }
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.8);

    this.currentStep = 0;
    this.melodyIndex = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.2;

    this.startDrone();
    this.schedulerInterval = setInterval(() => this.scheduler(), 25);
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }

    setTimeout(() => {
      this.scriptNodes.forEach((n) => { try { n.disconnect(); } catch {} });
      this.activeOscillators.forEach((o) => { try { o.stop(); o.disconnect(); } catch {} });
      this.droneNodes.forEach((n) => { try { n.disconnect(); } catch {} });
      this.scriptNodes = [];
      this.activeOscillators = [];
      this.droneNodes = [];
    }, 500);
  }

  dispose() {
    this.stop();
    setTimeout(() => {
      try { this.ctx.close(); } catch {}
    }, 600);
  }
}

export const BiomeMusic: React.FC<BiomeMusicProps> = ({
  biome,
  enabled = true,
  volume = 0.18,
}) => {
  const engineRef = useRef<PhysicalMusicEngine | null>(null);

  useEffect(() => {
    if (enabled) {
      engineRef.current = new PhysicalMusicEngine(BIOME_CONFIGS[biome], volume);
      engineRef.current.start();
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [enabled, biome, volume]);

  return null;
};

export const useBiomeMusicPreview = () => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPreview, setCurrentPreview] = React.useState<BiomeType | null>(null);

  const playPreview = useCallback((biome: BiomeType, duration: number = 15000) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCurrentPreview(biome);
    timeoutRef.current = setTimeout(() => {
      setCurrentPreview(null);
      timeoutRef.current = null;
    }, duration);
  }, []);

  const stopPreview = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setCurrentPreview(null);
  }, []);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return { currentPreview, playPreview, stopPreview };
};

export const BIOME_INFO: Record<BiomeType, { name: string; description: string }> = {
  marketplace: {
    name: 'Marketplace',
    description: 'Lively Hijaz mode with oud, qanun, and maqsum rhythm',
  },
  wealthy: {
    name: 'Wealthy Quarter',
    description: 'Refined Rast mode with elegant courtyard instrumentation',
  },
  hovels: {
    name: 'Poor Quarter',
    description: 'Mournful Bayati mode with lonely nay and sparse percussion',
  },
  desert: {
    name: 'Desert Outskirts',
    description: 'Haunting Saba mode with wind-like nay over deep drone',
  },
  civic: {
    name: 'Civic District',
    description: 'Dignified Nahawand mode with ceremonial rhythm',
  },
};

export default BiomeMusic;
