/**
 * SacredLayer - Islamic call to prayer (Adhan) and sacred atmosphere
 *
 * Features:
 * - Five daily prayer calls at appropriate times
 * - Multiple "distant mosque" voices
 * - Sacred ambient drone near religious buildings
 * - Respectful, atmospheric synthesis
 */

import { SoundLayer, AmbientState } from '../AmbientSoundEngine';
import { AdhanSynth, createDistantAdhan } from '../synthesis/AdhanSynth';

// Prayer times (approximate for Damascus latitude)
interface PrayerTime {
  name: string;
  hour: number;
  minute: number;
  character: 'contemplative' | 'strong' | 'measured' | 'reflective' | 'peaceful';
}

const PRAYER_TIMES: PrayerTime[] = [
  { name: 'Fajr', hour: 5, minute: 30, character: 'contemplative' },
  { name: 'Dhuhr', hour: 12, minute: 0, character: 'strong' },
  { name: 'Asr', hour: 15, minute: 30, character: 'measured' },
  { name: 'Maghrib', hour: 18, minute: 30, character: 'reflective' },
  { name: 'Isha', hour: 20, minute: 0, character: 'peaceful' },
];

// Character adjustments for different prayer times
const CHARACTER_SETTINGS: Record<PrayerTime['character'], { baseFreq: number; gain: number }> = {
  contemplative: { baseFreq: 200, gain: 0.10 },
  strong: { baseFreq: 240, gain: 0.14 },
  measured: { baseFreq: 220, gain: 0.12 },
  reflective: { baseFreq: 210, gain: 0.11 },
  peaceful: { baseFreq: 195, gain: 0.09 },
};

export class SacredLayer implements SoundLayer {
  name = 'sacred';

  private ctx: AudioContext;
  private output: GainNode;
  private volume: number = 0.2;
  private isPlaying: boolean = false;

  // Adhan synths (main + distant echoes)
  private mainAdhan: AdhanSynth;
  private distantAdhan1: { synth: AdhanSynth; output: GainNode } | null = null;
  private distantAdhan2: { synth: AdhanSynth; output: GainNode } | null = null;

  // Sacred ambient drone
  private sacredDrone: OscillatorNode | null = null;
  private sacredDroneGain: GainNode;
  private sacredDroneLfo: OscillatorNode | null = null;

  // State tracking
  private isAdhanPlaying: boolean = false;
  private lastAdhanHour: number = -1;
  private simTimeAtLastCheck: number = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Main output
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;

    // Main Adhan synth
    this.mainAdhan = new AdhanSynth(ctx);
    this.mainAdhan.connect(this.output);

    // Sacred drone for ambient presence
    this.sacredDroneGain = ctx.createGain();
    this.sacredDroneGain.gain.value = 0;
    this.sacredDroneGain.connect(this.output);
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

    // Setup distant mosque voices
    this.distantAdhan1 = createDistantAdhan(this.ctx, { delay: 0.8, gain: 0.04, filterCutoff: 1200 });
    this.distantAdhan1.output.connect(this.output);

    this.distantAdhan2 = createDistantAdhan(this.ctx, { delay: 1.5, gain: 0.025, filterCutoff: 800 });
    this.distantAdhan2.output.connect(this.output);

    // Setup sacred drone
    this.setupSacredDrone();

    // Fade in
    this.output.gain.setValueAtTime(0, this.ctx.currentTime);
    this.output.gain.linearRampToValueAtTime(this.volume, this.ctx.currentTime + 2);
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // Stop any playing Adhan
    this.mainAdhan.stop();
    this.distantAdhan1?.synth.stop();
    this.distantAdhan2?.synth.stop();

    // Fade out
    const now = this.ctx.currentTime;
    this.output.gain.setTargetAtTime(0, now, 0.5);

