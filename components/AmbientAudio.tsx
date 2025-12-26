/**
 * AmbientAudio - React component wrapper for the ambient sound system
 *
 * Integrates the AmbientSoundEngine with the simulation state.
 * Also manages SpatialAudioManager for 3D positioned point sources.
 * Handles initialization, updates, and cleanup.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AmbientSoundEngine,
  getAmbientSoundEngine,
  disposeAmbientSoundEngine,
  AmbientState,
  WeatherType,
} from './audio/AmbientSoundEngine';
import {
  SpatialAudioManager,
  getSpatialAudioManager,
  disposeSpatialAudioManager,
  PointSourceType,
} from './audio/SpatialAudioManager';
import { BaseDroneLayer } from './audio/layers/BaseDrone';
import { TimeLayer } from './audio/layers/TimeLayer';
import { WeatherLayer } from './audio/layers/WeatherLayer';
import { SacredLayer } from './audio/layers/SacredLayer';
import { SocialLayer } from './audio/layers/SocialLayer';
import { PlagueLayer } from './audio/layers/PlagueLayer';
import { BiomeLayer } from './audio/layers/BiomeLayer';
import { DistrictType, getDistrictType } from '../types';

// Spatial audio point source definition
export interface SpatialSource {
  id: string;
  type: PointSourceType;
  position: [number, number, number];
}

export interface AmbientAudioProps {
  // Simulation state
  timeOfDay: number;
  mapX: number;
  mapY: number;
  weatherType: WeatherType;
  windDirection: number;
  windStrength: number;
  humidity: number;
  activeNpcCount: number;
  avgPanic: number;
  avgAwareness: number;
  sceneMode: 'outdoor' | 'interior';
  playerPosition: [number, number, number];
  nearbyInfected: number;
  nearbyDeceased: number;

  // Spatial audio point sources (fountains, wells, etc.)
  spatialSources?: SpatialSource[];

  // Controls
  enabled?: boolean;
  masterVolume?: number;
}

export const AmbientAudio: React.FC<AmbientAudioProps> = ({
  timeOfDay,
  mapX,
  mapY,
  weatherType,
  windDirection,
  windStrength,
  humidity,
  activeNpcCount,
  avgPanic,
  avgAwareness,
  sceneMode,
  playerPosition,
  nearbyInfected,
  nearbyDeceased,
  spatialSources = [],
  enabled = true,
  masterVolume = 0.5,
}) => {
  const engineRef = useRef<AmbientSoundEngine | null>(null);
  const spatialRef = useRef<SpatialAudioManager | null>(null);
  const isInitializedRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const lastSourcesRef = useRef<string>('');

  // Initialize engine on user interaction
  const initializeAudio = useCallback(async () => {
    if (isInitializedRef.current) return;

    const engine = getAmbientSoundEngine();
    await engine.initialize();

    const ctx = engine.getContext();
    if (!ctx) {
      console.warn('[AmbientAudio] Failed to get audio context');
      return;
    }

    // Register all layers
    engine.registerLayer(new BaseDroneLayer(ctx));
    engine.registerLayer(new TimeLayer(ctx));
    // WeatherLayer disabled - wind/gust sounds were too intrusive
    // engine.registerLayer(new WeatherLayer(ctx));
    engine.registerLayer(new SacredLayer(ctx));
    engine.registerLayer(new SocialLayer(ctx));
    engine.registerLayer(new PlagueLayer(ctx));
    // BiomeLayer disabled - kept for future use/testing via Settings preview
    // engine.registerLayer(new BiomeLayer(ctx));

    engine.setMasterVolume(masterVolume);
    engine.start();

    // Initialize spatial audio manager (shares the same AudioContext)
    const spatial = getSpatialAudioManager();
    await spatial.initialize(ctx);
    spatial.setMasterVolume(masterVolume * 0.8); // Slightly lower for spatial
    spatial.start();

    engineRef.current = engine;
    spatialRef.current = spatial;
    isInitializedRef.current = true;

    console.log('[AmbientAudio] Initialized ambient engine and spatial audio');
  }, [masterVolume]);

  // Handle click to initialize (browsers require user interaction)
  useEffect(() => {
    const handleClick = () => {
      const now = Date.now();
      // Debounce
      if (now - lastClickTimeRef.current < 1000) return;
      lastClickTimeRef.current = now;

      if (enabled && !isInitializedRef.current) {
        initializeAudio();
      }
    };

    // Also try on key press
    const handleKey = () => {
      if (enabled && !isInitializedRef.current) {
        initializeAudio();
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKey);

    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [enabled, initializeAudio]);

  // Handle enabled state changes
  useEffect(() => {
    const engine = engineRef.current;
    const spatial = spatialRef.current;
    if (!engine) return;

    if (enabled && !engine.isActive()) {
      engine.start();
      spatial?.start();
    } else if (!enabled && engine.isActive()) {
      engine.stop();
      spatial?.stop();
    }
  }, [enabled]);

  // Handle master volume changes
  useEffect(() => {
    const engine = engineRef.current;
    const spatial = spatialRef.current;
    if (engine) {
      engine.setMasterVolume(masterVolume);
    }
    if (spatial) {
      spatial.setMasterVolume(masterVolume * 0.8);
    }
  }, [masterVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeAmbientSoundEngine();
      disposeSpatialAudioManager();
      engineRef.current = null;
      spatialRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);

  // Register/unregister spatial sources when they change
  useEffect(() => {
    const spatial = spatialRef.current;
    if (!spatial) return;

    // Create a key for comparison
    const sourcesKey = spatialSources.map(s => `${s.id}:${s.type}:${s.position.join(',')}`).join('|');

    // Skip if unchanged
    if (sourcesKey === lastSourcesRef.current) return;
    lastSourcesRef.current = sourcesKey;

    // Get currently registered source IDs
    const currentIds = new Set(spatial.getRegisteredSourceIds());
    const newIds = new Set(spatialSources.map(s => s.id));

    // Unregister sources that are no longer in the list
    for (const id of currentIds) {
      if (!newIds.has(id)) {
        spatial.unregisterSource(id);
      }
    }

    // Register new sources
    for (const source of spatialSources) {
      if (!currentIds.has(source.id)) {
        spatial.registerSource(source.id, source.type, source.position);
      }
    }
  }, [spatialSources]);

  // Update engine with simulation state each frame
  useFrame((_, delta) => {
    const engine = engineRef.current;
    const spatial = spatialRef.current;
    const deltaMs = delta * 1000;

    // Update ambient sound engine
    if (engine && engine.isActive()) {
      const district = getDistrictType(mapX, mapY);

      const state: AmbientState = {
        timeOfDay,
        district,
        weather: weatherType,
        windDirection,
        windStrength,
        humidity,
        activeNpcCount,
        avgPanic,
        avgAwareness,
        sceneMode,
        playerPosition,
        nearbyInfected,
        nearbyDeceased,
        isInteriorOpen: sceneMode === 'interior',
      };

      engine.update(state, deltaMs);
    }

    // Update spatial audio manager
    if (spatial && spatial.isActive()) {
      spatial.updateListenerPosition(playerPosition);
      spatial.update(deltaMs);
    }
  });

  // This component doesn't render anything
  return null;
};

// Hook for external control of ambient audio
export function useAmbientAudio() {
  const engine = getAmbientSoundEngine();

  return {
    setMasterVolume: (volume: number) => engine.setMasterVolume(volume),
    getMasterVolume: () => engine.getMasterVolume(),
    getLayerVolumes: () => engine.getLayerVolumes(),
    setLayerVolume: (layer: string, volume: number) => {
      engine.setLayerVolume(layer as any, volume);
    },
    isActive: () => engine.isActive(),
    start: () => engine.start(),
    stop: () => engine.stop(),
  };
}

export default AmbientAudio;
