/**
 * BiomeAmbience - Procedural ambient soundscapes for Damascus 1348
 *
 * Creates layered environmental sounds using Web Audio API synthesis:
 * - Crowd murmurs, merchant calls, footsteps
 * - Water/fountain sounds
 * - Wind and weather
 * - Animal sounds (birds, dogs, chickens, donkeys)
 * - Atmospheric drones
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';

export type BiomeType = 'marketplace' | 'wealthy' | 'hovels' | 'desert' | 'civic';

interface BiomeAmbienceProps {
  biome: BiomeType;
  enabled?: boolean;
  volume?: number;
}

interface AmbienceConfig {
  // Layer volumes (0-1)
  crowdMurmur: number;
  merchantCalls: number;
  footsteps: number;
  water: number;
  wind: number;
  birds: number;
  dogs: number;
  chickens: number;
  donkeys: number;
  hammersmith: number;
  coughing: number;
  babies: number;
  drone: number;
  // Characteristics
  crowdDensity: number; // 0-1, affects murmur complexity
  reverbAmount: number;
  windIntensity: number;
  droneFreq: number;
  description: string;
}

const AMBIENCE_CONFIGS: Record<BiomeType, AmbienceConfig> = {
  marketplace: {
    crowdMurmur: 0.6,
    merchantCalls: 0.5,
    footsteps: 0.4,
    water: 0.15,
    wind: 0.1,
    birds: 0.2,
    dogs: 0.15,
    chickens: 0.3,
    donkeys: 0.2,
    hammersmith: 0.35,
    coughing: 0.1,
    babies: 0.1,
    drone: 0.15,
    crowdDensity: 0.8,
    reverbAmount: 0.25,
    windIntensity: 0.3,
    droneFreq: 85,
    description: 'Bustling bazaar with merchants, animals, and crowds',
  },
  wealthy: {
    crowdMurmur: 0.15,
    merchantCalls: 0,
    footsteps: 0.2,
    water: 0.7,
    wind: 0.2,
    birds: 0.6,
    dogs: 0.05,
    chickens: 0,
    donkeys: 0,
    hammersmith: 0,
    coughing: 0,
    babies: 0,
    drone: 0.2,
    crowdDensity: 0.2,
    reverbAmount: 0.4,
    windIntensity: 0.2,
    droneFreq: 65,
    description: 'Tranquil courtyards with fountains and birdsong',
  },
  hovels: {
    crowdMurmur: 0.5,
    merchantCalls: 0.1,
    footsteps: 0.3,
    water: 0,
    wind: 0.15,
    birds: 0.1,
    dogs: 0.4,
    chickens: 0.25,
    donkeys: 0.1,
    hammersmith: 0.15,
    coughing: 0.4,
    babies: 0.35,
    drone: 0.25,
    crowdDensity: 0.7,
    reverbAmount: 0.15,
    windIntensity: 0.25,
    droneFreq: 75,
    description: 'Cramped streets with poverty, illness, and strife',
  },
  desert: {
    crowdMurmur: 0,
    merchantCalls: 0,
    footsteps: 0.1,
    water: 0,
    wind: 0.85,
    birds: 0.15,
    dogs: 0.05,
    chickens: 0,
    donkeys: 0.1,
    hammersmith: 0,
    coughing: 0,
    babies: 0,
    drone: 0.4,
    crowdDensity: 0,
    reverbAmount: 0.5,
    windIntensity: 0.9,
    droneFreq: 50,
    description: 'Vast emptiness with wind and distant sounds',
  },
  civic: {
    crowdMurmur: 0.25,
    merchantCalls: 0,
    footsteps: 0.35,
    water: 0.3,
    wind: 0.15,
    birds: 0.25,
    dogs: 0.05,
    chickens: 0,
    donkeys: 0,
    hammersmith: 0,
    coughing: 0.05,
    babies: 0,
    drone: 0.3,
    crowdDensity: 0.35,
    reverbAmount: 0.55,
    windIntensity: 0.15,
    droneFreq: 60,
    description: 'Formal spaces with echoing stone and authority',
  },
};

/**
 * Noise buffer generator - creates reusable noise for various sounds
 */
