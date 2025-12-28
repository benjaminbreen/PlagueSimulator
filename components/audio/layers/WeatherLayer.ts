/**
 * WeatherLayer - Wind and weather ambient sounds
 *
 * Provides:
 * - CLEAR: Light breeze, occasional gusts
 * - OVERCAST: Heavier wind, muffled quality, low rumbles
 * - SANDSTORM: Howling wind, grit texture
 *
 * Also responds to:
 * - Wind direction (stereo panning)
 * - Humidity (filter adjustments)
 */

import { SoundLayer, AmbientState, WeatherType } from '../AmbientSoundEngine';
import { getSharedNoiseBuffer, createBrownNoiseBuffer } from '../synthesis/NoiseGenerators';

interface WeatherProfile {
  windBase: number;       // Base wind volume
  windFilter: number;     // Lowpass cutoff
  gustFrequency: number;  // Gusts per minute
  gustIntensity: number;  // Gust volume multiplier
  rumble: boolean;        // Add low rumble
  gritTexture: boolean;   // Add high-freq grit
}

const WEATHER_PROFILES: Record<WeatherType, WeatherProfile> = {
  CLEAR: {
    windBase: 0.03,
    windFilter: 400,
    gustFrequency: 4,
    gustIntensity: 1.5,
    rumble: false,
    gritTexture: false,
  },
  OVERCAST: {
    windBase: 0.06,
    windFilter: 300,
    gustFrequency: 6,
    gustIntensity: 2,
    rumble: true,
    gritTexture: false,
  },
  SANDSTORM: {
    windBase: 0.15,
    windFilter: 600,
    gustFrequency: 12,
    gustIntensity: 2.5,
    rumble: true,
    gritTexture: true,
  },
};

export class WeatherLayer implements SoundLayer {
  name = 'weather';

  private ctx: AudioContext;
  private output: GainNode;
  private volume: number = 0.1;
  private isPlaying: boolean = false;

  // Wind sound
  private windNoise: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode;
  private windGain: GainNode;
  private windPanner: StereoPannerNode;

  // Gust modulation
  private gustLfo: OscillatorNode | null = null;
  private gustGain: GainNode;
  private gustShaper: WaveShaperNode;

  // Low rumble
  private rumbleNoise: AudioBufferSourceNode | null = null;
  private rumbleFilter: BiquadFilterNode;
  private rumbleGain: GainNode;
  private brownNoiseBuffer: AudioBuffer | null = null;

  // Grit texture (sandstorm)
  private gritNoise: AudioBufferSourceNode | null = null;
  private gritFilter: BiquadFilterNode;
  private gritGain: GainNode;

  // State
  private currentWeather: WeatherType = 'CLEAR';
  private currentProfile: WeatherProfile = WEATHER_PROFILES.CLEAR;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Main output
    this.output = ctx.createGain();
    this.output.gain.value = this.volume;

    // Wind chain
    this.windPanner = ctx.createStereoPanner();
    this.windPanner.pan.value = 0;
    this.windPanner.connect(this.output);

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.03;
    this.windGain.connect(this.windPanner);

    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 400;
    this.windFilter.Q.value = 0.5;
    this.windFilter.connect(this.windGain);

    // Gust modulation
    this.gustGain = ctx.createGain();
    this.gustGain.gain.value = 0.5;

    // Waveshaper for more organic gusts
    this.gustShaper = ctx.createWaveShaper();
    this.gustShaper.curve = this.createGustCurve() as Float32Array<ArrayBuffer>;
    this.gustShaper.connect(this.gustGain);
    this.gustGain.connect(this.windGain.gain);

    // Rumble chain
    this.rumbleFilter = ctx.createBiquadFilter();
    this.rumbleFilter.type = 'lowpass';
    this.rumbleFilter.frequency.value = 80;
    this.rumbleFilter.Q.value = 0.3;

    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    this.rumbleFilter.connect(this.rumbleGain);
    this.rumbleGain.connect(this.output);

    // Grit chain (high-frequency sandstorm texture)
    this.gritFilter = ctx.createBiquadFilter();
    this.gritFilter.type = 'highpass';
    this.gritFilter.frequency.value = 2000;
    this.gritFilter.Q.value = 1;

    this.gritGain = ctx.createGain();
    this.gritGain.gain.value = 0;
    this.gritFilter.connect(this.gritGain);
    this.gritGain.connect(this.output);
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

    // Create brown noise for rumble
    this.brownNoiseBuffer = createBrownNoiseBuffer(this.ctx, 4);

    // Setup wind
    this.setupWind();

    // Setup gust modulation
    this.setupGusts();

    // Setup rumble
    this.setupRumble();

    // Setup grit
    this.setupGrit();

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

    // Check for weather change
    if (state.weather !== this.currentWeather) {
      this.currentWeather = state.weather;
      this.currentProfile = WEATHER_PROFILES[state.weather] || WEATHER_PROFILES.CLEAR;
      this.crossfadeToWeather(this.currentProfile);
    }

    // Interior dampening (much quieter inside)
    const interiorMultiplier = state.sceneMode === 'interior' ? 0.1 : 1.0;

