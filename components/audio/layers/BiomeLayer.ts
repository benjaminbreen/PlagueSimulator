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
  JEWISH_QUARTER: 'hovels',  // TODO: Add specific Jewish Quarter soundscape in Phase 6
  RESIDENTIAL: 'hovels',
  OUTSKIRTS_DESERT: 'desert',
  OUTSKIRTS_FARMLAND: 'desert',
  SOUTHERN_ROAD: 'desert',
  MOUNTAIN_SHRINE: 'desert',
  CIVIC: 'civic',
  CHRISTIAN_QUARTER: 'wealthy',
  UMAYYAD_MOSQUE: 'civic',
};

// Sound configuration per biome
interface BiomeProfile {
  conversation: number;  // Low murmur of voices (unused, kept for compatibility)
  birds: number;         // Subtle bird chirps
  hammering: number;     // Blacksmith strikes
  footsteps: number;     // Occasional footstep sounds
  wind: number;          // Gentle breeze (unused)
  merchantCalls: number; // Merchant vocal calls
}

const BIOME_PROFILES: Record<BiomeType, BiomeProfile> = {
  marketplace: {
    conversation: 0.6,   // Busy market chatter
    birds: 0.3,          // Some birds
    hammering: 0.5,      // Active blacksmithing
    footsteps: 0.4,      // People walking
    wind: 0.1,           // Minimal wind
    merchantCalls: 0.5,  // Active merchant calls
  },
  wealthy: {
    conversation: 0.2,   // Quiet, refined
    birds: 0.6,          // Lots of birdsong
    hammering: 0,        // No crafts
    footsteps: 0.15,     // Few people
    wind: 0.2,           // Gentle breeze
    merchantCalls: 0,    // No merchants
  },
  hovels: {
    conversation: 0.35,  // Some activity
    birds: 0.15,         // Few birds
    hammering: 0.25,     // Some crafts
    footsteps: 0.3,      // Moderate traffic
    wind: 0.15,          // Normal wind
    merchantCalls: 0.1,  // Occasional street vendors
  },
  desert: {
    conversation: 0.05,  // Very sparse
    birds: 0.2,          // Occasional desert birds
    hammering: 0,        // No industry
    footsteps: 0.1,      // Few travelers
    wind: 0.7,           // Strong wind
    merchantCalls: 0,    // No merchants
  },
  civic: {
    conversation: 0.3,   // Moderate public space
    birds: 0.4,          // Pleasant birdsong
    hammering: 0,        // No crafts
    footsteps: 0.25,     // Some foot traffic
    wind: 0.2,           // Gentle wind
    merchantCalls: 0,    // No merchants
  },
};

export class BiomeLayer implements SoundLayer {
  name = 'biome';

  private ctx: AudioContext;
  private output: GainNode;
  private volume: number = 0.15;
  private isPlaying: boolean = false;

  // Current state
  private currentBiome: BiomeType = 'marketplace';
  private currentProfile: BiomeProfile = BIOME_PROFILES.marketplace;

  // No continuous background sounds - only occasional discrete sounds

  // Timing for occasional sounds
  private lastBirdTime: number = 0;
  private lastHammerTime: number = 0;
  private lastFootstepTime: number = 0;
  private lastMerchantCallTime: number = 0;

  // Minimum intervals (ms) - more frequent for pleasant ambience
  private readonly BIRD_MIN_INTERVAL = 3000;
  private readonly HAMMER_MIN_INTERVAL = 3000;
  private readonly FOOTSTEP_MIN_INTERVAL = 2000;
  private readonly MERCHANT_MIN_INTERVAL = 5000;

  // Distance-based attenuation
  private readonly MAX_ACTIVITY_DISTANCE = 120; // Units from center where sounds fade to zero

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Main output
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;

    // No continuous sounds - everything goes directly to output
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

