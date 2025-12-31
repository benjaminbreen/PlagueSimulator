/**
 * SpatialAudioManager - 3D positioned audio for point sources
 *
 * Uses Web Audio API's PannerNode for HRTF-based spatial audio.
 * Efficiently manages point sources with distance culling.
 *
 * Point source types:
 * - water: Wells, fountains (continuous ambient)
 * - mosque: Religious buildings (periodic adhan echoes)
 * - market: Commercial areas (activity sounds)
 * - fire: Torches, hearths (crackling)
 * - bird: Birdcage chirps (short tonal blips)
 */

import { getSharedNoiseBuffer } from './synthesis/NoiseGenerators';

export type PointSourceType = 'water' | 'mosque' | 'market' | 'fire' | 'bird';

export interface PointSource {
  id: string;
  type: PointSourceType;
  position: [number, number, number];
  maxDistance: number;
  volume: number;
  active: boolean;
}

interface ActiveSource {
  source: PointSource;
  panner: PannerNode;
  gain: GainNode;
  audioNodes: AudioNode[];
  isPlaying: boolean;
  lastDistance: number;
}

// Default configs per source type
const SOURCE_CONFIGS: Record<PointSourceType, { maxDistance: number; volume: number }> = {
  water: { maxDistance: 20, volume: 0.15 },
  mosque: { maxDistance: 50, volume: 0.1 },
  market: { maxDistance: 25, volume: 0.08 },
  fire: { maxDistance: 12, volume: 0.06 },
  bird: { maxDistance: 16, volume: 0.07 },
};

export class SpatialAudioManager {
  private ctx: AudioContext | null = null;
  private listener: AudioListener | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume: number = 0.4;

  // All registered point sources
  private sources: Map<string, PointSource> = new Map();

  // Currently active (audible) sources with their audio nodes
  private activeSources: Map<string, ActiveSource> = new Map();

  // Player position
  private listenerPosition: [number, number, number] = [0, 0, 0];

  // Performance: culling distance and update throttling
  private readonly CULL_DISTANCE = 60;
  private readonly UPDATE_INTERVAL = 100; // ms
  private lastUpdateTime: number = 0;

  // Shared noise buffer for synthesis
  private noiseBuffer: AudioBuffer | null = null;

  // Running state
  private isRunning: boolean = false;

  constructor() {
    // Lazy initialization
  }

  /**
   * Initialize the spatial audio system
   * Must be called after user interaction (browser requirement)
   */
  async initialize(existingContext?: AudioContext): Promise<void> {
    if (this.ctx) return;

    this.ctx = existingContext || new AudioContext();

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    // Get the listener
    this.listener = this.ctx.listener;

    // Set initial listener orientation (looking down -Z axis, up is Y)
    if (this.listener.forwardX) {
      // Modern API
      this.listener.forwardX.value = 0;
      this.listener.forwardY.value = 0;
      this.listener.forwardZ.value = -1;
      this.listener.upX.value = 0;
      this.listener.upY.value = 1;
      this.listener.upZ.value = 0;
    } else {
      // Legacy API
      this.listener.setOrientation(0, 0, -1, 0, 1, 0);
    }

    // Master output
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;
    this.masterGain.connect(this.ctx.destination);

    // Create noise buffer for water/fire synthesis
    this.noiseBuffer = getSharedNoiseBuffer(this.ctx);

    console.log('[SpatialAudioManager] Initialized');
  }

  /**
   * Register a point source
   */
  registerSource(
    id: string,
    type: PointSourceType,
    position: [number, number, number],
    options?: { maxDistance?: number; volume?: number }
  ): void {
    const config = SOURCE_CONFIGS[type];
    const source: PointSource = {
      id,
      type,
      position,
      maxDistance: options?.maxDistance ?? config.maxDistance,
      volume: options?.volume ?? config.volume,
      active: true,
    };

    this.sources.set(id, source);
  }

  /**
   * Register multiple sources at once (for bulk building registration)
   */
  registerSources(sources: Array<{ id: string; type: PointSourceType; position: [number, number, number] }>): void {
    sources.forEach(s => this.registerSource(s.id, s.type, s.position));
  }

  /**
   * Remove a point source
   */
  unregisterSource(id: string): void {
    this.sources.delete(id);
    this.stopSource(id);
  }

  /**
   * Clear all sources
   */
  clearSources(): void {
    this.activeSources.forEach((_, id) => this.stopSource(id));
    this.sources.clear();
  }

  /**
   * Update listener position (call from useFrame)
   */
  updateListenerPosition(position: [number, number, number]): void {
    this.listenerPosition = position;

    if (!this.ctx || !this.listener) return;

    // Update Web Audio listener position
    if (this.listener.positionX) {
      // Modern API
      this.listener.positionX.value = position[0];
      this.listener.positionY.value = position[1];
      this.listener.positionZ.value = position[2];
    } else {
      // Legacy API
      this.listener.setPosition(position[0], position[1], position[2]);
    }
  }

