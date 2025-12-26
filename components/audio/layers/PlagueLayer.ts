/**
 * PlagueLayer - Plague atmosphere and dread sounds
 *
 * Provides:
 * - Subtle unease drone when awareness rises
 * - Distant wailing when panic is high
 * - Coughing sounds near infected NPCs
 * - Mourning sounds near deceased NPCs
 * - Low ominous hum near corpses (miasma)
 *
 * Design goal: Build dread without becoming oppressive.
 * Moments of peace should still be possible.
 */

import { SoundLayer, AmbientState } from '../AmbientSoundEngine';
import { getSharedNoiseBuffer } from '../synthesis/NoiseGenerators';

export class PlagueLayer implements SoundLayer {
  name = 'plague';

  private ctx: AudioContext;
  private output: GainNode;
  private volume: number = 0.08;
  private isPlaying: boolean = false;

  // Unease drone (low dissonant tones)
  private uneaseDrone1: OscillatorNode | null = null;
  private uneaseDrone2: OscillatorNode | null = null;
  private uneaseDroneGain: GainNode;
  private uneaseLfo: OscillatorNode | null = null;

  // Distant wailing
  private lastWailTime: number = 0;
  private wailInterval: number = 15000; // Minimum ms between wails

  // Coughing
  private lastCoughTime: number = 0;
  private coughInterval: number = 4000;

  // Miasma hum (near corpses)
  private miasmaOsc: OscillatorNode | null = null;
  private miasmaFilter: BiquadFilterNode;
  private miasmaGain: GainNode;

  // State
  private nearbyInfected: number = 0;
  private nearbyDeceased: number = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Main output
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;

    // Unease drone
    this.uneaseDroneGain = ctx.createGain();
    this.uneaseDroneGain.gain.value = 0;
    this.uneaseDroneGain.connect(this.output);

    // Miasma
    this.miasmaFilter = ctx.createBiquadFilter();
    this.miasmaFilter.type = 'lowpass';
    this.miasmaFilter.frequency.value = 150;
    this.miasmaFilter.Q.value = 2;