    // No continuous sounds to start - just enable the layer
    // Fade in
    this.output.gain.setValueAtTime(0, this.ctx.currentTime);
    this.output.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 1);
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

    // Calculate distance from map center for activity attenuation
    const [px, py, pz] = state.playerPosition;
    const distanceFromCenter = Math.sqrt(px * px + pz * pz); // XZ plane distance

    // Sounds get quieter and less frequent as player moves away from center
    // Full volume at center, fades to 0 at MAX_ACTIVITY_DISTANCE
    const distanceMult = Math.max(0, 1 - (distanceFromCenter / this.MAX_ACTIVITY_DISTANCE));

    // Interior dampening
    const interiorMult = state.sceneMode === 'interior' ? 0.2 : 1.0;

    // Night reduction (less activity sounds at night)
    const isNight = state.timeOfDay < 6 || state.timeOfDay > 21;
    const nightMult = isNight ? 0.3 : 1.0;

    const profile = this.currentProfile;

    // Apply distance attenuation to master volume
    const totalMult = interiorMult * distanceMult;
    this.output.gain.setTargetAtTime(this.volume * totalMult, now, 0.3);

    // No continuous background sounds - only occasional discrete sounds
    // This eliminates the "shush-shush" filtered noise entirely

    // Occasional sounds (only outdoors, modulated by time and distance)
    if (state.sceneMode === 'outdoor' && distanceMult > 0.05) {
      // Birds (daytime only)
      if (profile.birds > 0 && !isNight) {
        this.maybePlayBird(nowMs, profile.birds * distanceMult);
      }

      // Hammering (only during work hours)
      const isWorkHours = state.timeOfDay >= 7 && state.timeOfDay <= 18;
      if (profile.hammering > 0 && isWorkHours) {
        this.maybePlayHammer(nowMs, profile.hammering * distanceMult);
      }

      // Footsteps (less at night)
      if (profile.footsteps > 0) {
        this.maybePlayFootstep(nowMs, profile.footsteps * nightMult * distanceMult);
      }

      // Merchant calls (work hours, louder in marketplace)
      if (profile.merchantCalls > 0 && isWorkHours) {
        this.maybePlayMerchantCall(nowMs, profile.merchantCalls * distanceMult);
      }
    }
  }

  private transitionToBiome(biome: BiomeType): void {
    // Smooth crossfade handled by setTargetAtTime in update()
    // Could add more complex transition logic here if needed
  }

  // --- Pleasant Sporadic Sound Generators ---

  private maybePlayBird(nowMs: number, probability: number): void {
    if (nowMs - this.lastBirdTime < this.BIRD_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.03) return; // Increased from 0.01

    this.lastBirdTime = nowMs;
    this.playBird();
  }

  private playBird(): void {
    const now = this.ctx.currentTime;
    const numChirps = 1 + Math.floor(Math.random() * 3);

    for (let i = 0; i < numChirps; i++) {
      const startTime = now + i * (0.15 + Math.random() * 0.1);

      // Sweet chirping sound - higher frequency, pleasant
      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(2000 + Math.random() * 1500, startTime);
      osc.frequency.exponentialRampToValueAtTime(1800 + Math.random() * 800, startTime + 0.08);
      osc.type = 'sine'; // Pure tone for pleasant chirp

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.025, startTime); // Slightly louder for audibility
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.8;

      osc.connect(gain);
      gain.connect(panner);
      panner.connect(this.output);

      osc.start(startTime);
      osc.stop(startTime + 0.12);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
        panner.disconnect();
      };
    }
  }

  private maybePlayFootstep(nowMs: number, probability: number): void {
    if (nowMs - this.lastFootstepTime < this.FOOTSTEP_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.025) return; // Increased from 0.012

    this.lastFootstepTime = nowMs;
    this.playFootstep();
  }

  private playFootstep(): void {
    const now = this.ctx.currentTime;

    // Simple, subtle footstep - just a brief low thump
    const osc = this.ctx.createOscillator();
    osc.frequency.setValueAtTime(120 + Math.random() * 80, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
    osc.type = 'sine';

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.012, now); // Very quiet
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.6;

    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.output);

    osc.start(now);
    osc.stop(now + 0.1);

    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  private maybePlayHammer(nowMs: number, probability: number): void {
    if (nowMs - this.lastHammerTime < this.HAMMER_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.02) return; // Increased from 0.012

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

  private maybePlayMerchantCall(nowMs: number, probability: number): void {
    if (nowMs - this.lastMerchantCallTime < this.MERCHANT_MIN_INTERVAL) return;
    if (Math.random() > probability * 0.015) return; // Lower probability for less frequent calls

    this.lastMerchantCallTime = nowMs;
    this.playMerchantCall();
  }

  private playMerchantCall(): void {
    const now = this.ctx.currentTime;
    const duration = 0.3 + Math.random() * 0.4;
    const baseFreq = 150 + Math.random() * 100; // Male voice range

    // Simple vowel synthesis for merchant call
    const osc = this.ctx.createOscillator();
    osc.frequency.value = baseFreq;
    osc.type = 'sawtooth';

    // Formant filters for vowel sounds (creates "aaa", "eee", "ooo" sounds)
    const vowels = [
      [700, 1200, 2500], // 'a'
      [400, 2000, 2600], // 'e'
      [300, 900, 2200],  // 'o'
    ];
    const vowel = vowels[Math.floor(Math.random() * vowels.length)];

    const filters: BiquadFilterNode[] = [];
    vowel.forEach(freq => {
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = 8;
      filters.push(f);
    });

    const merger = this.ctx.createGain();
    merger.gain.value = 0.08; // Moderate volume

    filters.forEach(f => {
      osc.connect(f);
      f.connect(merger);
    });

    // Envelope for natural attack/decay
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(1, now + 0.05);
    env.gain.setValueAtTime(1, now + duration - 0.1);
    env.gain.linearRampToValueAtTime(0, now + duration);

    // Stereo panning for spatial variation
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.7;

    merger.connect(env);
    env.connect(panner);
    panner.connect(this.output);

    osc.start(now);
    osc.stop(now + duration + 0.1);

    osc.onended = () => {
      osc.disconnect();
      filters.forEach(f => f.disconnect());
      merger.disconnect();
      env.disconnect();
      panner.disconnect();
    };
  }

  private cleanup(): void {
    // No continuous sounds to clean up
    // All sporadic sounds clean up after themselves via onended callbacks
  }
}