  /**
   * Main update loop - call from useFrame with deltaMs
   */
  update(deltaMs: number): void {
    if (!this.isRunning || !this.ctx) return;

    // Throttle updates
    this.lastUpdateTime += deltaMs;
    if (this.lastUpdateTime < this.UPDATE_INTERVAL) return;
    this.lastUpdateTime = 0;

    // Update all sources based on distance
    this.sources.forEach((source, id) => {
      if (!source.active) return;

      const distance = this.getDistance(source.position);

      // Distance culling
      if (distance > this.CULL_DISTANCE) {
        // Too far - stop if playing
        if (this.activeSources.has(id)) {
          this.stopSource(id);
        }
        return;
      }

      // Within range - start if not playing
      if (!this.activeSources.has(id)) {
        this.startSource(source);
      }

      // Update volume based on distance
      const activeSource = this.activeSources.get(id);
      if (activeSource) {
        this.updateSourceVolume(activeSource, distance);
      }
    });
  }

  /**
   * Start the spatial audio system
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, this.ctx.currentTime + 1);
    }

    console.log('[SpatialAudioManager] Started');
  }

  /**
   * Stop the spatial audio system
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    // Fade out
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
    }

    // Stop all active sources after fade
    setTimeout(() => {
      this.activeSources.forEach((_, id) => this.stopSource(id));
    }, 500);

    console.log('[SpatialAudioManager] Stopped');
  }

  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.1);
    }
  }

  /**
   * Get stats for debugging
   */
  getStats(): { registered: number; active: number; listenerPos: [number, number, number] } {
    return {
      registered: this.sources.size,
      active: this.activeSources.size,
      listenerPos: this.listenerPosition,
    };
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get all registered source IDs
   */
  getRegisteredSourceIds(): string[] {
    return Array.from(this.sources.keys());
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
    this.clearSources();

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    // Don't close ctx if it was passed in externally
    this.ctx = null;
    this.listener = null;
  }

  // ==================== PRIVATE METHODS ====================

  private getDistance(position: [number, number, number]): number {
    const dx = position[0] - this.listenerPosition[0];
    const dy = position[1] - this.listenerPosition[1];
    const dz = position[2] - this.listenerPosition[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private startSource(source: PointSource): void {
    if (!this.ctx || !this.masterGain) return;

    // Create panner for 3D positioning
    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.maxDistance = source.maxDistance;
    panner.rolloffFactor = 1;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 0;

    // Set position
    if (panner.positionX) {
      panner.positionX.value = source.position[0];
      panner.positionY.value = source.position[1];
      panner.positionZ.value = source.position[2];
    } else {
      panner.setPosition(source.position[0], source.position[1], source.position[2]);
    }

    // Create gain for volume control
    const gain = this.ctx.createGain();
    gain.gain.value = 0; // Start silent, will be updated

    // Connect: source -> panner -> gain -> master
    panner.connect(gain);
    gain.connect(this.masterGain);

    // Create audio nodes based on source type
    const audioNodes = this.createSourceAudio(source.type, panner);

    const activeSource: ActiveSource = {
      source,
      panner,
      gain,
      audioNodes,
      isPlaying: true,
      lastDistance: this.getDistance(source.position),
    };

    this.activeSources.set(source.id, activeSource);
  }

  private stopSource(id: string): void {
    const active = this.activeSources.get(id);
    if (!active) return;

    // Fade out
    if (this.ctx) {
      active.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
    }

    // Cleanup after fade
    setTimeout(() => {
      active.audioNodes.forEach(node => {
        try {
          if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
            (node as OscillatorNode).stop();
          }
          node.disconnect();
        } catch {}
      });
      active.panner.disconnect();
      active.gain.disconnect();
    }, 300);

    this.activeSources.delete(id);
  }

  private updateSourceVolume(active: ActiveSource, distance: number): void {
    if (!this.ctx) return;

    // Calculate volume based on distance (inverse falloff)
    const normalizedDist = Math.min(distance / active.source.maxDistance, 1);
    const distanceVolume = 1 - Math.pow(normalizedDist, 0.5); // Smooth falloff
    const targetVolume = active.source.volume * distanceVolume;

    active.gain.gain.setTargetAtTime(targetVolume, this.ctx.currentTime, 0.1);
    active.lastDistance = distance;
  }

  private createSourceAudio(type: PointSourceType, destination: AudioNode): AudioNode[] {
    if (!this.ctx || !this.noiseBuffer) return [];

    switch (type) {
      case 'water':
        return this.createWaterSound(destination);
      case 'fire':
        return this.createFireSound(destination);
      case 'mosque':
        return this.createMosqueAmbient(destination);
      case 'market':
        return this.createMarketAmbient(destination);
      case 'bird':
        return this.createBirdChirps(destination);
      default:
        return [];
    }
  }

  /**
   * Water sound - filtered noise with drips
   */
  private createWaterSound(destination: AudioNode): AudioNode[] {
    if (!this.ctx || !this.noiseBuffer) return [];

    const nodes: AudioNode[] = [];

    // Base water noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    // Bandpass for water character
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.6;

    // LFO for subtle variation
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.8;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 400;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // Volume control
    const vol = this.ctx.createGain();
    vol.gain.value = 0.6;

    noise.connect(filter);
    filter.connect(vol);
    vol.connect(destination);

    noise.start();
    lfo.start();

    nodes.push(noise, filter, lfo, lfoGain, vol);

    // Schedule random drips
    this.scheduleDrips(destination, nodes);

    return nodes;
  }

  private scheduleDrips(destination: AudioNode, nodes: AudioNode[]): void {
    if (!this.ctx || !this.isRunning) return;

    const scheduleDrip = () => {
      if (!this.ctx || !this.isRunning) return;

      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      osc.frequency.setValueAtTime(1800 + Math.random() * 800, now);
      osc.frequency.exponentialRampToValueAtTime(500, now + 0.06);
      osc.type = 'sine';

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 0.1);

      // Schedule next drip
      const nextDelay = 500 + Math.random() * 1500;
      setTimeout(scheduleDrip, nextDelay);
    };

    // Initial delay
    setTimeout(scheduleDrip, Math.random() * 1000);
  }

  /**
   * Bird chirps - short tonal blips at random intervals
   */
  private createBirdChirps(destination: AudioNode): AudioNode[] {
    if (!this.ctx) return [];

    const nodes: AudioNode[] = [];

    const scheduleChirp = () => {
      if (!this.ctx || !this.isRunning) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      const base = 1900 + Math.random() * 900;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 0.7, now + 0.15);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(now);
      osc.stop(now + 0.2);

      const nextDelay = 700 + Math.random() * 1600;
      setTimeout(scheduleChirp, nextDelay);
    };

    setTimeout(scheduleChirp, Math.random() * 1200);

    return nodes;
  }