function createNoiseBuffer(ctx: AudioContext, duration: number, type: 'white' | 'pink' | 'brown' = 'white'): AudioBuffer {
  const length = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;

    if (type === 'white') {
      data[i] = white;
    } else if (type === 'pink') {
      // Pink noise approximation
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      // Brown noise
      b0 = (b0 + (0.02 * white)) / 1.02;
      data[i] = b0 * 3.5;
    }
  }

  return buffer;
}

class AmbienceEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private convolver: ConvolverNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private config: AmbienceConfig;
  private volume: number;
  private isRunning: boolean = false;

  // Noise buffers (reused)
  private whiteNoise!: AudioBuffer;
  private pinkNoise!: AudioBuffer;
  private brownNoise!: AudioBuffer;

  // Active sound sources
  private activeSources: AudioNode[] = [];
  private scheduledTimeouts: ReturnType<typeof setTimeout>[] = [];
  private loopIntervals: ReturnType<typeof setInterval>[] = [];

  constructor(config: AmbienceConfig, volume: number = 0.5) {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.config = config;
    this.volume = volume;

    // Create noise buffers
    this.whiteNoise = createNoiseBuffer(this.ctx, 4, 'white');
    this.pinkNoise = createNoiseBuffer(this.ctx, 4, 'pink');
    this.brownNoise = createNoiseBuffer(this.ctx, 4, 'brown');

    // Master output
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;

    // Reverb
    this.convolver = this.ctx.createConvolver();
    this.convolver.buffer = this.createReverbImpulse(2.5, 2.5);

    this.dryGain = this.ctx.createGain();
    this.wetGain = this.ctx.createGain();
    this.dryGain.gain.value = 1 - config.reverbAmount;
    this.wetGain.gain.value = config.reverbAmount;

    // Routing
    this.masterGain.connect(this.dryGain);
    this.masterGain.connect(this.convolver);
    this.convolver.connect(this.wetGain);
    this.dryGain.connect(this.ctx.destination);
    this.wetGain.connect(this.ctx.destination);
  }

  private createReverbImpulse(duration: number, decay: number): AudioBuffer {
    const length = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, length, this.ctx.sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const env = Math.pow(1 - i / length, decay);
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return buffer;
  }

  /**
   * Crowd murmur - layered filtered noise with modulation
   */
  private startCrowdMurmur() {
    if (this.config.crowdMurmur <= 0) return;

    const vol = this.volume * this.config.crowdMurmur * 0.15;

    // Base layer - pink noise through formant-like filters
    const source = this.ctx.createBufferSource();
    source.buffer = this.pinkNoise;
    source.loop = true;

    // Multiple formant bands for "voice-like" quality
    const formants = [
      { freq: 400, Q: 2 },
      { freq: 800, Q: 3 },
      { freq: 1200, Q: 2 },
      { freq: 2400, Q: 1.5 },
    ];

    const formantGains: GainNode[] = [];

    formants.forEach((f, i) => {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = f.freq * (0.8 + this.config.crowdDensity * 0.4);
      filter.Q.value = f.Q;

      const gain = this.ctx.createGain();
      gain.gain.value = vol * (1 - i * 0.15);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      formantGains.push(gain);
      this.activeSources.push(filter, gain);
    });

    // Slow amplitude modulation for "chatter" effect
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.3 + this.config.crowdDensity * 0.5;
    lfoGain.gain.value = vol * 0.3;

    lfo.connect(lfoGain);
    formantGains.forEach(g => lfoGain.connect(g.gain));

    source.start();
    lfo.start();

    this.activeSources.push(source, lfo, lfoGain);
  }

  /**
   * Merchant calls - synthesized vowel sounds at random intervals
   */
  private startMerchantCalls() {
    if (this.config.merchantCalls <= 0) return;

    const scheduleCall = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.merchantCalls * 0.12;
      const duration = 0.3 + Math.random() * 0.4;
      const baseFreq = 150 + Math.random() * 100; // Male voice range

      // Simple vowel synthesis
      const osc = this.ctx.createOscillator();
      osc.frequency.value = baseFreq;
      osc.type = 'sawtooth';

      // Formant filters for vowel
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
      merger.gain.value = vol;

      filters.forEach(f => {
        osc.connect(f);
        f.connect(merger);
      });

      // Envelope
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0, this.ctx.currentTime);
      env.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 0.05);
      env.gain.setValueAtTime(1, this.ctx.currentTime + duration - 0.1);
      env.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

      merger.connect(env);
      env.connect(this.masterGain);

      osc.start();
      osc.stop(this.ctx.currentTime + duration + 0.1);

      // Schedule next call
      const nextDelay = 3000 + Math.random() * 8000;
      const timeout = setTimeout(scheduleCall, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    // Initial delay
    const timeout = setTimeout(scheduleCall, 1000 + Math.random() * 3000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Footsteps - filtered noise bursts
   */
  private startFootsteps() {
    if (this.config.footsteps <= 0) return;

    const scheduleStep = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.footsteps * 0.08;

      // Create footstep sound
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.08, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const env = Math.exp(-i / (data.length * 0.15));
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;

      // Stone/dirt floor filter
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 800 + Math.random() * 600;

      const gain = this.ctx.createGain();
      gain.gain.value = vol * (0.5 + Math.random() * 0.5);

      // Slight panning for spatial effect
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.6;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);

      source.start();

      // Schedule next step (walking rhythm)
      const nextDelay = 400 + Math.random() * 300;
      const timeout = setTimeout(scheduleStep, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleStep, Math.random() * 1000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Water/fountain - filtered noise with modulation
   */
  private startWater() {
    if (this.config.water <= 0) return;

    const vol = this.volume * this.config.water * 0.2;

    // Base water noise
    const source = this.ctx.createBufferSource();
    source.buffer = this.whiteNoise;
    source.loop = true;

    // Bandpass for water character
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.8;

    // LFO for splashing variation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 1.5;
    lfoGain.gain.value = 800;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Second LFO for amplitude
    const lfo2 = this.ctx.createOscillator();
    const lfo2Gain = this.ctx.createGain();
    lfo2.frequency.value = 0.4;
    lfo2Gain.gain.value = vol * 0.3;

    const gain = this.ctx.createGain();
    gain.gain.value = vol;

    lfo2.connect(lfo2Gain);
    lfo2Gain.connect(gain.gain);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    source.start();
    lfo.start();
    lfo2.start();

    this.activeSources.push(source, lfo, lfo2, filter, gain, lfoGain, lfo2Gain);

    // Occasional drip sounds
    const scheduleDrip = () => {
      if (!this.isRunning) return;

      const dripOsc = this.ctx.createOscillator();
      dripOsc.frequency.setValueAtTime(2000 + Math.random() * 1000, this.ctx.currentTime);
      dripOsc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.08);
      dripOsc.type = 'sine';

      const dripGain = this.ctx.createGain();
      dripGain.gain.setValueAtTime(vol * 0.15, this.ctx.currentTime);
      dripGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

      dripOsc.connect(dripGain);
      dripGain.connect(this.masterGain);

      dripOsc.start();
      dripOsc.stop(this.ctx.currentTime + 0.15);

      const nextDelay = 500 + Math.random() * 2000;
      const timeout = setTimeout(scheduleDrip, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleDrip, 1000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Wind - modulated filtered noise
   */
  private startWind() {
    if (this.config.wind <= 0) return;

    const vol = this.volume * this.config.wind * 0.25;
    const intensity = this.config.windIntensity;

    // Brown noise for wind base
    const source = this.ctx.createBufferSource();
    source.buffer = this.brownNoise;
    source.loop = true;

    // Multiple filters for wind character
    const lowFilter = this.ctx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.value = 300 + intensity * 400;

    const highFilter = this.ctx.createBiquadFilter();
    highFilter.type = 'highpass';
    highFilter.frequency.value = 80;

    // Slow modulation for gusts
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.15 + intensity * 0.2;
    lfoGain.gain.value = 200 * intensity;
    lfo.connect(lfoGain);
    lfoGain.connect(lowFilter.frequency);

    // Volume modulation
    const volLfo = this.ctx.createOscillator();
    const volLfoGain = this.ctx.createGain();
    volLfo.frequency.value = 0.08;
    volLfoGain.gain.value = vol * 0.4 * intensity;

    const gain = this.ctx.createGain();
    gain.gain.value = vol;

    volLfo.connect(volLfoGain);
    volLfoGain.connect(gain.gain);

    source.connect(lowFilter);
    lowFilter.connect(highFilter);
    highFilter.connect(gain);
    gain.connect(this.masterGain);

    source.start();
    lfo.start();
    volLfo.start();

    this.activeSources.push(source, lfo, volLfo, lowFilter, highFilter, gain, lfoGain, volLfoGain);

    // Occasional stronger gusts
    if (intensity > 0.5) {
      const scheduleGust = () => {
        if (!this.isRunning) return;

        const gustSource = this.ctx.createBufferSource();
        gustSource.buffer = this.whiteNoise;

        const gustFilter = this.ctx.createBiquadFilter();
        gustFilter.type = 'bandpass';
        gustFilter.frequency.value = 400 + Math.random() * 300;
        gustFilter.Q.value = 1;

        const gustGain = this.ctx.createGain();
        const duration = 0.8 + Math.random() * 1.5;
        gustGain.gain.setValueAtTime(0, this.ctx.currentTime);
        gustGain.gain.linearRampToValueAtTime(vol * 0.6, this.ctx.currentTime + duration * 0.3);
        gustGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        gustSource.connect(gustFilter);
        gustFilter.connect(gustGain);
        gustGain.connect(this.masterGain);

        gustSource.start();
        gustSource.stop(this.ctx.currentTime + duration + 0.1);

        const nextDelay = 4000 + Math.random() * 8000;
        const timeout = setTimeout(scheduleGust, nextDelay);
        this.scheduledTimeouts.push(timeout);
      };

      const timeout = setTimeout(scheduleGust, 2000);
      this.scheduledTimeouts.push(timeout);
    }
  }

  /**
   * Bird calls - FM synthesis chirps
   */
  private startBirds() {
    if (this.config.birds <= 0) return;

    const scheduleChirp = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.birds * 0.08;

      // Bird chirp using FM synthesis
      const carrier = this.ctx.createOscillator();
      const modulator = this.ctx.createOscillator();
      const modGain = this.ctx.createGain();

      const baseFreq = 2000 + Math.random() * 2000;
      carrier.frequency.value = baseFreq;
      carrier.type = 'sine';

      modulator.frequency.value = baseFreq * (2 + Math.random() * 2);
      modGain.gain.value = baseFreq * 0.5;

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);

      // Chirp envelope
      const envelope = this.ctx.createGain();
      const duration = 0.05 + Math.random() * 0.1;
      const numChirps = 1 + Math.floor(Math.random() * 4);

      envelope.gain.setValueAtTime(0, this.ctx.currentTime);

      for (let i = 0; i < numChirps; i++) {
        const start = this.ctx.currentTime + i * (duration + 0.05);
        envelope.gain.linearRampToValueAtTime(vol, start + 0.01);
        envelope.gain.linearRampToValueAtTime(0, start + duration);
      }

      // Panning for spatial spread
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 1.5;

      carrier.connect(envelope);
      envelope.connect(panner);
      panner.connect(this.masterGain);

      const totalDuration = numChirps * (duration + 0.05) + 0.1;
      carrier.start();
      modulator.start();
      carrier.stop(this.ctx.currentTime + totalDuration);
      modulator.stop(this.ctx.currentTime + totalDuration);

      // Schedule next bird
      const nextDelay = 2000 + Math.random() * 6000;
      const timeout = setTimeout(scheduleChirp, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleChirp, Math.random() * 2000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Dog barks - noise + formants
   */
  private startDogs() {
    if (this.config.dogs <= 0) return;

    const scheduleBark = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.dogs * 0.1;
      const numBarks = 1 + Math.floor(Math.random() * 3);

      for (let i = 0; i < numBarks; i++) {
        const startTime = this.ctx.currentTime + i * 0.25;

        // Noise component
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.15, this.ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let j = 0; j < noiseData.length; j++) {
          noiseData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (noiseData.length * 0.3));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        // Formant for "bark" sound
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
        mixer.gain.setValueAtTime(vol, startTime);
        mixer.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);

        const panner = this.ctx.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 0.8;

        noise.connect(formant);
        formant.connect(mixer);
        osc.connect(oscFilter);
        oscFilter.connect(mixer);
        mixer.connect(panner);
        panner.connect(this.masterGain);

        noise.start(startTime);
        osc.start(startTime);
        osc.stop(startTime + 0.2);
      }

      // Schedule next bark sequence
      const nextDelay = 8000 + Math.random() * 15000;
      const timeout = setTimeout(scheduleBark, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleBark, 3000 + Math.random() * 5000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Chicken clucks - short filtered noise bursts
   */
  private startChickens() {
    if (this.config.chickens <= 0) return;

    const scheduleCluck = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.chickens * 0.06;
      const numClucks = 2 + Math.floor(Math.random() * 4);

      for (let i = 0; i < numClucks; i++) {
        const startTime = this.ctx.currentTime + i * (0.08 + Math.random() * 0.05);

        const osc = this.ctx.createOscillator();
        osc.frequency.setValueAtTime(800 + Math.random() * 400, startTime);
        osc.frequency.exponentialRampToValueAtTime(400, startTime + 0.05);
        osc.type = 'triangle';

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 4;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);

        const panner = this.ctx.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 0.5;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);

        osc.start(startTime);
        osc.stop(startTime + 0.1);
      }

      const nextDelay = 4000 + Math.random() * 10000;
      const timeout = setTimeout(scheduleCluck, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleCluck, 1000 + Math.random() * 3000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Donkey bray - complex noise + harmonics
   */
  private startDonkeys() {
    if (this.config.donkeys <= 0) return;

    const scheduleBray = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.donkeys * 0.08;
      const duration = 1.5 + Math.random() * 1;

      // Inhale portion (hee)
      const osc1 = this.ctx.createOscillator();
      osc1.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc1.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + duration * 0.4);
      osc1.type = 'sawtooth';

      // Exhale portion (haw)
      const osc2 = this.ctx.createOscillator();
      osc2.frequency.setValueAtTime(400, this.ctx.currentTime + duration * 0.4);
      osc2.frequency.linearRampToValueAtTime(150, this.ctx.currentTime + duration);
      osc2.type = 'sawtooth';

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + duration * 0.4);
      filter.frequency.linearRampToValueAtTime(400, this.ctx.currentTime + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime + duration - 0.2);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.7;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);

      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + duration + 0.1);
      osc2.stop(this.ctx.currentTime + duration + 0.1);

      // Schedule next bray (rare)
      const nextDelay = 20000 + Math.random() * 40000;
      const timeout = setTimeout(scheduleBray, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleBray, 5000 + Math.random() * 15000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Blacksmith hammer strikes
   */
  private startHammersmith() {
    if (this.config.hammersmith <= 0) return;

    const scheduleStrike = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.hammersmith * 0.12;

      // Metal strike - high frequency ring + impact
      const strikeBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
      const strikeData = strikeBuffer.getChannelData(0);
      for (let i = 0; i < strikeData.length; i++) {
        const t = i / this.ctx.sampleRate;
        // Impact + ring
        strikeData[i] = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.5 +
                        Math.sin(t * 2000 * Math.PI * 2) * Math.exp(-t * 8) * 0.3 +
                        Math.sin(t * 3500 * Math.PI * 2) * Math.exp(-t * 12) * 0.2;
      }

      const strike = this.ctx.createBufferSource();
      strike.buffer = strikeBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 200;

      const gain = this.ctx.createGain();
      gain.gain.value = vol;

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.4;

      strike.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);

      strike.start();

      // Rhythmic strikes then pause
      const numStrikes = 3 + Math.floor(Math.random() * 4);
      let delay = 400 + Math.random() * 200;

      for (let i = 1; i < numStrikes; i++) {
        const t = setTimeout(() => {
          if (!this.isRunning) return;
          const s = this.ctx.createBufferSource();
          s.buffer = strikeBuffer;
          const g = this.ctx.createGain();
          g.gain.value = vol * (0.7 + Math.random() * 0.3);
          s.connect(filter);
          filter.connect(g);
          g.connect(panner);
          s.start();
        }, delay * i);
        this.scheduledTimeouts.push(t);
      }

      // Pause then resume
      const nextDelay = 5000 + Math.random() * 10000;
      const timeout = setTimeout(scheduleStrike, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleStrike, 2000 + Math.random() * 4000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Coughing sounds (plague atmosphere)
   */
  private startCoughing() {
    if (this.config.coughing <= 0) return;

    const scheduleCough = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.coughing * 0.1;
      const numCoughs = 1 + Math.floor(Math.random() * 3);

      for (let i = 0; i < numCoughs; i++) {
        const startTime = this.ctx.currentTime + i * (0.3 + Math.random() * 0.2);

        // Noise burst through formants
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.2, this.ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let j = 0; j < noiseData.length; j++) {
          const env = Math.sin(j / noiseData.length * Math.PI) * Math.exp(-j / (noiseData.length * 0.5));
          noiseData[j] = (Math.random() * 2 - 1) * env;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const formant = this.ctx.createBiquadFilter();
        formant.type = 'bandpass';
        formant.frequency.value = 500 + Math.random() * 300;
        formant.Q.value = 2;

        const gain = this.ctx.createGain();
        gain.gain.value = vol;

        const panner = this.ctx.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 0.6;

        noise.connect(formant);
        formant.connect(gain);
        gain.connect(panner);
        panner.connect(this.masterGain);

        noise.start(startTime);
      }

      const nextDelay = 8000 + Math.random() * 20000;
      const timeout = setTimeout(scheduleCough, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleCough, 3000 + Math.random() * 5000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Baby crying
   */
  private startBabies() {
    if (this.config.babies <= 0) return;

    const scheduleCry = () => {
      if (!this.isRunning) return;

      const vol = this.volume * this.config.babies * 0.08;
      const duration = 1 + Math.random() * 2;

      // Sawtooth with vibrato for crying
      const osc = this.ctx.createOscillator();
      osc.frequency.value = 400 + Math.random() * 100;
      osc.type = 'sawtooth';

      // Vibrato
      const vib = this.ctx.createOscillator();
      const vibGain = this.ctx.createGain();
      vib.frequency.value = 6;
      vibGain.gain.value = 30;
      vib.connect(vibGain);
      vibGain.connect(osc.frequency);

      // Formants
      const formant1 = this.ctx.createBiquadFilter();
      formant1.type = 'bandpass';
      formant1.frequency.value = 800;
      formant1.Q.value = 5;

      const formant2 = this.ctx.createBiquadFilter();
      formant2.type = 'bandpass';
      formant2.frequency.value = 1800;
      formant2.Q.value = 4;

      // Envelope with warbles
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, this.ctx.currentTime);

      const numWarbles = Math.floor(duration / 0.3);
      for (let i = 0; i < numWarbles; i++) {
        const t = this.ctx.currentTime + i * 0.3;
        gain.gain.linearRampToValueAtTime(vol, t + 0.05);
        gain.gain.linearRampToValueAtTime(vol * 0.3, t + 0.25);
      }
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

      const panner = this.ctx.createStereoPanner();
      panner.pan.value = (Math.random() - 0.5) * 0.5;

      osc.connect(formant1);
      osc.connect(formant2);
      formant1.connect(gain);
      formant2.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);

      osc.start();
      vib.start();
      osc.stop(this.ctx.currentTime + duration + 0.1);
      vib.stop(this.ctx.currentTime + duration + 0.1);

      const nextDelay = 15000 + Math.random() * 30000;
      const timeout = setTimeout(scheduleCry, nextDelay);
      this.scheduledTimeouts.push(timeout);
    };

    const timeout = setTimeout(scheduleCry, 5000 + Math.random() * 10000);
    this.scheduledTimeouts.push(timeout);
  }

  /**
   * Atmospheric drone - low frequency bed
   */
  private startDrone() {
    if (this.config.drone <= 0) return;

    const vol = this.volume * this.config.drone * 0.15;
    const freq = this.config.droneFreq;

    // Multiple sine waves for rich drone
    const oscs: OscillatorNode[] = [];
    const gains: GainNode[] = [];

    const harmonics = [1, 1.5, 2, 3];
    const levels = [1, 0.3, 0.2, 0.1];

    harmonics.forEach((h, i) => {
      const osc = this.ctx.createOscillator();
      osc.frequency.value = freq * h;
      osc.type = 'sine';

      const gain = this.ctx.createGain();
      gain.gain.value = vol * levels[i];

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      oscs.push(osc);
      gains.push(gain);
      this.activeSources.push(osc, gain);
    });

    // Slow LFO modulation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = vol * 0.2;

    lfo.connect(lfoGain);
    gains.forEach(g => lfoGain.connect(g.gain));

    lfo.start();
    this.activeSources.push(lfo, lfoGain);
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Fade in
    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 1.5);

    // Start all layers
    this.startCrowdMurmur();
    this.startMerchantCalls();
    this.startFootsteps();
    this.startWater();
    this.startWind();
    this.startBirds();
    this.startDogs();
    this.startChickens();
    this.startDonkeys();
    this.startHammersmith();
    this.startCoughing();
    this.startBabies();
    this.startDrone();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Fade out
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);

    // Clear scheduled events
    this.scheduledTimeouts.forEach(t => clearTimeout(t));
    this.scheduledTimeouts = [];

    this.loopIntervals.forEach(i => clearInterval(i));
    this.loopIntervals = [];

    // Stop sources after fade
    setTimeout(() => {
      this.activeSources.forEach(node => {
        try {
          if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
            (node as OscillatorNode).stop();
          }
          node.disconnect();
        } catch {}
      });
      this.activeSources = [];
    }, 600);
  }

  dispose() {
    this.stop();
    setTimeout(() => {
      try { this.ctx.close(); } catch {}
    }, 700);
  }
}

// React Component
export const BiomeAmbience: React.FC<BiomeAmbienceProps> = ({
  biome,
  enabled = true,
  volume = 0.5,
}) => {
  const engineRef = useRef<AmbienceEngine | null>(null);

  useEffect(() => {
    if (enabled) {
      engineRef.current = new AmbienceEngine(AMBIENCE_CONFIGS[biome], volume);
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

// Preview hook for settings UI
export const useBiomeAmbiencePreview = () => {
  const engineRef = useRef<AmbienceEngine | null>(null);
  const [currentPreview, setCurrentPreview] = useState<BiomeType | null>(null);

  const playPreview = useCallback((biome: BiomeType) => {
    // Stop any existing preview
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }

    setCurrentPreview(biome);
    engineRef.current = new AmbienceEngine(AMBIENCE_CONFIGS[biome], 0.6);
    engineRef.current.start();
  }, []);

  const stopPreview = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
    setCurrentPreview(null);
  }, []);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  return { currentPreview, playPreview, stopPreview };
};

export const AMBIENCE_INFO: Record<BiomeType, { name: string; description: string }> = {
  marketplace: AMBIENCE_CONFIGS.marketplace,
  wealthy: AMBIENCE_CONFIGS.wealthy,
  hovels: AMBIENCE_CONFIGS.hovels,
  desert: AMBIENCE_CONFIGS.desert,
  civic: AMBIENCE_CONFIGS.civic,
};

// Export config for external use
export { AMBIENCE_CONFIGS };

export default BiomeAmbience;
