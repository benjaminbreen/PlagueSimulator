/**
 * CollisionSounds - Procedural collision sound effects
 *
 * Different sounds for different material types:
 * - Wall/Stone: Deep thud with reverb
 * - Ceramic: Hollow clay sound, can include crack
 * - Wood: Warm knock with resonance
 * - Metal: Bright ring with sustain
 * - Cloth: Soft muffled thump
 */

export type CollisionMaterial = 'wall' | 'stone' | 'ceramic' | 'wood' | 'metal' | 'cloth';

class CollisionSoundEngine {
  private ctx: AudioContext | null = null;
  private lastPlayTime: number = 0;
  private minInterval: number = 50; // ms between sounds to prevent spam

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.warn('Web Audio API not supported');
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Play a collision sound
   * @param material The material type hit
   * @param intensity 0-1 how hard the collision was
   */
  play(material: CollisionMaterial, intensity: number = 0.5): void {
    // Throttle rapid sounds
    const now = performance.now();
    if (now - this.lastPlayTime < this.minInterval) return;
    this.lastPlayTime = now;

    const ctx = this.ensureContext();
    if (!ctx) return;

    // Clamp intensity
    intensity = Math.max(0.1, Math.min(1, intensity));

    switch (material) {
      case 'wall':
      case 'stone':
        this.playStoneSound(ctx, intensity);
        break;
      case 'ceramic':
        this.playCeramicSound(ctx, intensity);
        break;
      case 'wood':
        this.playWoodSound(ctx, intensity);
        break;
      case 'metal':
        this.playMetalSound(ctx, intensity);
        break;
      case 'cloth':
        this.playClothSound(ctx, intensity);
        break;
    }
  }

  private playStoneSound(ctx: AudioContext, intensity: number): void {
    const now = ctx.currentTime;
    const volume = 0.15 * intensity;

    // Deep thud with noise burst
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.15);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Lowpass filter for deep thud
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200 + intensity * 100;
    filter.Q.value = 1;

