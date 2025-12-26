/**
 * AmbientSoundEngine - Core orchestrator for all ambient audio layers
 *
 * Manages layered procedural audio that responds to:
 * - Time of day
 * - District/location
 * - Weather conditions
 * - NPC density and panic levels
 * - Plague severity
 * - Interior/exterior state
 */

import { DistrictType } from '../../types';

// Weather types (matches Simulation.tsx)
export type WeatherType = 'CLEAR' | 'OVERCAST' | 'SANDSTORM';

// Scene mode
export type SceneMode = 'outdoor' | 'interior';

// Full ambient state passed to the engine each frame
export interface AmbientState {
  timeOfDay: number;           // 0-24
  district: DistrictType;
  weather: WeatherType;
  windDirection: number;       // radians
  windStrength: number;        // 0-1
  humidity: number;            // 0-1
  activeNpcCount: number;      // Number of active NPCs nearby
  avgPanic: number;            // 0-100 average panic level
  avgAwareness: number;        // 0-100 average plague awareness
  sceneMode: SceneMode;
  playerPosition: [number, number, number];
  nearbyInfected: number;      // Count within proximity
  nearbyDeceased: number;      // Count within proximity
  isInteriorOpen: boolean;     // Is player in an interior
}

// Individual layer interface
export interface SoundLayer {
  name: string;
  update(state: AmbientState, delta: number): void;
  setVolume(volume: number): void;
  start(): void;
  stop(): void;
  connect(destination: AudioNode): void;
  getOutput(): AudioNode;
}

// Layer volume presets
export interface LayerVolumes {
  baseDrone: number;
  timeLayer: number;
  weather: number;
  sacred: number;
  social: number;
  plague: number;
}

const DEFAULT_VOLUMES: LayerVolumes = {
  baseDrone: 0.15,
  timeLayer: 0.12,
  weather: 0.1,
  sacred: 0.2,
  social: 0.15,
  plague: 0.08,
};

export class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterVolume: number = 0.5;
  private isRunning: boolean = false;
  private layers: Map<string, SoundLayer> = new Map();
  private layerVolumes: LayerVolumes = { ...DEFAULT_VOLUMES };
  private lastState: AmbientState | null = null;
  private updateThrottle: number = 0;
  private readonly UPDATE_INTERVAL = 100; // ms between updates

  constructor() {
    // AudioContext created lazily on first user interaction
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.ctx) return;

    try {
      this.ctx = new AudioContext();

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0; // Start silent
      this.masterGain.connect(this.ctx.destination);

      console.log('[AmbientSoundEngine] Initialized');
    } catch (error) {
      console.error('[AmbientSoundEngine] Failed to initialize:', error);
    }
  }

  /**
   * Register a sound layer
   */
  registerLayer(layer: SoundLayer): void {
    if (!this.ctx || !this.masterGain) {
      console.warn('[AmbientSoundEngine] Cannot register layer before initialization');
      return;
    }

    this.layers.set(layer.name, layer);
    layer.connect(this.masterGain);
    console.log(`[AmbientSoundEngine] Registered layer: ${layer.name}`);
  }

  /**
   * Start all layers
   */
  start(): void {
    if (!this.ctx || this.isRunning) return;

    this.isRunning = true;

    // Resume context if needed
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Start all layers
    this.layers.forEach((layer) => layer.start());

    // Fade in master volume
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(
        this.masterVolume,
        this.ctx.currentTime + 2
      );
    }

    console.log('[AmbientSoundEngine] Started');
  }

  /**
   * Stop all layers
   */
  stop(): void {
    if (!this.ctx || !this.isRunning) return;

    this.isRunning = false;

    // Fade out master volume
    if (this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 1);
    }

    // Stop all layers after fadeout
    setTimeout(() => {
      this.layers.forEach((layer) => layer.stop());
    }, 1100);

    console.log('[AmbientSoundEngine] Stopped');
  }

  /**
   * Update all layers with current state
   * Called from useFrame - throttled internally
   */
  update(state: AmbientState, deltaMs: number): void {
    if (!this.isRunning || !this.ctx) return;

    // Throttle updates
    this.updateThrottle += deltaMs;
    if (this.updateThrottle < this.UPDATE_INTERVAL) return;
    this.updateThrottle = 0;

    // Store last state for reference
    this.lastState = state;

    // Update each layer
    const delta = this.UPDATE_INTERVAL / 1000;
    this.layers.forEach((layer) => {
      try {
        layer.update(state, delta);
      } catch (error) {
        console.warn(`[AmbientSoundEngine] Layer ${layer.name} update failed:`, error);
      }
    });
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));

    if (this.masterGain && this.ctx && this.isRunning) {
      this.masterGain.gain.setTargetAtTime(
        this.masterVolume,
        this.ctx.currentTime,
        0.1
      );
    }
  }

  /**
   * Set individual layer volume
   */
  setLayerVolume(layerName: keyof LayerVolumes, volume: number): void {
    this.layerVolumes[layerName] = Math.max(0, Math.min(1, volume));

    const layer = this.layers.get(layerName);
    if (layer) {
      layer.setVolume(this.layerVolumes[layerName]);
    }
  }

  /**
   * Get AudioContext for layer creation
   */
  getContext(): AudioContext | null {
    return this.ctx;
  }

  /**
   * Check if engine is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();

    this.layers.forEach((layer) => {
      try {
        layer.stop();
      } catch {}
    });
    this.layers.clear();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }

    this.masterGain = null;
    console.log('[AmbientSoundEngine] Disposed');
  }

  /**
   * Get layer volumes for UI
   */
  getLayerVolumes(): LayerVolumes {
    return { ...this.layerVolumes };
  }

  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }
}

// Singleton instance
let engineInstance: AmbientSoundEngine | null = null;

export function getAmbientSoundEngine(): AmbientSoundEngine {
  if (!engineInstance) {
    engineInstance = new AmbientSoundEngine();
  }
  return engineInstance;
}

export function disposeAmbientSoundEngine(): void {
  if (engineInstance) {
    engineInstance.dispose();
    engineInstance = null;
  }
}
