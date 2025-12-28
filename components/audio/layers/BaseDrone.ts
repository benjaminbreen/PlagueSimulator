/**
 * BaseDrone Layer - Low-frequency atmospheric foundation per district
 *
 * Each district has a unique sonic character:
 * - MARKET: Warm, busy energy (80-120 Hz)
 * - WEALTHY: Refined, peaceful (60-90 Hz, pure tones)
 * - HOVELS: Dense, cramped (100-150 Hz, rougher)
 * - CIVIC: Formal, imposing (50-80 Hz, reverberant)
 * - SALHIYYA: Airy, elevated (70-100 Hz, thin)
 * - OUTSKIRTS: Sparse, open (40-60 Hz, minimal)
 */

import { DistrictType } from '../../../types';
import { SoundLayer, AmbientState } from '../AmbientSoundEngine';
import { createFilteredNoise, getSharedNoiseBuffer } from '../synthesis/NoiseGenerators';

interface DistrictProfile {
  baseFreq: number;
  harmonics: number[];
  noiseFreqLow: number;
  noiseFreqHigh: number;
  noiseAmount: number;
  droneAmount: number;
  character: string;
}

const DISTRICT_PROFILES: Record<DistrictType, DistrictProfile> = {
  MARKET: {
    baseFreq: 100,
    harmonics: [1, 0.5, 0.3, 0.15],
    noiseFreqLow: 80,
    noiseFreqHigh: 200,
    noiseAmount: 0.4,
    droneAmount: 0.6,
    character: 'bustling',
  },
  WEALTHY: {
    baseFreq: 75,
    harmonics: [1, 0.3, 0.1],
    noiseFreqLow: 60,
    noiseFreqHigh: 120,
    noiseAmount: 0.2,
    droneAmount: 0.8,
    character: 'serene',
  },
  HOVELS: {
    baseFreq: 120,
    harmonics: [1, 0.6, 0.4, 0.3, 0.2],
    noiseFreqLow: 100,
    noiseFreqHigh: 250,
    noiseAmount: 0.5,
    droneAmount: 0.5,
    character: 'crowded',
  },
  CIVIC: {
    baseFreq: 65,
    harmonics: [1, 0.4, 0.2],
    noiseFreqLow: 50,
    noiseFreqHigh: 100,
    noiseAmount: 0.15,
    droneAmount: 0.85,
    character: 'imposing',
  },
  RESIDENTIAL: {
    baseFreq: 90,
    harmonics: [1, 0.4, 0.2],
    noiseFreqLow: 70,
    noiseFreqHigh: 150,
    noiseAmount: 0.3,
    droneAmount: 0.7,
    character: 'domestic',
  },
  ALLEYS: {
    baseFreq: 110,
    harmonics: [1, 0.5, 0.35, 0.2],
    noiseFreqLow: 90,
    noiseFreqHigh: 220,
    noiseAmount: 0.45,
    droneAmount: 0.55,
    character: 'domestic',
  },
  JEWISH_QUARTER: {
    baseFreq: 110,
    harmonics: [1, 0.5, 0.35, 0.2],
    noiseFreqLow: 90,
    noiseFreqHigh: 220,
    noiseAmount: 0.45,
    droneAmount: 0.55,
    character: 'enclosed',
  },
  SALHIYYA: {
    baseFreq: 85,
    harmonics: [1, 0.3, 0.15],
    noiseFreqLow: 70,
    noiseFreqHigh: 140,
    noiseAmount: 0.35,
    droneAmount: 0.65,
    character: 'hillside',
  },
  OUTSKIRTS_FARMLAND: {
    baseFreq: 50,
    harmonics: [1, 0.2],
    noiseFreqLow: 40,
    noiseFreqHigh: 80,
    noiseAmount: 0.25,
    droneAmount: 0.75,
    character: 'rural',
  },
  OUTSKIRTS_DESERT: {
    baseFreq: 40,
    harmonics: [1, 0.15],
    noiseFreqLow: 35,
    noiseFreqHigh: 70,
    noiseAmount: 0.3,
    droneAmount: 0.7,
    character: 'vast',
  },
  CARAVANSERAI: {
    baseFreq: 70,
    harmonics: [1, 0.35, 0.2],
    noiseFreqLow: 60,
    noiseFreqHigh: 130,
    noiseAmount: 0.35,
    droneAmount: 0.65,
    character: 'waystation',
  },
  MOUNTAIN_SHRINE: {
    baseFreq: 55,
    harmonics: [1, 0.25, 0.1],
    noiseFreqLow: 45,
    noiseFreqHigh: 90,
    noiseAmount: 0.2,
    droneAmount: 0.8,
    character: 'sacred',
  },
  SOUTHERN_ROAD: {
    baseFreq: 60,
    harmonics: [1, 0.3, 0.15],
    noiseFreqLow: 50,
    noiseFreqHigh: 100,
    noiseAmount: 0.3,
    droneAmount: 0.7,
    character: 'journey',
  },
};

export class BaseDroneLayer implements SoundLayer {
  name = 'baseDrone';

  private ctx: AudioContext;
  private output: GainNode;
  private volume: number = 0.15;
  private isPlaying: boolean = false;

  // Current drone components
  private droneOscillators: OscillatorNode[] = [];
  private droneGain: GainNode;
  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode;
  private noiseGain: GainNode;