    // Quick envelope
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(volume, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Low tone component
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 60 + intensity * 20;

    const oscEnvelope = ctx.createGain();
    oscEnvelope.gain.setValueAtTime(volume * 0.8, now);
    oscEnvelope.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    // Simple reverb via delay
    const delay = ctx.createDelay();
    delay.delayTime.value = 0.03;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.3;

    // Connect
    noise.connect(filter);
    filter.connect(envelope);
    envelope.connect(ctx.destination);
    envelope.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    osc.connect(oscEnvelope);
    oscEnvelope.connect(ctx.destination);

    noise.start(now);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playCeramicSound(ctx: AudioContext, intensity: number): void {
    const now = ctx.currentTime;
    const volume = 0.12 * intensity;

    // Hollow resonant sound - multiple partials
    const frequencies = [280, 520, 890];
    const decays = [0.15, 0.12, 0.08];

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq * (0.95 + Math.random() * 0.1);

      const envelope = ctx.createGain();
      envelope.gain.setValueAtTime(volume / (i + 1), now);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + decays[i]);

      // Bandpass for hollow character
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      filter.Q.value = 8;

      osc.connect(filter);
      filter.connect(envelope);
      envelope.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + decays[i] + 0.01);
    });

    // Click transient
    const click = ctx.createOscillator();
    click.type = 'sine';
    click.frequency.value = 1200;

    const clickEnv = ctx.createGain();
    clickEnv.gain.setValueAtTime(volume * 0.5, now);
    clickEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    click.connect(clickEnv);
    clickEnv.connect(ctx.destination);
    click.start(now);
    click.stop(now + 0.03);
  }

  private playWoodSound(ctx: AudioContext, intensity: number): void {
    const now = ctx.currentTime;
    const volume = 0.15 * intensity;

    // Warm knock with body resonance
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.08);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Bandpass for woody character
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400 + intensity * 200;
    filter.Q.value = 2;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(volume, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    // Body resonance
    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.value = 150 + intensity * 50;

    const bodyEnv = ctx.createGain();
    bodyEnv.gain.setValueAtTime(volume * 0.6, now);
    bodyEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    // Mid resonance
    const midOsc = ctx.createOscillator();
    midOsc.type = 'sine';
    midOsc.frequency.value = 350;

    const midEnv = ctx.createGain();
    midEnv.gain.setValueAtTime(volume * 0.3, now);
    midEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Connect
    noise.connect(filter);
    filter.connect(envelope);
    envelope.connect(ctx.destination);

    bodyOsc.connect(bodyEnv);
    bodyEnv.connect(ctx.destination);

    midOsc.connect(midEnv);
    midEnv.connect(ctx.destination);

    noise.start(now);
    bodyOsc.start(now);
    midOsc.start(now);
    bodyOsc.stop(now + 0.2);
    midOsc.stop(now + 0.1);
  }

  private playMetalSound(ctx: AudioContext, intensity: number): void {
    const now = ctx.currentTime;
    const volume = 0.1 * intensity;

    // Bright ring with inharmonic partials (like a bell)
    const partials = [1, 2.4, 3.8, 5.1, 6.8];
    const baseFreq = 400 + intensity * 200;
    const decay = 0.3 + intensity * 0.2;

    partials.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = baseFreq * ratio;

      const envelope = ctx.createGain();
      const partialVolume = volume / (i + 1);
      envelope.gain.setValueAtTime(partialVolume, now);
      envelope.gain.exponentialRampToValueAtTime(0.001, now + decay / (1 + i * 0.2));

      osc.connect(envelope);
      envelope.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + decay + 0.05);
    });

    // Sharp attack transient
    const attack = ctx.createOscillator();
    attack.type = 'sawtooth';
    attack.frequency.value = 2000;

    const attackFilter = ctx.createBiquadFilter();
    attackFilter.type = 'highpass';
    attackFilter.frequency.value = 1500;

    const attackEnv = ctx.createGain();
    attackEnv.gain.setValueAtTime(volume * 0.4, now);
    attackEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    attack.connect(attackFilter);
    attackFilter.connect(attackEnv);
    attackEnv.connect(ctx.destination);

    attack.start(now);
    attack.stop(now + 0.02);
  }

  private playClothSound(ctx: AudioContext, intensity: number): void {
    const now = ctx.currentTime;
    const volume = 0.08 * intensity;

    // Soft muffled thump - just filtered noise
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.1);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    // Very low pass for muffled quality
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150 + intensity * 100;
    filter.Q.value = 0.5;

    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(volume, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(filter);
    filter.connect(envelope);
    envelope.connect(ctx.destination);

    noise.start(now);
  }

  /**
   * Play a ceramic shatter sound (for breaking pottery)
   */
  playShatter(intensity: number = 0.8): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const volume = 0.2 * intensity;

    // Multiple breaking sounds layered
    // High frequency crack
    const crack = ctx.createOscillator();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(3000, now);
    crack.frequency.exponentialRampToValueAtTime(500, now + 0.05);

    const crackEnv = ctx.createGain();
    crackEnv.gain.setValueAtTime(volume, now);
    crackEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    crack.connect(crackEnv);
    crackEnv.connect(ctx.destination);

    // Noise burst for shards
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 800;

    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(volume * 0.7, now);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnv);
    noiseEnv.connect(ctx.destination);

    // Ceramic body sound
    this.playCeramicSound(ctx, intensity * 1.2);

    crack.start(now);
    noise.start(now);
    crack.stop(now + 0.1);
  }

  /**
   * Play a wood splintering/breaking sound (for crates)
   */
  playWoodShatter(intensity: number = 0.8): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const volume = 0.22 * intensity;

    // Initial crack - sharp transient
    const crack = ctx.createOscillator();
    crack.type = 'sawtooth';
    crack.frequency.setValueAtTime(1800, now);
    crack.frequency.exponentialRampToValueAtTime(200, now + 0.06);

    const crackEnv = ctx.createGain();
    crackEnv.gain.setValueAtTime(volume * 0.9, now);
    crackEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    crack.connect(crackEnv);
    crackEnv.connect(ctx.destination);

    // Wood splintering - filtered noise with resonance
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.25);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 600;
    noiseFilter.Q.value = 1.5;

    const noiseEnv = ctx.createGain();
    noiseEnv.gain.setValueAtTime(volume * 0.6, now);
    noiseEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseEnv);
    noiseEnv.connect(ctx.destination);

    // Secondary splinter sounds - multiple small cracks
    for (let i = 0; i < 3; i++) {
      const delay = 0.02 + i * 0.04 + Math.random() * 0.02;
      const splinter = ctx.createOscillator();
      splinter.type = 'triangle';
      splinter.frequency.setValueAtTime(800 + Math.random() * 400, now + delay);
      splinter.frequency.exponentialRampToValueAtTime(150, now + delay + 0.04);

      const splinterEnv = ctx.createGain();
      splinterEnv.gain.setValueAtTime(0, now);
      splinterEnv.gain.setValueAtTime(volume * 0.3, now + delay);
      splinterEnv.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

      splinter.connect(splinterEnv);
      splinterEnv.connect(ctx.destination);
      splinter.start(now);
      splinter.stop(now + delay + 0.08);
    }

    // Low thump from impact
    const thump = ctx.createOscillator();
    thump.type = 'sine';
    thump.frequency.value = 80;

    const thumpEnv = ctx.createGain();
    thumpEnv.gain.setValueAtTime(volume * 0.7, now);
    thumpEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    thump.connect(thumpEnv);
    thumpEnv.connect(ctx.destination);

    crack.start(now);
    noise.start(now);
    thump.start(now);
    crack.stop(now + 0.12);
    thump.stop(now + 0.15);
  }

  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}

// Singleton instance
export const collisionSounds = new CollisionSoundEngine();