    // Cleanup
    setTimeout(() => {
      this.cleanupDrone();
    }, 1000);
  }

  update(state: AmbientState, delta: number): void {
    if (!this.isPlaying) return;

    const now = this.ctx.currentTime;

    // Check for prayer time (only trigger once per prayer)
    if (!this.isAdhanPlaying) {
      const currentPrayer = this.getCurrentPrayer(state.timeOfDay);
      if (currentPrayer && this.shouldTriggerAdhan(state.timeOfDay, currentPrayer)) {
        this.triggerAdhan(currentPrayer);
      }
    }

    // Sacred drone: active near religious buildings or during prayer
    // For now, keep a subtle presence that increases during prayer times
    const isPrayerTime = this.isNearPrayerTime(state.timeOfDay);
    const droneTarget = isPrayerTime ? 0.02 : 0.005;
    const interiorMultiplier = state.sceneMode === 'interior' ? 1.5 : 1.0; // Louder inside

    this.sacredDroneGain.gain.setTargetAtTime(
      droneTarget * interiorMultiplier,
      now,
      2
    );
  }

  private getCurrentPrayer(timeOfDay: number): PrayerTime | null {
    const hour = Math.floor(timeOfDay);
    const minute = (timeOfDay - hour) * 60;

    for (const prayer of PRAYER_TIMES) {
      const prayerTimeDecimal = prayer.hour + prayer.minute / 60;
      const timeDiff = Math.abs(timeOfDay - prayerTimeDecimal);

      // Within 5 minutes of prayer time
      if (timeDiff < 5 / 60) {
        return prayer;
      }
    }

    return null;
  }

  private shouldTriggerAdhan(timeOfDay: number, prayer: PrayerTime): boolean {
    // Prevent double-triggering
    if (this.lastAdhanHour === prayer.hour) {
      return false;
    }

    return true;
  }

  private triggerAdhan(prayer: PrayerTime): void {
    this.isAdhanPlaying = true;
    this.lastAdhanHour = prayer.hour;

    const settings = CHARACTER_SETTINGS[prayer.character];

    console.log(`[SacredLayer] Starting ${prayer.name} Adhan`);

    // Play main Adhan
    this.mainAdhan.play({
      baseFrequency: settings.baseFreq,
      gain: settings.gain,
      reverbWet: 0.5,
      onComplete: () => {
        this.isAdhanPlaying = false;
        console.log(`[SacredLayer] ${prayer.name} Adhan complete`);
      }
    });

    // Start distant voices with slight delays
    setTimeout(() => {
      this.distantAdhan1?.synth.play({
        baseFrequency: settings.baseFreq * 0.98, // Slightly detuned
        gain: settings.gain * 0.3,
        reverbWet: 0.7,
      });
    }, 800);

    setTimeout(() => {
      this.distantAdhan2?.synth.play({
        baseFrequency: settings.baseFreq * 1.02, // Slightly detuned other direction
        gain: settings.gain * 0.2,
        reverbWet: 0.8,
      });
    }, 1500);
  }

  private isNearPrayerTime(timeOfDay: number): boolean {
    for (const prayer of PRAYER_TIMES) {
      const prayerTimeDecimal = prayer.hour + prayer.minute / 60;
      const timeDiff = Math.abs(timeOfDay - prayerTimeDecimal);

      // Within 15 minutes of prayer time
      if (timeDiff < 15 / 60) {
        return true;
      }
    }
    return false;
  }

  private setupSacredDrone(): void {
    // Low, peaceful drone
    this.sacredDrone = this.ctx.createOscillator();
    this.sacredDrone.type = 'sine';
    this.sacredDrone.frequency.value = 55; // Low A

    // Subtle second partial
    const drone2 = this.ctx.createOscillator();
    drone2.type = 'sine';
    drone2.frequency.value = 82.5; // Fifth above

    const drone2Gain = this.ctx.createGain();
    drone2Gain.gain.value = 0.3;
    drone2.connect(drone2Gain);
    drone2Gain.connect(this.sacredDroneGain);

    // LFO for gentle movement
    this.sacredDroneLfo = this.ctx.createOscillator();
    this.sacredDroneLfo.type = 'sine';
    this.sacredDroneLfo.frequency.value = 0.05; // Very slow

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 2; // ±2 Hz variation

    this.sacredDroneLfo.connect(lfoGain);
    lfoGain.connect(this.sacredDrone.frequency);

    this.sacredDrone.connect(this.sacredDroneGain);

    this.sacredDrone.start();
    drone2.start();
    this.sacredDroneLfo.start();
  }

  private cleanupDrone(): void {
    if (this.sacredDrone) {
      try { this.sacredDrone.stop(); } catch {}
      this.sacredDrone.disconnect();
      this.sacredDrone = null;
    }
    if (this.sacredDroneLfo) {
      try { this.sacredDroneLfo.stop(); } catch {}
      this.sacredDroneLfo.disconnect();
      this.sacredDroneLfo = null;
    }
  }

  /**
   * Manually trigger Adhan (for testing/demo)
   */
  forcePlayAdhan(character: PrayerTime['character'] = 'strong'): void {
    if (this.isAdhanPlaying) return;

    const mockPrayer: PrayerTime = {
      name: 'Manual',
      hour: 0,
      minute: 0,
      character
    };

    this.triggerAdhan(mockPrayer);
  }
}
