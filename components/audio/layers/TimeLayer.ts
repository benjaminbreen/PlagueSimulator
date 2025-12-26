/**
 * TimeLayer - Time-of-day ambient sounds
 *
 * Provides:
 * - Dawn: Bird chorus, roosters, awakening murmurs
 * - Morning: Activity rising, bustling
 * - Midday: Peak activity, heat shimmer, insects
 * - Afternoon: Slower pace, heat fatigue
 * - Evening: Winding down, domestic sounds
 * - Night: Crickets, owls, distant dogs, quiet
 */

import { SoundLayer, AmbientState } from '../AmbientSoundEngine';
import { createFilteredNoise, getSharedNoiseBuffer } from '../synthesis/NoiseGenerators';

// Time periods and their characteristics
interface TimePeriod {
  name: string;
  startHour: number;
  endHour: number;
  activityLevel: number;  // 0-1
  crickets: boolean;
  birds: boolean;
  insects: boolean;
}

const TIME_PERIODS: TimePeriod[] = [
  { name: 'night', startHour: 21, endHour: 5, activityLevel: 0.1, crickets: true, birds: false, insects: false },
  { name: 'dawn', startHour: 5, endHour: 7, activityLevel: 0.3, crickets: true, birds: true, insects: false },
  { name: 'morning', startHour: 7, endHour: 10, activityLevel: 0.7, crickets: false, birds: true, insects: false },
  { name: 'midday', startHour: 10, endHour: 14, activityLevel: 1.0, crickets: false, birds: false, insects: true },
  { name: 'afternoon', startHour: 14, endHour: 18, activityLevel: 0.6, crickets: false, birds: false, insects: true },
  { name: 'evening', startHour: 18, endHour: 21, activityLevel: 0.4, crickets: true, birds: false, insects: false },
];

export class TimeLayer implements SoundLayer {
  name = 'timeLayer';

  private ctx: AudioContext;
  private output: GainNode;
  private volume: number = 0.12;
  private isPlaying: boolean = false;

  // Sound sources
  private cricketOsc: OscillatorNode | null = null;
  private cricketGain: GainNode;
  private cricketLfo: OscillatorNode | null = null;

  private birdInterval: number | null = null;
  private insectNoise: AudioBufferSourceNode | null = null;
  private insectFilter: BiquadFilterNode;
  private insectGain: GainNode;

  // Activity ambience
  private activityNoise: AudioBufferSourceNode | null = null;
  private activityFilter: BiquadFilterNode;
  private activityGain: GainNode;

  // State
  private currentPeriod: string = 'day';
  private lastBirdTime: number = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Main output
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;

    // Cricket setup
    this.cricketGain = ctx.createGain();
    this.cricketGain.gain.value = 0;
    this.cricketGain.connect(this.output);

    // Insect setup (mid-frequency buzz, not too high-pitched)
    this.insectFilter = ctx.createBiquadFilter();
    this.insectFilter.type = 'bandpass';
    this.insectFilter.frequency.value = 1800; // Lower, less piercing
    this.insectFilter.Q.value = 1;

    this.insectGain = ctx.createGain();
    this.insectGain.gain.value = 0;
    this.insectFilter.connect(this.insectGain);
    this.insectGain.connect(this.output);

    // Activity ambience (filtered murmur)
    this.activityFilter = ctx.createBiquadFilter();
    this.activityFilter.type = 'lowpass';
    this.activityFilter.frequency.value = 800;

    this.activityGain = ctx.createGain();
    this.activityGain.gain.value = 0;
    this.activityFilter.connect(this.activityGain);
    this.activityGain.connect(this.output);
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

    // Setup cricket sound
    this.setupCrickets();

    // Setup insect buzz
    this.setupInsects();

    // Setup activity ambience
    this.setupActivityAmbience();