  /**
   * Fire/torch sound - crackling filtered noise
   */
  private createFireSound(destination: AudioNode): AudioNode[] {
    if (!this.ctx || !this.noiseBuffer) return [];

    const nodes: AudioNode[] = [];

    // Crackling noise
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    // Bandpass for fire character
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 800;
    filter.Q.value = 1;

    // Random modulation for crackling
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 8;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.3;

    // Volume with modulation
    const vol = this.ctx.createGain();
    vol.gain.value = 0.4;
    lfo.connect(lfoGain);
    lfoGain.connect(vol.gain);

    noise.connect(filter);
    filter.connect(vol);
    vol.connect(destination);

    noise.start();
    lfo.start();

    nodes.push(noise, filter, lfo, lfoGain, vol);

    return nodes;
  }

  /**
   * Mosque ambient - subtle sacred drone
   */
  private createMosqueAmbient(destination: AudioNode): AudioNode[] {
    if (!this.ctx) return [];

    const nodes: AudioNode[] = [];

    // Low sacred drone
    const osc1 = this.ctx.createOscillator();
    osc1.frequency.value = 110;
    osc1.type = 'sine';

    const osc2 = this.ctx.createOscillator();
    osc2.frequency.value = 165; // Fifth
    osc2.type = 'sine';

    // Slow LFO
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 5;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);

    // Filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const vol = this.ctx.createGain();
    vol.gain.value = 0.3;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(vol);
    vol.connect(destination);

    osc1.start();
    osc2.start();
    lfo.start();

    nodes.push(osc1, osc2, lfo, lfoGain, filter, vol);

    return nodes;
  }

  /**
   * Market ambient - subtle activity murmur
   */
  private createMarketAmbient(destination: AudioNode): AudioNode[] {
    if (!this.ctx || !this.noiseBuffer) return [];

    const nodes: AudioNode[] = [];

    // Low murmur
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    // Voice-like formant
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.8;

    // Slow modulation
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.3;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.15;

    const vol = this.ctx.createGain();
    vol.gain.value = 0.5;
    lfo.connect(lfoGain);
    lfoGain.connect(vol.gain);

    noise.connect(filter);
    filter.connect(vol);
    vol.connect(destination);

    noise.start();
    lfo.start();

    nodes.push(noise, filter, lfo, lfoGain, vol);

    return nodes;
  }
}

// Singleton instance
let spatialManagerInstance: SpatialAudioManager | null = null;

export function getSpatialAudioManager(): SpatialAudioManager {
  if (!spatialManagerInstance) {
    spatialManagerInstance = new SpatialAudioManager();
  }
  return spatialManagerInstance;
}

export function disposeSpatialAudioManager(): void {
  if (spatialManagerInstance) {
    spatialManagerInstance.dispose();
    spatialManagerInstance = null;
  }
}