  // Crossfade state
  private currentDistrict: DistrictType = 'RESIDENTIAL';
  private targetProfile: DistrictProfile = DISTRICT_PROFILES.RESIDENTIAL;
  private crossfadeTime: number = 3; // seconds

  // LFO for organic movement
  private lfo: OscillatorNode;
  private lfoGain: GainNode;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Main output
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;

    // Drone chain
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.7;
    this.droneGain.connect(this.output);

    // Noise chain
    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.Q.value = 0.8;

    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0.3;
    this.noiseFilter.connect(this.noiseGain);
    this.noiseGain.connect(this.output);

    // LFO for subtle movement
    this.lfo = ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.1;

    this.lfoGain = ctx.createGain();
    this.lfoGain.gain.value = 3; // Modulates frequency by ±3 Hz
    this.lfo.connect(this.lfoGain);
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

    // Start LFO
    this.lfo.start();

    // Initialize with current district
    this.setupDrone(this.targetProfile);
    this.setupNoise(this.targetProfile);

    // Fade in
    this.output.gain.setValueAtTime(0, this.ctx.currentTime);
    this.output.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 2);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // Fade out
    const now = this.ctx.currentTime;
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(0, now + 1);

    // Cleanup after fadeout
    setTimeout(() => {
      this.cleanupOscillators();
      if (this.noiseSource) {
        try { this.noiseSource.stop(); } catch {}
        this.noiseSource.disconnect();
        this.noiseSource = null;
      }
      try { this.lfo.stop(); } catch {}
    }, 1100);
  }

  update(state: AmbientState, delta: number): void {
    if (!this.isPlaying) return;

    // Check for district change
    if (state.district !== this.currentDistrict) {
      this.currentDistrict = state.district;
      this.targetProfile = DISTRICT_PROFILES[state.district] || DISTRICT_PROFILES.RESIDENTIAL;
      this.crossfadeToDrone(this.targetProfile);
    }

    // Interior dampening
    const interiorMultiplier = state.sceneMode === 'interior' ? 0.3 : 1.0;
    const targetVolume = this.volume * interiorMultiplier;
    this.output.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.5);

    // Adjust noise based on time of day (quieter at night)
    const nightFactor = this.getNightFactor(state.timeOfDay);
    this.noiseGain.gain.setTargetAtTime(
      this.targetProfile.noiseAmount * (0.3 + 0.7 * nightFactor) * interiorMultiplier,
      this.ctx.currentTime,
      0.5
    );
  }

  private getNightFactor(timeOfDay: number): number {
    // 0 at night (23-5), 1 during day (8-20), smooth transitions
    if (timeOfDay >= 8 && timeOfDay <= 20) return 1;
    if (timeOfDay >= 5 && timeOfDay < 8) return (timeOfDay - 5) / 3;
    if (timeOfDay > 20 && timeOfDay < 23) return 1 - (timeOfDay - 20) / 3;
    return 0;
  }

  private setupDrone(profile: DistrictProfile): void {
    this.cleanupOscillators();

    const now = this.ctx.currentTime;

    profile.harmonics.forEach((amplitude, index) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = profile.baseFreq * (index + 1);

      const oscGain = this.ctx.createGain();
      oscGain.gain.value = amplitude * profile.droneAmount / profile.harmonics.length;

      // Connect LFO for subtle pitch variation
      this.lfoGain.connect(osc.frequency);

      osc.connect(oscGain);
      oscGain.connect(this.droneGain);
      osc.start(now);

      this.droneOscillators.push(osc);
    });
  }

  private setupNoise(profile: DistrictProfile): void {
    if (this.noiseSource) {
      try { this.noiseSource.stop(); } catch {}
      this.noiseSource.disconnect();
    }

    const buffer = getSharedNoiseBuffer(this.ctx);
    this.noiseSource = this.ctx.createBufferSource();
    this.noiseSource.buffer = buffer;
    this.noiseSource.loop = true;

    this.noiseFilter.frequency.value = (profile.noiseFreqLow + profile.noiseFreqHigh) / 2;
    this.noiseGain.gain.value = profile.noiseAmount;

    this.noiseSource.connect(this.noiseFilter);
    this.noiseSource.start();
  }

  private crossfadeToDrone(profile: DistrictProfile): void {
    const now = this.ctx.currentTime;

    // Crossfade existing oscillators to new frequencies
    this.droneOscillators.forEach((osc, index) => {
      if (index < profile.harmonics.length) {
        const targetFreq = profile.baseFreq * (index + 1);
        osc.frequency.setTargetAtTime(targetFreq, now, this.crossfadeTime / 2);
      }
    });

    // Crossfade noise filter
    const targetNoiseFreq = (profile.noiseFreqLow + profile.noiseFreqHigh) / 2;
    this.noiseFilter.frequency.setTargetAtTime(targetNoiseFreq, now, this.crossfadeTime / 2);
    this.noiseGain.gain.setTargetAtTime(profile.noiseAmount, now, this.crossfadeTime);
  }

  private cleanupOscillators(): void {
    this.droneOscillators.forEach((osc) => {
      try { osc.stop(); } catch {}
      osc.disconnect();
    });
    this.droneOscillators = [];
  }
}
