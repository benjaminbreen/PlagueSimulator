/**
 * SocialLayer - Crowd murmur and social activity sounds
 *
 * Provides:
 * - Crowd murmur scaled to NPC density
 * - Panic-reactive texture (higher panic = more frantic sounds)
 * - Market calls (district-specific)
 * - Domestic sounds for residential areas
 */

import { DistrictType } from '../../../types';
import { SoundLayer, AmbientState } from '../AmbientSoundEngine';
import { getSharedNoiseBuffer } from '../synthesis/NoiseGenerators';

export class SocialLayer implements SoundLayer {
  name = 'social';

  private ctx: AudioContext;
  private output: GainNode;
  private volume: number = 0.15;
  private isPlaying: boolean = false;

  // Crowd murmur
  private crowdNoise: AudioBufferSourceNode | null = null;
  private crowdFilter: BiquadFilterNode;
  private crowdGain: GainNode;
  private crowdLfo: OscillatorNode | null = null;
  private crowdLfoGain: GainNode;

  // Market calls
  private lastMarketCallTime: number = 0;
  private marketCallInterval: number = 8000; // ms between calls

  // Panic overlay
  private panicNoise: AudioBufferSourceNode | null = null;
  private panicFilter: BiquadFilterNode;
  private panicGain: GainNode;

  // State
  private currentNpcCount: number = 0;
  private currentPanic: number = 0;
  private currentDistrict: DistrictType = 'RESIDENTIAL';

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Main output
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;

    // Crowd murmur chain
    this.crowdFilter = ctx.createBiquadFilter();
    this.crowdFilter.type = 'bandpass';
    this.crowdFilter.frequency.value = 400;
    this.crowdFilter.Q.value = 0.5;

    this.crowdGain = ctx.createGain();
    this.crowdGain.gain.value = 0;
    this.crowdFilter.connect(this.crowdGain);
    this.crowdGain.connect(this.output);

    // LFO for crowd murmur variation
    this.crowdLfoGain = ctx.createGain();
    this.crowdLfoGain.gain.value = 0.3;
    this.crowdLfoGain.connect(this.crowdGain.gain);

    // Panic overlay (higher frequency, more frantic)
    this.panicFilter = ctx.createBiquadFilter();
    this.panicFilter.type = 'bandpass';
    this.panicFilter.frequency.value = 800;
    this.panicFilter.Q.value = 1;

    this.panicGain = ctx.createGain();
    this.panicGain.gain.value = 0;
    this.panicFilter.connect(this.panicGain);
    this.panicGain.connect(this.output);
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

    // Setup crowd murmur
    this.setupCrowdMurmur();

    // Setup panic overlay
    this.setupPanicOverlay();

    // Setup crowd modulation
    this.setupCrowdLfo();

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
    this.currentNpcCount = state.activeNpcCount;
    this.currentPanic = state.avgPanic;
    this.currentDistrict = state.district;

    // Interior dampening
    const interiorMultiplier = state.sceneMode === 'interior' ? 0.2 : 1.0;

    // Crowd volume based on NPC count (normalized to ~50 NPCs max)
    const crowdIntensity = Math.min(state.activeNpcCount / 50, 1);
    const crowdTarget = crowdIntensity * 0.08 * interiorMultiplier;
    this.crowdGain.gain.setTargetAtTime(crowdTarget, now, 1);

    // Crowd filter frequency shifts with panic (higher panic = higher freq)
    const baseFreq = 350;
    const panicFreqShift = state.avgPanic * 3; // Up to +300 Hz
    this.crowdFilter.frequency.setTargetAtTime(baseFreq + panicFreqShift, now, 2);

    // Panic overlay intensity
    const panicIntensity = Math.max(0, (state.avgPanic - 30) / 70); // Starts at 30 panic
    const panicTarget = panicIntensity * 0.04 * interiorMultiplier;
    this.panicGain.gain.setTargetAtTime(panicTarget, now, 1);

    // Speed up panic modulation with higher panic
    if (this.crowdLfo) {
      const lfoRate = 0.5 + panicIntensity * 2;
      this.crowdLfo.frequency.setTargetAtTime(lfoRate, now, 1);
    }