    // Fade in
    this.output.gain.setValueAtTime(0, this.ctx.currentTime);
    this.output.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 2);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // Fade out
    const now = this.ctx.currentTime;
    this.output.gain.setTargetAtTime(0, now, 0.5);

    // Stop bird interval
    if (this.birdInterval !== null) {
      clearInterval(this.birdInterval);
      this.birdInterval = null;
    }

    // Cleanup after fadeout
    setTimeout(() => {
      this.cleanupSources();
    }, 1000);
  }

  update(state: AmbientState, delta: number): void {
    if (!this.isPlaying) return;

    const period = this.getCurrentPeriod(state.timeOfDay);
    const now = this.ctx.currentTime;

    // Interior dampening
    const interiorMultiplier = state.sceneMode === 'interior' ? 0.15 : 1.0;

    // Cricket intensity (night/dawn/evening)
    const cricketTarget = period.crickets ? 0.08 * interiorMultiplier : 0;
    this.cricketGain.gain.setTargetAtTime(cricketTarget, now, 2);

    // Insect intensity (midday/afternoon) - very subtle
    const insectTarget = period.insects ? 0.015 * interiorMultiplier : 0;
    this.insectGain.gain.setTargetAtTime(insectTarget, now, 2);

    // Activity ambience based on activity level
    const activityTarget = period.activityLevel * 0.06 * interiorMultiplier;
    this.activityGain.gain.setTargetAtTime(activityTarget, now, 2);

    // Birds (triggered randomly during bird periods)
    if (period.birds && state.sceneMode === 'outdoor') {
      this.maybePlayBird(state.timeOfDay);
    }

    // Adjust cricket chirp rate based on time (faster at dusk)
    if (this.cricketLfo && period.crickets) {
      const chirpRate = state.timeOfDay < 7 ? 6 : 8; // Slower at dawn
      this.cricketLfo.frequency.setTargetAtTime(chirpRate, now, 1);
    }
  }

  private getCurrentPeriod(timeOfDay: number): TimePeriod {
    for (const period of TIME_PERIODS) {
      if (period.startHour < period.endHour) {
        if (timeOfDay >= period.startHour && timeOfDay < period.endHour) {
          return period;
        }
      } else {
        // Wraps around midnight
        if (timeOfDay >= period.startHour || timeOfDay < period.endHour) {
          return period;
        }
      }
    }
    return TIME_PERIODS[0]; // Default to night
  }

  private setupCrickets(): void {
    // Crickets disabled for now - they were causing audio issues
    // TODO: Implement proper on-demand cricket chirps like birds
  }

  private setupInsects(): void {
    const buffer = getSharedNoiseBuffer(this.ctx);
    this.insectNoise = this.ctx.createBufferSource();
    this.insectNoise.buffer = buffer;
    this.insectNoise.loop = true;
    this.insectNoise.connect(this.insectFilter);
    this.insectNoise.start();
  }

  private setupActivityAmbience(): void {
    const buffer = getSharedNoiseBuffer(this.ctx);
    this.activityNoise = this.ctx.createBufferSource();
    this.activityNoise.buffer = buffer;
    this.activityNoise.loop = true;
    this.activityNoise.connect(this.activityFilter);
    this.activityNoise.start();
  }

  private maybePlayBird(timeOfDay: number): void {
    // Random chance to play a bird sound
    const timeSinceLastBird = this.ctx.currentTime - this.lastBirdTime;
    if (timeSinceLastBird < 3) return; // Minimum 3 seconds between birds

    // Higher probability at dawn
    const probability = timeOfDay < 7 ? 0.03 : 0.01;
    if (Math.random() > probability) return;

    this.lastBirdTime = this.ctx.currentTime;
    this.playBirdChirp();
  }

  private playBirdChirp(): void {
    const now = this.ctx.currentTime;

    // Random bird type (different frequencies)
    const baseFreq = 1000 + Math.random() * 2000;
    const chirpCount = 2 + Math.floor(Math.random() * 4);
    const chirpDuration = 0.05 + Math.random() * 0.1;
    const chirpGap = 0.08 + Math.random() * 0.12;

    // Stereo position
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 1.5;
    panner.connect(this.output);

    for (let i = 0; i < chirpCount; i++) {
      const startTime = now + i * (chirpDuration + chirpGap);

      const osc = this.ctx.createOscillator();
      osc.type = 'sine';

      // Frequency sweep for chirp
      const freqVariation = 200 + Math.random() * 300;
      osc.frequency.setValueAtTime(baseFreq, startTime);
      osc.frequency.linearRampToValueAtTime(baseFreq + freqVariation, startTime + chirpDuration * 0.3);
      osc.frequency.linearRampToValueAtTime(baseFreq, startTime + chirpDuration);

      const envelope = this.ctx.createGain();
      envelope.gain.setValueAtTime(0, startTime);
      envelope.gain.linearRampToValueAtTime(0.03, startTime + chirpDuration * 0.1);
      envelope.gain.linearRampToValueAtTime(0.02, startTime + chirpDuration * 0.5);
      envelope.gain.linearRampToValueAtTime(0, startTime + chirpDuration);

      osc.connect(envelope);
      envelope.connect(panner);

      osc.start(startTime);
      osc.stop(startTime + chirpDuration + 0.01);

      osc.onended = () => {
        osc.disconnect();
        envelope.disconnect();
      };
    }

    // Cleanup panner after chirps complete
    setTimeout(() => {
      panner.disconnect();
    }, (chirpCount * (chirpDuration + chirpGap) + 0.5) * 1000);
  }

  private cleanupSources(): void {
    if (this.cricketOsc) {
      try { this.cricketOsc.stop(); } catch {}
      this.cricketOsc.disconnect();
      this.cricketOsc = null;
    }
    if (this.cricketLfo) {
      try { this.cricketLfo.stop(); } catch {}
      this.cricketLfo.disconnect();
      this.cricketLfo = null;
    }
    if (this.insectNoise) {
      try { this.insectNoise.stop(); } catch {}
      this.insectNoise.disconnect();
      this.insectNoise = null;
    }
    if (this.activityNoise) {
      try { this.activityNoise.stop(); } catch {}
      this.activityNoise.disconnect();
      this.activityNoise = null;
    }
  }
}
