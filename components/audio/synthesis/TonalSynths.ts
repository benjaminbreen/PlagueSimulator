/**
 * Tonal synthesis utilities for ambient sound
 * Provides drones, melodic elements, and tonal textures
 */

/**
 * Creates a smooth drone with optional harmonics
 */
export function createDrone(
  ctx: AudioContext,
  options: {
    frequency: number;
    harmonics?: number[];  // Relative amplitudes [1, 0.5, 0.25, ...]
    gain?: number;
    type?: OscillatorType;
  }
): { oscillators: OscillatorNode[]; gainNode: GainNode; output: GainNode } {
  const { frequency, harmonics = [1], gain = 0.1, type = 'sine' } = options;

  const oscillators: OscillatorNode[] = [];
  const output = ctx.createGain();
  output.gain.value = gain;

  harmonics.forEach((amp, i) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency * (i + 1);

    const oscGain = ctx.createGain();
    oscGain.gain.value = amp / harmonics.length;

    osc.connect(oscGain);
    oscGain.connect(output);
    oscillators.push(osc);
  });

  return { oscillators, gainNode: output, output };
}

/**
 * Creates a drone with slow LFO modulation for organic feel
 */
export function createModulatedDrone(
  ctx: AudioContext,
  options: {
    frequency: number;
    lfoRate?: number;      // Hz
    lfoDepth?: number;     // cents
    gain?: number;
    type?: OscillatorType;
  }
): { oscillator: OscillatorNode; lfo: OscillatorNode; gainNode: GainNode } {
  const { frequency, lfoRate = 0.1, lfoDepth = 5, gain = 0.1, type = 'sine' } = options;

  const oscillator = ctx.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;

  // LFO for subtle pitch variation
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = lfoRate;

  const lfoGain = ctx.createGain();
  // Convert cents to frequency: cents = 1200 * log2(f1/f0)
  lfoGain.gain.value = frequency * (Math.pow(2, lfoDepth / 1200) - 1);

  lfo.connect(lfoGain);
  lfoGain.connect(oscillator.frequency);

  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;

  oscillator.connect(gainNode);

  return { oscillator, lfo, gainNode };
}

/**
 * Creates a pad-like sound with slow attack/release
 */
export class PadSynth {
  private ctx: AudioContext;
  private oscillators: OscillatorNode[] = [];
  private output: GainNode;
  private filter: BiquadFilterNode;
  private isPlaying: boolean = false;

  constructor(ctx: AudioContext, private gain: number = 0.1) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 0;

    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 2000;
    this.filter.Q.value = 0.5;

    this.filter.connect(this.output);
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  playChord(frequencies: number[], duration?: number): void {
    this.stopAll();

    const now = this.ctx.currentTime;

    frequencies.forEach((freq) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const oscGain = this.ctx.createGain();
      oscGain.gain.value = 1 / frequencies.length;

      osc.connect(oscGain);
      oscGain.connect(this.filter);
      osc.start(now);
      this.oscillators.push(osc);
    });

    // Slow fade in
    this.output.gain.setValueAtTime(0, now);
    this.output.gain.linearRampToValueAtTime(this.gain, now + 2);

    if (duration) {
      this.output.gain.setValueAtTime(this.gain, now + duration - 2);
      this.output.gain.linearRampToValueAtTime(0, now + duration);
    }

    this.isPlaying = true;
  }

  stopAll(): void {
    const now = this.ctx.currentTime;
    this.output.gain.setTargetAtTime(0, now, 0.5);

    setTimeout(() => {
      this.oscillators.forEach((osc) => {
        try { osc.stop(); } catch {}
        osc.disconnect();
      });
      this.oscillators = [];
    }, 2000);

    this.isPlaying = false;
  }

  setGain(value: number): void {
    this.gain = value;
    if (this.isPlaying) {
      this.output.gain.setTargetAtTime(value, this.ctx.currentTime, 0.3);
    }
  }

  getOutput(): GainNode {
    return this.output;
  }
}

/**
 * Simple FM synthesis for bird chirps and similar
 */