    // Market calls in market district during daytime
    if (
      (state.district === 'MARKET' ||
        state.district === 'STRAIGHT_STREET' ||
        state.district === 'SOUQ_AXIS' ||
        state.district === 'MIDAN' ||
        state.district === 'BAB_SHARQI') &&
      state.sceneMode === 'outdoor'
    ) {
      const isDay = state.timeOfDay >= 7 && state.timeOfDay <= 19;
      if (isDay) {
        this.maybePlayMarketCall(state.timeOfDay);
      }
    }
  }

  private setupCrowdMurmur(): void {
    const buffer = getSharedNoiseBuffer(this.ctx);
    this.crowdNoise = this.ctx.createBufferSource();
    this.crowdNoise.buffer = buffer;
    this.crowdNoise.loop = true;
    this.crowdNoise.connect(this.crowdFilter);
    this.crowdNoise.start();
  }

  private setupPanicOverlay(): void {
    const buffer = getSharedNoiseBuffer(this.ctx);
    this.panicNoise = this.ctx.createBufferSource();
    this.panicNoise.buffer = buffer;
    this.panicNoise.loop = true;
    this.panicNoise.connect(this.panicFilter);
    this.panicNoise.start();
  }

  private setupCrowdLfo(): void {
    this.crowdLfo = this.ctx.createOscillator();
    this.crowdLfo.type = 'sine';
    this.crowdLfo.frequency.value = 0.5;
    this.crowdLfo.connect(this.crowdLfoGain);
    this.crowdLfo.start();
  }

  private maybePlayMarketCall(timeOfDay: number): void {
    const timeSinceLastCall = this.ctx.currentTime * 1000 - this.lastMarketCallTime;

    // Randomize interval based on time (more calls during peak hours)
    const isPeakHours = timeOfDay >= 9 && timeOfDay <= 12;
    const minInterval = isPeakHours ? 5000 : 10000;

    if (timeSinceLastCall < minInterval) return;

    // Random chance
    const probability = isPeakHours ? 0.02 : 0.01;
    if (Math.random() > probability) return;

    this.lastMarketCallTime = this.ctx.currentTime * 1000;
    this.playMarketCall();
  }

  private playMarketCall(): void {
    const now = this.ctx.currentTime;

    // Synthesized merchant call (vowel-like sound)
    // Using formant synthesis approximation

    // Random pitch variation
    const baseFreq = 180 + Math.random() * 80; // Male voice range

    // Create formant-like vowel sound
    const carrier = this.ctx.createOscillator();
    carrier.type = 'sawtooth';
    carrier.frequency.value = baseFreq;

    // Formant filters for vowel sound
    const formant1 = this.ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.value = 700;
    formant1.Q.value = 10;

    const formant2 = this.ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.value = 1200;
    formant2.Q.value = 10;

    const formantMix = this.ctx.createGain();
    formantMix.gain.value = 0.5;

    // Envelope
    const envelope = this.ctx.createGain();
    envelope.gain.value = 0;

    const callDuration = 0.4 + Math.random() * 0.4;

    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.06, now + 0.05);
    envelope.gain.setValueAtTime(0.06, now + callDuration * 0.7);
    envelope.gain.linearRampToValueAtTime(0, now + callDuration);

    // Pitch glide (merchant call typically rises then falls)
    carrier.frequency.setValueAtTime(baseFreq, now);
    carrier.frequency.linearRampToValueAtTime(baseFreq * 1.2, now + callDuration * 0.3);
    carrier.frequency.linearRampToValueAtTime(baseFreq * 0.9, now + callDuration);

    // Stereo position
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.6;

    // Connect
    carrier.connect(formant1);
    carrier.connect(formant2);
    formant1.connect(formantMix);
    formant2.connect(formantMix);
    formantMix.connect(envelope);
    envelope.connect(panner);
    panner.connect(this.output);

    carrier.start(now);
    carrier.stop(now + callDuration + 0.1);

    // Cleanup
    carrier.onended = () => {
      carrier.disconnect();
      formant1.disconnect();
      formant2.disconnect();
      formantMix.disconnect();
      envelope.disconnect();
      panner.disconnect();
    };
  }

  private cleanupSources(): void {
    if (this.crowdNoise) {
      try { this.crowdNoise.stop(); } catch {}
      this.crowdNoise.disconnect();
      this.crowdNoise = null;
    }
    if (this.crowdLfo) {
      try { this.crowdLfo.stop(); } catch {}
      this.crowdLfo.disconnect();
      this.crowdLfo = null;
    }
    if (this.panicNoise) {
      try { this.panicNoise.stop(); } catch {}
      this.panicNoise.disconnect();
      this.panicNoise = null;
    }
  }
}
