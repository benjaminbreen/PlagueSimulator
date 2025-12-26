/**
 * SoundDebugPanel - Floating UI for debugging and testing audio layers
 *
 * Features:
 * - Master volume control
 * - Per-layer mute/solo/volume controls
 * - Visual indication of active layers
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Headphones, X } from 'lucide-react';
import { getAmbientSoundEngine, LayerVolumes } from './AmbientSoundEngine';

interface LayerState {
  name: string;
  displayName: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  originalVolume: number;
}

const LAYER_DISPLAY_NAMES: Record<string, string> = {
  baseDrone: 'Base Drone',
  timeLayer: 'Time of Day',
  weather: 'Weather',
  sacred: 'Sacred/Adhan',
  social: 'Social/Crowd',
  plague: 'Plague',
  biome: 'Biome',
};

const DEFAULT_VOLUMES: Record<string, number> = {
  baseDrone: 0.15,
  timeLayer: 0.12,
  weather: 0.1,
  sacred: 0.2,
  social: 0.15,
  plague: 0.08,
  biome: 0.12,
};

interface SoundDebugPanelProps {
  onClose: () => void;
}

export const SoundDebugPanel: React.FC<SoundDebugPanelProps> = ({ onClose }) => {
  const [masterVolume, setMasterVolume] = useState(0.5);
  const [layers, setLayers] = useState<LayerState[]>([]);
  const [isActive, setIsActive] = useState(false);

  // Initialize layer states
  useEffect(() => {
    const engine = getAmbientSoundEngine();
    const volumes = engine.getLayerVolumes();

    const initialLayers: LayerState[] = Object.keys(LAYER_DISPLAY_NAMES).map(name => ({
      name,
      displayName: LAYER_DISPLAY_NAMES[name],
      volume: volumes[name as keyof LayerVolumes] ?? DEFAULT_VOLUMES[name] ?? 0.1,
      muted: false,
      solo: false,
      originalVolume: volumes[name as keyof LayerVolumes] ?? DEFAULT_VOLUMES[name] ?? 0.1,
    }));

    setLayers(initialLayers);
    setMasterVolume(engine.getMasterVolume());
    setIsActive(engine.isActive());
  }, []);

  // Update engine when master volume changes
  const handleMasterVolumeChange = useCallback((value: number) => {
    setMasterVolume(value);
    const engine = getAmbientSoundEngine();
    engine.setMasterVolume(value);
  }, []);

  // Apply mute/solo logic
  const applyLayerVolumes = useCallback((updatedLayers: LayerState[]) => {
    const engine = getAmbientSoundEngine();
    const hasSolo = updatedLayers.some(l => l.solo);

    updatedLayers.forEach(layer => {
      let targetVolume = layer.volume;

      if (layer.muted) {
        targetVolume = 0;
      } else if (hasSolo && !layer.solo) {
        targetVolume = 0;
      }

      engine.setLayerVolume(layer.name as keyof LayerVolumes, targetVolume);
    });
  }, []);

  // Handle layer volume change
  const handleLayerVolumeChange = useCallback((layerName: string, value: number) => {
    setLayers(prev => {
      const updated = prev.map(l =>
        l.name === layerName ? { ...l, volume: value, originalVolume: value } : l
      );
      applyLayerVolumes(updated);
      return updated;
    });
  }, [applyLayerVolumes]);

  // Handle mute toggle
  const handleMuteToggle = useCallback((layerName: string) => {
    setLayers(prev => {
      const updated = prev.map(l =>
        l.name === layerName ? { ...l, muted: !l.muted } : l
      );
      applyLayerVolumes(updated);
      return updated;
    });
  }, [applyLayerVolumes]);

  // Handle solo toggle
  const handleSoloToggle = useCallback((layerName: string) => {
    setLayers(prev => {
      const updated = prev.map(l =>
        l.name === layerName ? { ...l, solo: !l.solo } : l
      );
      applyLayerVolumes(updated);
      return updated;
    });
  }, [applyLayerVolumes]);

  // Reset all
  const handleReset = useCallback(() => {
    const engine = getAmbientSoundEngine();

    setLayers(prev => {
      const updated = prev.map(l => ({
        ...l,
        volume: DEFAULT_VOLUMES[l.name] ?? 0.1,
        originalVolume: DEFAULT_VOLUMES[l.name] ?? 0.1,
        muted: false,
        solo: false,
      }));

      updated.forEach(layer => {
        engine.setLayerVolume(layer.name as keyof LayerVolumes, layer.volume);
      });

      return updated;
    });

    setMasterVolume(0.5);
    engine.setMasterVolume(0.5);
  }, []);

  return (
    <div className="fixed top-4 right-4 w-80 bg-black/90 border border-amber-700/50 rounded-lg shadow-xl z-[100] font-mono text-xs pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-amber-700/30 bg-amber-900/20">
        <div className="flex items-center gap-2">
          <Volume2 size={14} className="text-amber-500" />
          <span className="text-amber-400 uppercase tracking-wider font-bold">Sound Debug</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
          <button
            onClick={onClose}
            className="text-amber-500/60 hover:text-amber-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Master Volume */}
      <div className="px-3 py-2 border-b border-amber-700/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-amber-300 uppercase tracking-wider text-[10px]">Master Volume</span>
          <span className="text-amber-500">{Math.round(masterVolume * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={masterVolume}
          onChange={(e) => handleMasterVolumeChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-amber-900/50 rounded-full appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-amber-500
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>

      {/* Layer Controls */}
      <div className="px-3 py-2 space-y-1 max-h-80 overflow-y-auto">
        <div className="flex items-center justify-between text-[9px] text-amber-500/50 uppercase tracking-wider mb-2">
          <span>Layer</span>
          <div className="flex items-center gap-4">
            <span className="w-8 text-center">Mute</span>
            <span className="w-8 text-center">Solo</span>
            <span className="w-16 text-center">Volume</span>
          </div>
        </div>

        {layers.map((layer) => {
          const hasSolo = layers.some(l => l.solo);
          const isEffectivelyMuted = layer.muted || (hasSolo && !layer.solo);

          return (
            <div
              key={layer.name}
              className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors ${
                isEffectivelyMuted ? 'bg-red-900/10 opacity-50' : 'bg-amber-900/10'
              }`}
            >
              <span className={`text-[11px] ${layer.solo ? 'text-green-400 font-bold' : 'text-amber-200'}`}>
                {layer.displayName}
              </span>

              <div className="flex items-center gap-3">
                {/* Mute button */}
                <button
                  onClick={() => handleMuteToggle(layer.name)}
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                    layer.muted
                      ? 'bg-red-600 text-white'
                      : 'bg-amber-900/30 text-amber-500/60 hover:text-amber-400'
                  }`}
                  title="Mute"
                >
                  <VolumeX size={12} />
                </button>

                {/* Solo button */}
                <button
                  onClick={() => handleSoloToggle(layer.name)}
                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                    layer.solo
                      ? 'bg-green-600 text-white'
                      : 'bg-amber-900/30 text-amber-500/60 hover:text-amber-400'
                  }`}
                  title="Solo"
                >
                  <Headphones size={12} />
                </button>

                {/* Volume slider */}
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={layer.volume}
                  onChange={(e) => handleLayerVolumeChange(layer.name, parseFloat(e.target.value))}
                  className="w-16 h-1 bg-amber-900/50 rounded-full appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2
                             [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-amber-500
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-amber-700/20 flex justify-between items-center">
        <span className="text-[9px] text-amber-500/40">
          {layers.filter(l => l.solo).length > 0 && (
            <span className="text-green-400">SOLO MODE</span>
          )}
          {layers.filter(l => l.muted).length > 0 && !layers.some(l => l.solo) && (
            <span className="text-red-400">{layers.filter(l => l.muted).length} MUTED</span>
          )}
        </span>
        <button
          onClick={handleReset}
          className="text-[10px] text-amber-500/60 hover:text-amber-400 uppercase tracking-wider transition-colors"
        >
          Reset All
        </button>
      </div>
    </div>
  );
};

export default SoundDebugPanel;