    // Wind strength adjustment
    const baseWindVolume = this.currentProfile.windBase * interiorMultiplier * state.windStrength;
    this.windGain.gain.setTargetAtTime(baseWindVolume, now, 1);

    // Wind direction -> stereo panning
    // Convert wind direction (radians) to stereo position
    const panValue = Math.sin(state.windDirection) * 0.5;
    this.windPanner.pan.setTargetAtTime(panValue, now, 0.5);

    // Humidity affects wind filter (more humid = more muffled)
    const humidityFilterAdjust = 1 - state.humidity * 0.3;
    const adjustedCutoff = this.currentProfile.windFilter * humidityFilterAdjust;
    this.windFilter.frequency.setTargetAtTime(adjustedCutoff, now, 1);

    // Update gust rate
    if (this.gustLfo) {
      const gustRate = this.currentProfile.gustFrequency / 60; // Per second
      this.gustLfo.frequency.setTargetAtTime(gustRate, now, 1);
    }

    // Rumble intensity
    const rumbleTarget = this.currentProfile.rumble ? 0.05 * interiorMultiplier : 0;
    this.rumbleGain.gain.setTargetAtTime(rumbleTarget, now, 2);

    // Grit intensity (sandstorm only)
    const gritTarget = this.currentProfile.gritTexture ? 0.04 * interiorMultiplier * state.windStrength : 0;
    this.gritGain.gain.setTargetAtTime(gritTarget, now, 2);
  }

  private setupWind(): void {
    const buffer = getSharedNoiseBuffer(this.ctx);
    this.windNoise = this.ctx.createBufferSource();
    this.windNoise.buffer = buffer;
    this.windNoise.loop = true;
    this.windNoise.connect(this.windFilter);
    this.windNoise.start();
  }

  private setupGusts(): void {
    this.gustLfo = this.ctx.createOscillator();
    this.gustLfo.type = 'sine';
    this.gustLfo.frequency.value = 0.1; // Slow gusts

    // Second LFO for variation
    const gustLfo2 = this.ctx.createOscillator();
    gustLfo2.type = 'sine';
    gustLfo2.frequency.value = 0.03;

    const lfoMix = this.ctx.createGain();
    lfoMix.gain.value = 1;

    this.gustLfo.connect(this.gustShaper);
    gustLfo2.connect(lfoMix);
    lfoMix.connect(this.gustShaper);

    this.gustLfo.start();
    gustLfo2.start();
  }

  private setupRumble(): void {
    if (!this.brownNoiseBuffer) return;

    this.rumbleNoise = this.ctx.createBufferSource();
    this.rumbleNoise.buffer = this.brownNoiseBuffer;
    this.rumbleNoise.loop = true;
    this.rumbleNoise.connect(this.rumbleFilter);
    this.rumbleNoise.start();
  }

  private setupGrit(): void {
    const buffer = getSharedNoiseBuffer(this.ctx);
    this.gritNoise = this.ctx.createBufferSource();
    this.gritNoise.buffer = buffer;
    this.gritNoise.loop = true;
    this.gritNoise.connect(this.gritFilter);
    this.gritNoise.start();
  }

  private crossfadeToWeather(profile: WeatherProfile): void {
    const now = this.ctx.currentTime;
    const crossfadeTime = 3;

    // Wind adjustments
    this.windFilter.frequency.setTargetAtTime(profile.windFilter, now, crossfadeTime);
    this.windGain.gain.setTargetAtTime(profile.windBase, now, crossfadeTime);

    // Gust adjustments
    if (this.gustLfo) {
      this.gustLfo.frequency.setTargetAtTime(profile.gustFrequency / 60, now, crossfadeTime);
    }
    this.gustGain.gain.setTargetAtTime(profile.gustIntensity * 0.3, now, crossfadeTime);

    // Rumble
    const rumbleTarget = profile.rumble ? 0.05 : 0;
    this.rumbleGain.gain.setTargetAtTime(rumbleTarget, now, crossfadeTime);

    // Grit
    const gritTarget = profile.gritTexture ? 0.04 : 0;
    this.gritGain.gain.setTargetAtTime(gritTarget, now, crossfadeTime);
  }

  private createGustCurve(): Float32Array {
    // Creates a curve that accentuates peaks for more natural gusts
    const samples = 256;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      // Asymmetric curve - peaks are more pronounced
      curve[i] = x > 0 ? Math.pow(x, 0.5) : 0;
    }

    return curve;
  }

  private cleanupSources(): void {
    if (this.windNoise) {
      try { this.windNoise.stop(); } catch {}
      this.windNoise.disconnect();
      this.windNoise = null;
    }
    if (this.gustLfo) {
      try { this.gustLfo.stop(); } catch {}
      this.gustLfo.disconnect();
      this.gustLfo = null;
    }
    if (this.rumbleNoise) {
      try { this.rumbleNoise.stop(); } catch {}
      this.rumbleNoise.disconnect();
      this.rumbleNoise = null;
    }
    if (this.gritNoise) {
      try { this.gritNoise.stop(); } catch {}
      this.gritNoise.disconnect();
      this.gritNoise = null;
    }
  }
}
