/**
 * AmbientAudio - React component wrapper for the ambient sound system
 *
 * Integrates the AmbientSoundEngine with the simulation state.
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
import { BaseDroneLayer } from './audio/layers/BaseDrone';
import { TimeLayer } from './audio/layers/TimeLayer';
import { WeatherLayer } from './audio/layers/WeatherLayer';
import { SacredLayer } from './audio/layers/SacredLayer';
import { SocialLayer } from './audio/layers/SocialLayer';
import { PlagueLayer } from './audio/layers/PlagueLayer';
import { DistrictType, getDistrictType } from '../types';

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
  enabled = true,
  masterVolume = 0.5,
}) => {
  const engineRef = useRef<AmbientSoundEngine | null>(null);
  const isInitializedRef = useRef(false);
  const lastClickTimeRef = useRef(0);

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
    engine.registerLayer(new WeatherLayer(ctx));
    engine.registerLayer(new SacredLayer(ctx));
    engine.registerLayer(new SocialLayer(ctx));
    engine.registerLayer(new PlagueLayer(ctx));

    engine.setMasterVolume(masterVolume);
    engine.start();

    engineRef.current = engine;
    isInitializedRef.current = true;

    console.log('[AmbientAudio] Initialized and started');
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
    if (!engine) return;

    if (enabled && !engine.isActive()) {
      engine.start();
    } else if (!enabled && engine.isActive()) {
      engine.stop();
    }
  }, [enabled]);

  // Handle master volume changes
  useEffect(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.setMasterVolume(masterVolume);
    }
  }, [masterVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disposeAmbientSoundEngine();
      engineRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);

  // Update engine with simulation state each frame
  useFrame((_, delta) => {
    const engine = engineRef.current;
    if (!engine || !engine.isActive()) return;

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

    engine.update(state, delta * 1000); // Convert to ms
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
