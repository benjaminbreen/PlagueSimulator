/**
 * BiomeLayer - District-specific environmental sounds
 *
 * Provides unique ambient sounds per biome type:
 * - Water/fountain sounds (wealthy, civic)
 * - Animal sounds (chickens, dogs, donkeys)
 * - Craft sounds (hammering)
 * - Human sounds (babies crying in hovels)
 *
 * Maps 12 district types to 5 biome profiles for sonic character.
 * Complements other layers (does NOT duplicate crowd murmur, market calls,
 * coughing, wind, or basic bird sounds which are handled elsewhere).
 */

import { DistrictType } from '../../../types';
import { SoundLayer, AmbientState } from '../AmbientSoundEngine';
import { getSharedNoiseBuffer } from '../synthesis/NoiseGenerators';

// Biome type for sound grouping
type BiomeType = 'marketplace' | 'wealthy' | 'hovels' | 'desert' | 'civic';

// Map 12 districts to 5 biome profiles
const DISTRICT_TO_BIOME: Record<DistrictType, BiomeType> = {
  MARKET: 'marketplace',
  CARAVANSERAI: 'marketplace',
  WEALTHY: 'wealthy',
  SALHIYYA: 'wealthy',
  HOVELS: 'hovels',
  ALLEYS: 'hovels',
  RESIDENTIAL: 'hovels',
  OUTSKIRTS_DESERT: 'desert',
  OUTSKIRTS_FARMLAND: 'desert',
  SOUTHERN_ROAD: 'desert',
  MOUNTAIN_SHRINE: 'desert',
  CIVIC: 'civic',
};

// Sound configuration per biome
interface BiomeProfile {
  water: number;        // Fountain/water sounds
  chickens: number;     // Clucking
  dogs: number;         // Barking
  donkeys: number;      // Braying
  hammering: number;    // Blacksmith
  babies: number;       // Crying infants
  droneFreq: number;    // Base atmosphere frequency
  droneLevel: number;   // Atmospheric drone level
}

const BIOME_PROFILES: Record<BiomeType, BiomeProfile> = {
  marketplace: {
    water: 0.15,
    chickens: 0.35,
    dogs: 0.2,
    donkeys: 0.25,
    hammering: 0.4,
    babies: 0.05,
    droneFreq: 90,
    droneLevel: 0.08,
  },
  wealthy: {
    water: 0.7,
    chickens: 0,
    dogs: 0.05,
    donkeys: 0,
    hammering: 0,
    babies: 0,
    droneFreq: 65,
    droneLevel: 0.12,
  },
  hovels: {
    water: 0,
    chickens: 0.25,
    dogs: 0.4,
    donkeys: 0.1,
    hammering: 0.15,
    babies: 0.4,
    droneFreq: 80,
    droneLevel: 0.1,
  },
  desert: {
    water: 0,
    chickens: 0,
    dogs: 0.08,
    donkeys: 0.15,
    hammering: 0,
    babies: 0,
    droneFreq: 50,
    droneLevel: 0.15,
  },
  civic: {
    water: 0.4,
    chickens: 0,
    dogs: 0.03,
    donkeys: 0,
    hammering: 0,
    babies: 0,
    droneFreq: 55,
    droneLevel: 0.1,
  },
};

export class BiomeLayer implements SoundLayer {
  name = 'biome';

  private ctx: AudioContext;
  private output: GainNode;
  private volume: number = 0.12;
  private isPlaying: boolean = false;

  // Current state
  private currentBiome: BiomeType = 'marketplace';
  private currentProfile: BiomeProfile = BIOME_PROFILES.marketplace;

  // Water sounds
  private waterNoise: AudioBufferSourceNode | null = null;
  private waterFilter: BiquadFilterNode;
  private waterGain: GainNode;
  private waterLfo: OscillatorNode | null = null;

  // Atmospheric drone
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneGain: GainNode;
  private droneLfo: OscillatorNode | null = null;

  // Timing for sporadic sounds
  private lastChickenTime: number = 0;
  private lastDogTime: number = 0;
  private lastDonkeyTime: number = 0;
  private lastHammerTime: number = 0;
  private lastBabyTime: number = 0;
  private lastDripTime: number = 0;

  // Minimum intervals (ms) - converted from ctx.currentTime
  private readonly CHICKEN_MIN_INTERVAL = 4000;
  private readonly DOG_MIN_INTERVAL = 10000;
  private readonly DONKEY_MIN_INTERVAL = 25000;
  private readonly HAMMER_MIN_INTERVAL = 6000;
  private readonly BABY_MIN_INTERVAL = 20000;
  private readonly DRIP_MIN_INTERVAL = 800;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Main output
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;