    this.miasmaGain = ctx.createGain();
    this.miasmaGain.gain.value = 0;
    this.miasmaFilter.connect(this.miasmaGain);
    this.miasmaGain.connect(this.output);
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination);
  }

  getOutput(): AudioNode {
    return this.output;
  }

  setVolume(volume: number): void {
    this.volume = volume;
    if (this.ctx && this.isPlaying) {
      this.output.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.3);
    }
  }

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Setup unease drone
    this.setupUneaseDrone();

    // Setup miasma
    this.setupMiasma();

    // Fade in
    this.output.gain.setValueAtTime(0, this.ctx.currentTime);
    this.output.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 2);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    const now = this.ctx.currentTime;
    this.output.gain.setTargetAtTime(0, now, 0.5);

    setTimeout(() => {
      this.cleanupSources();
    }, 1000);
  }

  update(state: AmbientState, delta: number): void {
    if (!this.isPlaying) return;

    const now = this.ctx.currentTime;
    this.nearbyInfected = state.nearbyInfected;
    this.nearbyDeceased = state.nearbyDeceased;

    // Interior doesn't dampen plague sounds (they're psychological)
    const interiorMultiplier = state.sceneMode === 'interior' ? 0.8 : 1.0;

    // Unease drone: scales with awareness (starts at 20)
    const awarenessIntensity = Math.max(0, (state.avgAwareness - 20) / 80);
    const uneaseTarget = awarenessIntensity * 0.03 * interiorMultiplier;
    this.uneaseDroneGain.gain.setTargetAtTime(uneaseTarget, now, 3);

    // Modulate unease based on panic
    if (this.uneaseLfo) {
      const lfoRate = 0.1 + (state.avgPanic / 100) * 0.3;
      this.uneaseLfo.frequency.setTargetAtTime(lfoRate, now, 1);
    }

    // Miasma near corpses
    const miasmaIntensity = Math.min(state.nearbyDeceased / 3, 1);
    const miasmaTarget = miasmaIntensity * 0.05 * interiorMultiplier;
    this.miasmaGain.gain.setTargetAtTime(miasmaTarget, now, 2);

    // Distant wailing when panic is high
    if (state.avgPanic > 40 && state.sceneMode === 'outdoor') {
      this.maybePlayWail(state.avgPanic);
    }

    // Coughing near infected
    if (state.nearbyInfected > 0) {
      this.maybePlayCough(state.nearbyInfected);
    }
  }

  private setupUneaseDrone(): void {
    // Two slightly detuned low frequencies for unease
    this.uneaseDrone1 = this.ctx.createOscillator();
    this.uneaseDrone1.type = 'sine';
    this.uneaseDrone1.frequency.value = 73; // Low, slightly dissonant

    this.uneaseDrone2 = this.ctx.createOscillator();
    this.uneaseDrone2.type = 'sine';
    this.uneaseDrone2.frequency.value = 77; // Creates beating

    const drone1Gain = this.ctx.createGain();
    drone1Gain.gain.value = 0.5;
    this.uneaseDrone1.connect(drone1Gain);
    drone1Gain.connect(this.uneaseDroneGain);

    const drone2Gain = this.ctx.createGain();
    drone2Gain.gain.value = 0.5;
    this.uneaseDrone2.connect(drone2Gain);
    drone2Gain.connect(this.uneaseDroneGain);

    // LFO for subtle movement
    this.uneaseLfo = this.ctx.createOscillator();
    this.uneaseLfo.type = 'sine';
    this.uneaseLfo.frequency.value = 0.15;

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.3;
    this.uneaseLfo.connect(lfoGain);
    lfoGain.connect(this.uneaseDroneGain.gain);

    this.uneaseDrone1.start();
    this.uneaseDrone2.start();
    this.uneaseLfo.start();
  }

  private setupMiasma(): void {
    // Low pulsing hum
    this.miasmaOsc = this.ctx.createOscillator();
    this.miasmaOsc.type = 'triangle';
    this.miasmaOsc.frequency.value = 45;

    // Slow amplitude modulation
    const miasmaLfo = this.ctx.createOscillator();
    miasmaLfo.type = 'sine';
    miasmaLfo.frequency.value = 0.3;

    const miasmaLfoGain = this.ctx.createGain();
    miasmaLfoGain.gain.value = 0.5;
    miasmaLfo.connect(miasmaLfoGain);
    miasmaLfoGain.connect(this.miasmaGain.gain);

    this.miasmaOsc.connect(this.miasmaFilter);
    this.miasmaOsc.start();
    miasmaLfo.start();
  }

  private maybePlayWail(panic: number): void {
    const timeSinceLastWail = this.ctx.currentTime * 1000 - this.lastWailTime;

    // More frequent wails at higher panic
    const interval = this.wailInterval - (panic - 40) * 100;
    if (timeSinceLastWail < interval) return;

    // Probability increases with panic
    const probability = (panic - 40) / 200;
    if (Math.random() > probability) return;

    this.lastWailTime = this.ctx.currentTime * 1000;
    this.playDistantWail();
  }

  private playDistantWail(): void {
    const now = this.ctx.currentTime;

    // Wail is a descending sine wave with vibrato
    const baseFreq = 400 + Math.random() * 200;
    const duration = 2 + Math.random() * 2;

    const carrier = this.ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = baseFreq;

    // Descending pitch
    carrier.frequency.setValueAtTime(baseFreq, now);
    carrier.frequency.linearRampToValueAtTime(baseFreq * 0.7, now + duration);

    // Vibrato
    const vibrato = this.ctx.createOscillator();
    vibrato.type = 'sine';
    vibrato.frequency.value = 5 + Math.random() * 3;

    const vibratoGain = this.ctx.createGain();
    vibratoGain.gain.value = 15;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(carrier.frequency);

    // Envelope - slow attack, long decay
    const envelope = this.ctx.createGain();
    envelope.gain.value = 0;

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.025, now + duration * 0.2);
    envelope.gain.setValueAtTime(0.025, now + duration * 0.5);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Distance filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    // Random stereo position (distant)
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.8;

    // Connect
    carrier.connect(filter);
    filter.connect(envelope);
    envelope.connect(panner);
    panner.connect(this.output);

    carrier.start(now);
    vibrato.start(now);
    carrier.stop(now + duration + 0.1);
    vibrato.stop(now + duration + 0.1);

    // Cleanup
    carrier.onended = () => {
      carrier.disconnect();
      vibrato.disconnect();
      vibratoGain.disconnect();
      filter.disconnect();
      envelope.disconnect();
      panner.disconnect();
    };
  }

  private maybePlayCough(nearbyInfected: number): void {
    const timeSinceLastCough = this.ctx.currentTime * 1000 - this.lastCoughTime;

    // More frequent coughs with more infected nearby
    const interval = this.coughInterval / (1 + nearbyInfected * 0.5);
    if (timeSinceLastCough < interval) return;

    // Probability based on nearby infected
    const probability = nearbyInfected * 0.03;
    if (Math.random() > probability) return;

    this.lastCoughTime = this.ctx.currentTime * 1000;
    this.playCough();
  }

  private playCough(): void {
    const now = this.ctx.currentTime;

    // Cough is filtered noise burst with pitch dip
    const buffer = getSharedNoiseBuffer(this.ctx);

    // Multiple cough bursts
    const burstCount = 1 + Math.floor(Math.random() * 3);
    const burstGap = 0.15;

    // Stereo position
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.5;
    panner.connect(this.output);

    for (let i = 0; i < burstCount; i++) {
      const startTime = now + i * burstGap;
      const burstDuration = 0.08 + Math.random() * 0.06;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      // Bandpass filter for cough character
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800 + Math.random() * 400;
      filter.Q.value = 2;

      // Envelope
      const envelope = this.ctx.createGain();
      envelope.gain.value = 0;

      envelope.gain.setValueAtTime(0, startTime);
      envelope.gain.linearRampToValueAtTime(0.04, startTime + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.001, startTime + burstDuration);

      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(panner);

      source.start(startTime, Math.random() * 2);
      source.stop(startTime + burstDuration + 0.01);

      source.onended = () => {
        source.disconnect();
        filter.disconnect();
        envelope.disconnect();
      };
    }

    // Cleanup panner after all bursts
    setTimeout(() => {
      panner.disconnect();
    }, (burstCount * burstGap + 0.2) * 1000);
  }

  private cleanupSources(): void {
    if (this.uneaseDrone1) {
      try { this.uneaseDrone1.stop(); } catch {}
      this.uneaseDrone1.disconnect();
      this.uneaseDrone1 = null;
    }
    if (this.uneaseDrone2) {
      try { this.uneaseDrone2.stop(); } catch {}
      this.uneaseDrone2.disconnect();
      this.uneaseDrone2 = null;
    }
    if (this.uneaseLfo) {
      try { this.uneaseLfo.stop(); } catch {}
      this.uneaseLfo.disconnect();
      this.uneaseLfo = null;
    }
    if (this.miasmaOsc) {
      try { this.miasmaOsc.stop(); } catch {}
      this.miasmaOsc.disconnect();
      this.miasmaOsc = null;
    }
  }
}