export function createFMChirp(
  ctx: AudioContext,
  options: {
    carrierFreq: number;
    modFreq: number;
    modIndex: number;
    duration: number;
    gain?: number;
  }
): { play: () => void } {
  const { carrierFreq, modFreq, modIndex, duration, gain = 0.1 } = options;

  return {
    play: () => {
      const now = ctx.currentTime;

      // Carrier oscillator
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.value = carrierFreq;

      // Modulator
      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.value = modFreq;

      const modGain = ctx.createGain();
      modGain.gain.value = modIndex * modFreq;

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      // Envelope
      const envelope = ctx.createGain();
      envelope.gain.value = 0;

      const attackTime = duration * 0.1;
      const releaseTime = duration * 0.6;

      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(gain, now + attackTime);
      envelope.gain.setValueAtTime(gain, now + duration - releaseTime);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

      carrier.connect(envelope);
      envelope.connect(ctx.destination);

      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + duration);
      modulator.stop(now + duration);

      // Cleanup
      carrier.onended = () => {
        carrier.disconnect();
        modulator.disconnect();
        modGain.disconnect();
        envelope.disconnect();
      };
    }
  };
}

/**
 * Creates a reverb effect using feedback delay network
 */
export function createSimpleReverb(
  ctx: AudioContext,
  options: {
    decay?: number;    // 0-1
    wet?: number;      // 0-1
    highCut?: number;  // Hz
  }
): { input: GainNode; output: GainNode; wetGain: GainNode; dryGain: GainNode } {
  const { decay = 0.5, wet = 0.3, highCut = 5000 } = options;

  const input = ctx.createGain();
  const output = ctx.createGain();

  // Dry signal
  const dryGain = ctx.createGain();
  dryGain.gain.value = 1 - wet;
  input.connect(dryGain);
  dryGain.connect(output);

  // Wet signal (feedback delays)
  const wetGain = ctx.createGain();
  wetGain.gain.value = wet;

  // Multiple delay lines for diffusion
  const delayTimes = [0.029, 0.037, 0.041, 0.053];
  const feedbackGain = decay * 0.6;

  delayTimes.forEach((time) => {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = time;

    const feedback = ctx.createGain();
    feedback.gain.value = feedbackGain;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = highCut;

    input.connect(delay);
    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay);
    filter.connect(wetGain);
  });

  wetGain.connect(output);

  return { input, output, wetGain, dryGain };
}

/**
 * Bell/chime sound for sacred/atmospheric use
 */
export function createBellTone(
  ctx: AudioContext,
  options: {
    frequency: number;
    gain?: number;
    decay?: number;
  }
): { play: () => void } {
  const { frequency, gain = 0.1, decay = 3 } = options;

  return {
    play: () => {
      const now = ctx.currentTime;

      // Bell is made of multiple inharmonic partials
      const partials = [1, 2.4, 3.0, 4.5, 5.2, 6.8];
      const amplitudes = [1, 0.6, 0.5, 0.3, 0.2, 0.1];

      partials.forEach((partial, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = frequency * partial;

        const envelope = ctx.createGain();
        envelope.gain.value = 0;

        const amp = gain * amplitudes[i] / partials.length;
        const partialDecay = decay * (1 - i * 0.1);

        envelope.gain.setValueAtTime(amp, now);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + partialDecay);

        osc.connect(envelope);
        envelope.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + partialDecay);

        osc.onended = () => {
          osc.disconnect();
          envelope.disconnect();
        };
      });
    }
  };
}

/**
 * Low rumble/thunder for atmospheric tension
 */
export function createRumble(
  ctx: AudioContext,
  options: {
    baseFreq?: number;
    duration: number;
    gain?: number;
  }
): { play: () => void } {
  const { baseFreq = 40, duration, gain = 0.15 } = options;

  return {
    play: () => {
      const now = ctx.currentTime;

      // Low oscillator with noise modulation
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = baseFreq;

      // Slow random pitch variation
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.5 + Math.random() * 0.5;

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = baseFreq * 0.1;

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Envelope
      const envelope = ctx.createGain();
      envelope.gain.value = 0;

      const attack = duration * 0.3;
      const release = duration * 0.5;

      envelope.gain.setValueAtTime(0, now);
      envelope.gain.linearRampToValueAtTime(gain, now + attack);
      envelope.gain.setValueAtTime(gain, now + duration - release);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Low pass filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200;

      osc.connect(filter);
      filter.connect(envelope);
      envelope.connect(ctx.destination);

      osc.start(now);
      lfo.start(now);
      osc.stop(now + duration);
      lfo.stop(now + duration);

      osc.onended = () => {
        osc.disconnect();
        lfo.disconnect();
        lfoGain.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };
    }
  };
}