    // Water chain
    this.waterFilter = ctx.createBiquadFilter();
    this.waterFilter.type = 'bandpass';
    this.waterFilter.frequency.value = 2000;
    this.waterFilter.Q.value = 0.8;

    this.waterGain = ctx.createGain();
    this.waterGain.gain.value = 0;
    this.waterFilter.connect(this.waterGain);
    this.waterGain.connect(this.output);

    // Drone chain
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0;
    this.droneGain.connect(this.output);
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

    // Start water
    this.setupWater();

    // Start drone
    this.setupDrone();

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
      this.cleanup();
    }, 1000);
  }

  update(state: AmbientState, delta: number): void {
    if (!this.isPlaying) return;

    const now = this.ctx.currentTime;
    const nowMs = now * 1000;

    // Get biome from district
    const newBiome = DISTRICT_TO_BIOME[state.district] || 'marketplace';

    // Handle biome change with crossfade
    if (newBiome !== this.currentBiome) {
      this.currentBiome = newBiome;
      this.currentProfile = BIOME_PROFILES[newBiome];
      this.transitionToBiome(newBiome);
    }

    // Interior dampening
    const interiorMult = state.sceneMode === 'interior' ? 0.15 : 1.0;

    // Night reduction (less activity sounds at night)
    const isNight = state.timeOfDay < 6 || state.timeOfDay > 21;
    const nightMult = isNight ? 0.2 : 1.0;

    const profile = this.currentProfile;

    // Update water level
    const waterTarget = profile.water * 0.08 * interiorMult;
    this.waterGain.gain.setTargetAtTime(waterTarget, now, 1);

    // Update drone
    const droneTarget = profile.droneLevel * 0.05 * interiorMult;
    this.droneGain.gain.setTargetAtTime(droneTarget, now, 2);

    // Maybe update drone frequency (smooth transition)
    if (this.droneOsc1) {
      this.droneOsc1.frequency.setTargetAtTime(profile.droneFreq, now, 3);
    }
    if (this.droneOsc2) {
      this.droneOsc2.frequency.setTargetAtTime(profile.droneFreq * 1.5, now, 3);
    }

    // Sporadic sounds (only outdoors, modulated by time)
    if (state.sceneMode === 'outdoor') {
      // Chickens
      if (profile.chickens > 0 && !isNight) {
        this.maybePlayChicken(nowMs, profile.chickens * nightMult);
      }

      // Dogs
      if (profile.dogs > 0) {
        this.maybePlayDog(nowMs, profile.dogs * nightMult * 0.7);
      }

      // Donkeys
      if (profile.donkeys > 0 && !isNight) {
        this.maybePlayDonkey(nowMs, profile.donkeys * nightMult);
      }

      // Hammering (only during work hours)
      const isWorkHours = state.timeOfDay >= 7 && state.timeOfDay <= 18;
      if (profile.hammering > 0 && isWorkHours) {
        this.maybePlayHammer(nowMs, profile.hammering);
      }

      // Babies (any time, but less at night)
      if (profile.babies > 0) {
        this.maybePlayBaby(nowMs, profile.babies * (isNight ? 0.3 : 1));
      }

      // Water drips
      if (profile.water > 0.3) {
        this.maybePlayDrip(nowMs, profile.water);
      }
    }
  }

  private setupWater(): void {
    const buffer = getSharedNoiseBuffer(this.ctx);
    this.waterNoise = this.ctx.createBufferSource();
    this.waterNoise.buffer = buffer;
    this.waterNoise.loop = true;
    this.waterNoise.connect(this.waterFilter);
    this.waterNoise.start();

    // LFO for water variation
    this.waterLfo = this.ctx.createOscillator();
    this.waterLfo.frequency.value = 1.2;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 600;
    this.waterLfo.connect(lfoGain);
    lfoGain.connect(this.waterFilter.frequency);
    this.waterLfo.start();
  }

  private setupDrone(): void {
    const freq = this.currentProfile.droneFreq;

    // Root tone
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.frequency.value = freq;
    this.droneOsc1.type = 'sine';

    // Fifth
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.frequency.value = freq * 1.5;
    this.droneOsc2.type = 'sine';

    // Lowpass for warmth
    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 200;

    this.droneOsc1.connect(droneFilter);
    this.droneOsc2.connect(droneFilter);
    droneFilter.connect(this.droneGain);

    // Slow LFO for subtle movement
    this.droneLfo = this.ctx.createOscillator();
    this.droneLfo.frequency.value = 0.06;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = freq * 0.02;
    this.droneLfo.connect(lfoGain);
    lfoGain.connect(this.droneOsc1.frequency);

    this.droneOsc1.start();
    this.droneOsc2.start();
    this.droneLfo.start();
  }

  private transitionToBiome(biome: BiomeType): void {
    // Smooth crossfade handled by setTargetAtTime in update()
    // Could add more complex transition logic here if needed
  }

  // --- Sporadic Sound Generators ---

  private maybePlayChicken(nowMs: number, probability: number): void {
    if (nowMs - this.lastChickenTime < this.CHICKEN_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.015) return;

    this.lastChickenTime = nowMs;
    this.playChicken();
  }

  private playChicken(): void {
    const now = this.ctx.currentTime;
    const numClucks = 2 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numClucks; i++) {
      const startTime = now + i * (0.08 + Math.random() * 0.05);

      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(800 + Math.random() * 400, startTime);
      osc.frequency.exponentialRampToValueAtTime(400, startTime + 0.05);
      osc.type = 'triangle';

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 4;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.6;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.output);

      osc.start(startTime);
      osc.stop(startTime + 0.1);

      osc.onended = () => {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
        panner.disconnect();
      };
    }
  }

  private maybePlayDog(nowMs: number, probability: number): void {
    if (nowMs - this.lastDogTime < this.DOG_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.008) return;

    this.lastDogTime = nowMs;
    this.playDog();
  }

  private playDog(): void {
    const now = this.ctx.currentTime;
    const numBarks = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numBarks; i++) {
      const startTime = now + i * 0.25;

      // Noise burst for bark texture
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let j = 0; j < noiseData.length; j++) {
        noiseData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (noiseData.length * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const formant = this.ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.value = 400 + Math.random() * 200;
      formant.Q.value = 3;

      // Tonal component
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(200 + Math.random() * 100, startTime);
      osc.frequency.exponentialRampToValueAtTime(150, startTime + 0.12);
      osc.type = 'sawtooth';

      const oscFilter = this.ctx.createBiquadFilter();
      oscFilter.type = 'lowpass';
      oscFilter.frequency.value = 600;

      const mixer = this.ctx.createGain();
      mixer.gain.setValueAtTime(0.05, startTime);
      mixer.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.8;

      noise.connect(formant);
      formant.connect(mixer);
      osc.connect(oscFilter);
      oscFilter.connect(mixer);
      mixer.connect(panner);
      panner.connect(this.output);

      noise.start(startTime);
      osc.start(startTime);
      osc.stop(startTime + 0.2);

      osc.onended = () => {
        osc.disconnect();
        oscFilter.disconnect();
        noise.disconnect();
        formant.disconnect();
        mixer.disconnect();
        panner.disconnect();
      };
    }
  }

  private maybePlayDonkey(nowMs: number, probability: number): void {
    if (nowMs - this.lastDonkeyTime < this.DONKEY_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.003) return;

    this.lastDonkeyTime = nowMs;
    this.playDonkey();
  }

  private playDonkey(): void {
    const now = this.ctx.currentTime;
    const duration = 1.5 + Math.random() * 1;

    // Inhale (hee)
    const osc1 = this.ctx.createOscillator();
    osc1.frequency.setValueAtTime(200, now);
    osc1.frequency.linearRampToValueAtTime(400, now + duration * 0.4);
    osc1.type = 'sawtooth';

    // Exhale (haw)
    const osc2 = this.ctx.createOscillator();
    osc2.frequency.setValueAtTime(400, now + duration * 0.4);
    osc2.frequency.linearRampToValueAtTime(150, now + duration);
    osc2.type = 'sawtooth';

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(1200, now + duration * 0.4);
    filter.frequency.linearRampToValueAtTime(400, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.04, now + 0.1);
    gain.gain.setValueAtTime(0.04, now + duration - 0.2);
    gain.gain.linearRampToValueAtTime(0, now + duration);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.7;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.output);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + duration + 0.1);
    osc2.stop(now + duration + 0.1);

    osc2.onended = () => {
      osc1.disconnect();
      osc2.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  private maybePlayHammer(nowMs: number, probability: number): void {
    if (nowMs - this.lastHammerTime < this.HAMMER_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.012) return;

    this.lastHammerTime = nowMs;
    this.playHammerSequence();
  }

  private playHammerSequence(): void {
    const now = this.ctx.currentTime;
    const numStrikes = 3 + Math.floor(Math.random() * 4);
    const strikeInterval = 0.35 + Math.random() * 0.15;

    for (let i = 0; i < numStrikes; i++) {
      const startTime = now + i * strikeInterval;
      this.playHammerStrike(startTime);
    }
  }

  private playHammerStrike(startTime: number): void {
    // Metal strike - impact + ring
    const strikeBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
    const data = strikeBuffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.ctx.sampleRate;
      // Impact transient + metallic ring
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.4 +
                Math.sin(t * 1800 * Math.PI * 2) * Math.exp(-t * 10) * 0.25 +
                Math.sin(t * 3200 * Math.PI * 2) * Math.exp(-t * 15) * 0.15;
    }

    const strike = this.ctx.createBufferSource();
    strike.buffer = strikeBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 200;

    const gain = this.ctx.createGain();
    gain.gain.value = 0.06 * (0.7 + Math.random() * 0.3);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.4;

    strike.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.output);

    strike.start(startTime);

    strike.onended = () => {
      strike.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  private maybePlayBaby(nowMs: number, probability: number): void {
    if (nowMs - this.lastBabyTime < this.BABY_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.004) return;

    this.lastBabyTime = nowMs;
    this.playBaby();
  }

  private playBaby(): void {
    const now = this.ctx.currentTime;
    const duration = 1 + Math.random() * 1.5;

    const osc = this.ctx.createOscillator();
    osc.frequency.value = 400 + Math.random() * 100;
    osc.type = 'sawtooth';

    // Vibrato
    const vib = this.ctx.createOscillator();
    const vibGain = this.ctx.createGain();
    vib.frequency.value = 6;
    vibGain.gain.value = 25;
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    // Formants for crying sound
    const formant1 = this.ctx.createBiquadFilter();
    formant1.type = 'bandpass';
    formant1.frequency.value = 800;
    formant1.Q.value = 5;

    const formant2 = this.ctx.createBiquadFilter();
    formant2.type = 'bandpass';
    formant2.frequency.value = 1800;
    formant2.Q.value = 4;

    // Warbling envelope
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);

    const numWarbles = Math.floor(duration / 0.25);
    for (let i = 0; i < numWarbles; i++) {
      const t = now + i * 0.25;
      gain.gain.linearRampToValueAtTime(0.03, t + 0.04);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.2);
    }
    gain.gain.linearRampToValueAtTime(0, now + duration);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.5;

    osc.connect(formant1);
    osc.connect(formant2);
    formant1.connect(gain);
    formant2.connect(gain);
    gain.connect(panner);
    panner.connect(this.output);

    osc.start(now);
    vib.start(now);
    osc.stop(now + duration + 0.1);
    vib.stop(now + duration + 0.1);

    osc.onended = () => {
      osc.disconnect();
      vib.disconnect();
      vibGain.disconnect();
      formant1.disconnect();
      formant2.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  private maybePlayDrip(nowMs: number, waterLevel: number): void {
    if (nowMs - this.lastDripTime < this.DRIP_MIN_INTERVAL) return;
    if (Math.random() > waterLevel * 0.03) return;

    this.lastDripTime = nowMs;

    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(2000 + Math.random() * 1000, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
    osc.type = 'sine';

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.02, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(this.output);

    osc.start(now);
    osc.stop(now + 0.15);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  private cleanup(): void {
    if (this.waterNoise) {
      try { this.waterNoise.stop(); } catch {}
      this.waterNoise.disconnect();
      this.waterNoise = null;
    }
    if (this.waterLfo) {
      try { this.waterLfo.stop(); } catch {}
      this.waterLfo.disconnect();
      this.waterLfo = null;
    }
    if (this.droneOsc1) {
      try { this.droneOsc1.stop(); } catch {}
      this.droneOsc1.disconnect();
      this.droneOsc1 = null;
    }
    if (this.droneOsc2) {
      try { this.droneOsc2.stop(); } catch {}
      this.droneOsc2.disconnect();
      this.droneOsc2 = null;
    }
    if (this.droneLfo) {
      try { this.droneLfo.stop(); } catch {}
      this.droneLfo.disconnect();
      this.droneLfo = null;
    }
  }
}
