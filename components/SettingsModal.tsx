import React from 'react';
import { Play, Square, Volume2, X } from 'lucide-react';
import { AMBIENCE_INFO, BiomeAmbience, BiomeType } from './audio/BiomeAmbience';
import { MelodyName } from './audio/synthesis/AdhanSynth';
import { AgentState, DevSettings, NPCStats, SimulationStats, getLocationLabel } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settingsTab: 'about' | 'music' | 'dev';
  setSettingsTab: (tab: 'about' | 'music' | 'dev') => void;
  llmEventsEnabled: boolean;
  setLlmEventsEnabled: (enabled: boolean) => void;
  currentPreview: BiomeType | null;
  playPreview: (biome: BiomeType) => void;
  stopPreview: () => void;
  currentAdhanPreview: MelodyName | null;
  playAdhanPreview: (melody: MelodyName) => void;
  stopAdhanPreview: () => void;
  devSettings: DevSettings;
  setDevSettings: React.Dispatch<React.SetStateAction<DevSettings>>;
  onTriggerDebugEvent: () => void;
  lastEventNote: string | null;
  spreadRate: number | null;
  mapX: number;
  mapY: number;
  stats: SimulationStats;
  selectedNpc: { stats: NPCStats; state: AgentState } | null;
  onForceNpcState: (id: string, state: AgentState) => void;
  onForceAllNpcState: (state: AgentState) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  settingsTab,
  setSettingsTab,
  llmEventsEnabled,
  setLlmEventsEnabled,
  currentPreview,
  playPreview,
  stopPreview,
  currentAdhanPreview,
  playAdhanPreview,
  stopAdhanPreview,
  devSettings,
  setDevSettings,
  onTriggerDebugEvent,
  lastEventNote,
  spreadRate,
  mapX,
  mapY,
  stats,
  selectedNpc,
  onForceNpcState,
  onForceAllNpcState
}) => {
  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center pointer-events-auto p-6 md:p-10 animate-in fade-in zoom-in-95">
      <button
        onClick={onClose}
        className="absolute right-4 md:right-6 w-11 h-11 flex items-center justify-center rounded-full text-amber-500 hover:text-amber-400 hover:bg-white/10 transition-colors"
        style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
      >
        <X size={28} />
      </button>

      <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto bg-black/60 border border-amber-900/40 rounded-xl shadow-2xl p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-amber-900/30 pb-4">
          <div>
            <h2 className="historical-font text-3xl md:text-4xl text-amber-500 tracking-tighter">DAMASCUS 1348</h2>
            <p className="text-amber-100/50 uppercase tracking-[0.35em] text-xs mt-2">Simulated Reality Engine</p>
          </div>
          <div className="flex gap-2 bg-amber-950/40 p-1 rounded-full border border-amber-900/40">
            <button
              onClick={() => setSettingsTab('about')}
              className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${
                settingsTab === 'about' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/60 hover:text-amber-200'
              }`}
            >
              About
            </button>
            <button
              onClick={() => { stopPreview(); setSettingsTab('music'); }}
              className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-1.5 ${
                settingsTab === 'music' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/60 hover:text-amber-200'
              }`}
            >
              <Volume2 size={12} />
              Ambience
            </button>
            <button
              onClick={() => setSettingsTab('dev')}
              className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${
                settingsTab === 'dev' ? 'bg-amber-700 text-white shadow-md' : 'text-amber-200/60 hover:text-amber-200'
              }`}
            >
              Dev Panel
            </button>
          </div>
        </div>

        {settingsTab === 'about' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 text-sm text-amber-50/80 leading-relaxed">
            <div>
              <h3 className="historical-font text-amber-400 text-lg mb-4">About</h3>
              <p>In 1348, the Black Death reached Damascus from Gaza. This simulation explores infection dynamics across the city's marketplaces and quarters. Observe, intervene, and learn the patterns of spread.</p>
              <div className="mt-6 p-4 bg-amber-950/30 border border-amber-900/40 rounded-lg">
                <h4 className="text-xs font-bold text-amber-500 uppercase mb-2">Controls</h4>
                <ul className="text-[11px] space-y-1">
                  <li><span className="text-amber-200">ARROWS:</span> Move character</li>
                  <li><span className="text-amber-200">WASD:</span> Adjust camera / look</li>
                  <li><span className="text-amber-200">SHIFT:</span> Sprint</li>
                  <li><span className="text-amber-200">PAUSE:</span> Stop time & movement</li>
                </ul>
              </div>
            </div>
            <div>
              <h3 className="historical-font text-amber-400 text-lg mb-4">Simulation</h3>
              <ul className="space-y-2 list-disc pl-4">
                <li>Pathogens spread via proximity (2m contact).</li>
                <li>Incubation period: 1 simulation hour.</li>
                <li>Symptoms emerge after 2 hours.</li>
                <li>Mortality peaks at 24 hours.</li>
                <li>Rats appear when sanitation falls below 40%.</li>
              </ul>
              <div className="mt-6 p-4 bg-amber-950/30 border border-amber-900/40 rounded-lg">
                <h4 className="text-xs font-bold text-amber-500 uppercase mb-2">Event Generation</h4>
                <label className="flex items-center justify-between text-[11px] uppercase tracking-widest text-amber-200/70">
                  <span>LLM Events</span>
                  <input
                    type="checkbox"
                    checked={llmEventsEnabled}
                    onChange={(e) => setLlmEventsEnabled(e.target.checked)}
                    className="accent-amber-600"
                  />
                </label>
                <p className="text-[10px] text-amber-100/40 mt-2">
                  When off, events are fully deterministic and prewritten.
                </p>
              </div>
            </div>
          </div>
        ) : settingsTab === 'music' ? (
          <div className="mt-6 space-y-6 text-amber-50/80">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-amber-400 uppercase tracking-widest text-xs font-bold">Ambient Sounds Preview</div>
                <p className="text-[11px] text-amber-100/50 mt-1">
                  Environmental soundscapes for each district of Damascus
                </p>
              </div>
              {currentPreview && (
                <button
                  onClick={stopPreview}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 border border-red-700/50 rounded-lg text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-900/60 transition-colors"
                >
                  <Square size={10} fill="currentColor" />
                  Stop
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {(Object.keys(AMBIENCE_INFO) as BiomeType[]).map((biome) => {
                const info = AMBIENCE_INFO[biome];
                const isPlaying = currentPreview === biome;
                return (
                  <div
                    key={biome}
                    className={`p-4 rounded-lg border transition-all ${
                      isPlaying
                        ? 'bg-amber-900/30 border-amber-600/60 shadow-lg shadow-amber-900/20'
                        : 'bg-black/30 border-amber-900/30 hover:border-amber-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold uppercase tracking-wide text-sm ${
                            isPlaying ? 'text-amber-400' : 'text-amber-200'
                          }`}>
                            {info.name}
                          </h4>
                          {isPlaying && (
                            <div className="flex gap-0.5">
                              {[0, 1, 2].map((i) => (
                                <div
                                  key={i}
                                  className="w-1 bg-amber-500 rounded-full animate-pulse"
                                  style={{
                                    height: `${8 + Math.sin(Date.now() / 200 + i) * 4}px`,
                                    animationDelay: `${i * 0.15}s`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-amber-100/50 mt-1">{info.description}</p>
                      </div>
                      <button
                        onClick={() => isPlaying ? stopPreview() : playPreview(biome)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${
                          isPlaying
                            ? 'bg-amber-600 text-white hover:bg-amber-500'
                            : 'bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-800/50'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Square size={10} fill="currentColor" />
                            Stop
                          </>
                        ) : (
                          <>
                            <Play size={10} fill="currentColor" />
                            Preview
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-[10px] text-amber-100/30 italic text-center pt-4 border-t border-white/5">
              Ambient sounds synthesized in real-time using Web Audio API
            </div>

            {currentPreview && (
              <BiomeAmbience biome={currentPreview} enabled={true} volume={0.6} />
            )}

            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-amber-400 uppercase tracking-widest text-xs font-bold">
                    Sacred Instrumental Themes
                  </h3>
                  <p className="text-[10px] text-amber-100/40 mt-1">
                    Haunting melodies using authentic 14th century Middle Eastern instruments and maqam scales
                  </p>
                </div>
                {currentAdhanPreview && (
                  <button
                    onClick={stopAdhanPreview}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-900/40 border border-red-700/50 rounded-lg text-[10px] uppercase tracking-widest text-red-300 hover:bg-red-900/60 transition-colors"
                  >
                    <Square size={10} fill="currentColor" />
                    Stop
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3">
                {[
                  { melody: 'ney' as MelodyName, name: 'Ney (Reed Flute)', description: 'Breathy, mournful descent - traditional Saba maqam lament', maqam: 'Saba', instrument: 'Reed with breath noise' },
                  { melody: 'flute' as MelodyName, name: 'Smooth Flute', description: 'Joyful ascending melody with gentle ornaments - bright and flowing', maqam: 'Rast', instrument: 'Pure tone with harmonics' },
                ].map(({ melody, name, description, maqam, instrument }) => {
                  const isPlaying = currentAdhanPreview === melody;
                  return (
                    <div
                      key={melody}
                      className={`p-4 rounded-lg border transition-all ${
                        isPlaying
                          ? 'bg-emerald-900/30 border-emerald-600/60 shadow-lg shadow-emerald-900/20'
                          : 'bg-black/30 border-amber-900/30 hover:border-amber-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-bold uppercase tracking-wide text-sm ${
                              isPlaying ? 'text-emerald-400' : 'text-amber-200'
                            }`}>
                              {name}
                            </h4>
                            {isPlaying && (
                              <div className="flex gap-0.5">
                                {[0, 1, 2].map((i) => (
                                  <div
                                    key={i}
                                    className="w-1 bg-emerald-500 rounded-full animate-pulse"
                                    style={{
                                      height: `${8 + Math.sin(Date.now() / 200 + i) * 4}px`,
                                      animationDelay: `${i * 0.15}s`,
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-amber-100/50 mt-1">{description}</p>
                          <div className="flex gap-3 mt-1">
                            <p className="text-[9px] text-emerald-400/60 italic">Maqam: {maqam}</p>
                            <p className="text-[9px] text-amber-400/40 italic">{instrument}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => isPlaying ? stopAdhanPreview() : playAdhanPreview(melody)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${
                            isPlaying
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                              : 'bg-amber-900/40 border border-amber-700/50 text-amber-200 hover:bg-amber-800/50'
                          }`}
                        >
                          {isPlaying ? (
                            <>
                              <Square size={10} fill="currentColor" />
                              Stop
                            </>
                          ) : (
                            <>
                              <Play size={10} fill="currentColor" />
                              Preview
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-amber-100/30 italic text-center pt-4 border-t border-white/5 mt-4">
                Procedural synthesis of 14th century Middle Eastern instruments using authentic maqam scales
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6 text-amber-50/80">
            <div className="flex items-center justify-between">
              <div className="text-amber-400 uppercase tracking-widest text-xs font-bold">Developer Controls</div>
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                <input
                  type="checkbox"
                  checked={devSettings.enabled}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="accent-amber-600"
                />
                Enable
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-amber-400/80">Weather Override</label>
                <select
                  value={devSettings.weatherOverride}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, weatherOverride: e.target.value as DevSettings['weatherOverride'] }))}
                  className="mt-2 w-full bg-black/50 border border-amber-900/40 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="auto">Auto</option>
                  <option value="CLEAR">Clear</option>
                  <option value="OVERCAST">Overcast</option>
                  <option value="SANDSTORM">Sandstorm</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-amber-400/80">Fog Density Scale</label>
                <input
                  type="range"
                  min="0.4"
                  max="2"
                  step="0.05"
                  value={devSettings.fogDensityScale}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, fogDensityScale: parseFloat(e.target.value) }))}
                  className="mt-3 w-full accent-amber-600"
                />
                <div className="text-[10px] mt-1 text-amber-200/60">{devSettings.fogDensityScale.toFixed(2)}x</div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-amber-400/80">Cloud Cover Override</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={devSettings.cloudCoverOverride ?? 0}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, cloudCoverOverride: parseFloat(e.target.value) }))}
                  className="mt-3 w-full accent-amber-600"
                />
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-amber-200/60">{(devSettings.cloudCoverOverride ?? 0).toFixed(2)}</span>
                  <button
                    onClick={() => setDevSettings(prev => ({ ...prev, cloudCoverOverride: null }))}
                    className="uppercase tracking-widest text-amber-300/70 hover:text-amber-300"
                  >
                    Reset to Auto
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest text-amber-400/80">Humidity Override</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={devSettings.humidityOverride ?? 0}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, humidityOverride: parseFloat(e.target.value) }))}
                  className="mt-3 w-full accent-amber-600"
                />
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="text-amber-200/60">{(devSettings.humidityOverride ?? 0).toFixed(2)}</span>
                  <button
                    onClick={() => setDevSettings(prev => ({ ...prev, humidityOverride: null }))}
                    className="uppercase tracking-widest text-amber-300/70 hover:text-amber-300"
                  >
                    Reset to Auto
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px] uppercase tracking-widest">
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Perf Panel</span>
                <input
                  type="checkbox"
                  checked={devSettings.showPerfPanel}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showPerfPanel: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Hover Wireframe</span>
                <input
                  type="checkbox"
                  checked={devSettings.showHoverWireframe}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showHoverWireframe: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Shadows</span>
                <input
                  type="checkbox"
                  checked={devSettings.showShadows}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showShadows: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Clouds</span>
                <input
                  type="checkbox"
                  checked={devSettings.showClouds}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showClouds: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Fog</span>
                <input
                  type="checkbox"
                  checked={devSettings.showFog}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showFog: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Torches</span>
                <input
                  type="checkbox"
                  checked={devSettings.showTorches}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showTorches: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">NPCs</span>
                <input
                  type="checkbox"
                  checked={devSettings.showNPCs}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showNPCs: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Rats</span>
                <input
                  type="checkbox"
                  checked={devSettings.showRats}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showRats: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Miasma</span>
                <input
                  type="checkbox"
                  checked={devSettings.showMiasma}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showMiasma: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">City walls</span>
                <input
                  type="checkbox"
                  checked={devSettings.showCityWalls}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showCityWalls: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Sound Debug Panel</span>
                <input
                  type="checkbox"
                  checked={devSettings.showSoundDebug}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showSoundDebug: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-amber-300/80">Event Debug</span>
                <input
                  type="checkbox"
                  checked={devSettings.showEventDebug}
                  onChange={(e) => setDevSettings(prev => ({ ...prev, showEventDebug: e.target.checked }))}
                  className="accent-amber-600"
                />
              </label>
            </div>

            {devSettings.showEventDebug && (
              <div className="bg-black/40 border border-amber-900/40 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-bold">Event Debug</div>
                  <button
                    onClick={onTriggerDebugEvent}
                    className="px-3 py-2 rounded-md border border-amber-500/40 text-amber-200 hover:bg-amber-600/20 text-[10px] uppercase tracking-widest"
                  >
                    Trigger Event
                  </button>
                </div>
                <div className="text-[10px] text-amber-100/40 mt-2">
                  Last trigger: {lastEventNote || '—'}
                </div>
              </div>
            )}

            <div className="bg-black/40 border border-amber-900/40 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-[0.25em] text-amber-400/80 font-bold">Infection Debug</div>
                <div className="text-[9px] text-amber-100/50 text-right">
                  <div>Global: {spreadRate === null ? '—' : spreadRate.toFixed(1)} / hr</div>
                  <div className="text-amber-200/40">
                    {getLocationLabel(mapX, mapY)}: {spreadRate === null ? '—' : spreadRate.toFixed(1)} / hr
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-amber-100/70 mb-3">
                <div className="flex items-center justify-between bg-black/40 border border-amber-900/30 rounded px-2 py-1">
                  <span className="uppercase tracking-widest text-amber-400/60">Incubating</span>
                  <span className="font-mono text-amber-200">{stats.incubating}</span>
                </div>
                <div className="flex items-center justify-between bg-black/40 border border-amber-900/30 rounded px-2 py-1">
                  <span className="uppercase tracking-widest text-amber-400/60">Infected</span>
                  <span className="font-mono text-amber-200">{stats.infected}</span>
                </div>
              </div>
              <div className="text-[9px] text-amber-100/40 italic mb-2">
                {selectedNpc ? `Selected: ${selectedNpc.stats.name}` : 'Select an NPC to force state.'}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest">
                <button
                  onClick={() => selectedNpc && onForceNpcState(selectedNpc.stats.id, AgentState.HEALTHY)}
                  disabled={!selectedNpc}
                  className="px-3 py-2 rounded-md border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-40"
                >
                  Healthy
                </button>
                <button
                  onClick={() => selectedNpc && onForceNpcState(selectedNpc.stats.id, AgentState.INCUBATING)}
                  disabled={!selectedNpc}
                  className="px-3 py-2 rounded-md border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10 disabled:opacity-40"
                >
                  Incubating
                </button>
                <button
                  onClick={() => selectedNpc && onForceNpcState(selectedNpc.stats.id, AgentState.INFECTED)}
                  disabled={!selectedNpc}
                  className="px-3 py-2 rounded-md border border-red-500/40 text-red-200 hover:bg-red-500/10 disabled:opacity-40"
                >
                  Infected
                </button>
                <button
                  onClick={() => selectedNpc && onForceNpcState(selectedNpc.stats.id, AgentState.DECEASED)}
                  disabled={!selectedNpc}
                  className="px-3 py-2 rounded-md border border-gray-500/40 text-gray-200 hover:bg-gray-500/10 disabled:opacity-40"
                >
                  Deceased
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest">
                <button
                  onClick={() => onForceAllNpcState(AgentState.HEALTHY)}
                  className="px-3 py-2 rounded-md border border-emerald-500/30 text-emerald-200/90 hover:bg-emerald-500/10"
                >
                  All Healthy
                </button>
                <button
                  onClick={() => onForceAllNpcState(AgentState.INCUBATING)}
                  className="px-3 py-2 rounded-md border border-yellow-500/30 text-yellow-200/90 hover:bg-yellow-500/10"
                >
                  All Incubating
                </button>
                <button
                  onClick={() => onForceAllNpcState(AgentState.INFECTED)}
                  className="px-3 py-2 rounded-md border border-red-500/30 text-red-200/90 hover:bg-red-500/10"
                >
                  All Infected
                </button>
                <button
                  onClick={() => onForceAllNpcState(AgentState.DECEASED)}
                  className="px-3 py-2 rounded-md border border-gray-500/30 text-gray-200/90 hover:bg-gray-500/10"
                >
                  All Deceased
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center mt-10">
          <button
            onClick={onClose}
            className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-3 rounded-full historical-font tracking-widest text-lg transition-all shadow-[0_0_30px_rgba(217,119,6,0.2)]"
          >
            RETURN TO OBSERVATION
          </button>
        </div>
      </div>
    </div>
  );
};
