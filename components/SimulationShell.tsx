import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AdaptiveEvents, PerformanceMonitor } from '@react-three/drei';
import * as THREE from 'three';
import { DevSettings, InteriorSpec, PlayerStats, SimulationParams, SimulationStats, NPCRecord, BuildingInfectionState, PlayerActionEvent, NpcStateOverride } from '../types';
import { Simulation } from './Simulation';
import { InteriorScene } from './InteriorScene';

interface SimulationShellProps {
  transitioning: boolean;
  sceneMode: 'outdoor' | 'interior';
  interiorSpec: InteriorSpec | null;
  params: SimulationParams;
  stats: SimulationStats;
  devSettings: DevSettings;
  playerStats: PlayerStats;
  canvasCamera: { position: [number, number, number]; fov: number };
  canvasDpr: [number, number];
  canvasGl: { toneMappingExposure: number };
  r3fRef: React.MutableRefObject<{ camera: THREE.Camera | null; gl: THREE.WebGLRenderer | null }>;
  onClearSelectedNpc: () => void;
  onStatsUpdate: (stats: SimulationStats) => void;
  onMapChange: (dx: number, dy: number) => void;
  onNearBuilding: (building: any | null) => void;
  onBuildingsUpdate: (buildings: any[]) => void;
  onNearMerchant: (merchant: any | null) => void;
  onNearSpeakableNpc: (npc: any | null) => void;
  onNpcSelect: (npc: any | null) => void;
  onNpcUpdate: (npc: any) => void;
  selectedNpcId: string | null;
  onMinimapUpdate: (data: any | null) => void;
  onPickupPrompt: (prompt: string | null) => void;
  onClimbablePrompt: (prompt: string | null) => void;
  onClimbingStateChange: (climbing: boolean) => void;
  climbInputRef: React.MutableRefObject<'up' | 'down' | 'cancel' | null>;
  onPickupItem: (pickup: any) => void;
  onWeatherUpdate: (weather: string) => void;
  onPushCharge: (charge: number) => void;
  pushTriggerRef: React.MutableRefObject<number | null>;
  onMoraleUpdate: (morale: any) => void;
  actionEvent: PlayerActionEvent | null;
  showDemographicsOverlay: boolean;
  npcStateOverride: NpcStateOverride | null;
  npcPool: NPCRecord[];
  buildingInfection: Record<string, BuildingInfectionState>;
  onPlayerPositionUpdate: (pos: THREE.Vector3) => void;
  dossierMode: boolean;
  onPlagueExposure: (updatedPlague: any) => void;
  onNPCInitiatedEncounter: (npc: any) => void;
  onFallDamage: (fallHeight: number, fatal: boolean) => void;
  cameraViewTarget: [number, number, number] | null;
  onPlayerStartMove: () => void;
  dropRequests: import('../types').DroppedItemRequest[];
  observeMode: boolean;
  gameLoading?: boolean;
  mapEntrySpawn?: { mapX: number; mapY: number; position: [number, number, number] } | null;
  onExitInterior?: () => void;
  onNearChest?: (chest: { id: string; label: string; position: [number, number, number]; locationName: string } | null) => void;
  onShowLootModal?: (data: {
    type: 'shatter';
    sourceObjectName: string;
    items: Array<{
      itemId: string;
      itemName: string;
      rarity: 'common' | 'uncommon' | 'rare';
      category: string;
    }>;
  }) => void;
  performanceMonitor: {
    lastPerfChangeRef: React.MutableRefObject<number>;
    shadowsDisabledByPerf: React.MutableRefObject<boolean>;
    perfDebounceMs: number;
    lowFpsThreshold: number;
    setPerformanceDegraded: (v: boolean) => void;
    setIndicatorDismissed: (v: boolean) => void;
    devSettings: DevSettings;
    setDevSettings: React.Dispatch<React.SetStateAction<DevSettings>>;
  };
}

export const SimulationShell: React.FC<SimulationShellProps> = React.memo(({
  transitioning,
  sceneMode,
  interiorSpec,
  params,
  stats,
  devSettings,
  playerStats,
  canvasCamera,
  canvasDpr,
  canvasGl,
  r3fRef,
  onClearSelectedNpc,
  onStatsUpdate,
  onMapChange,
  onNearBuilding,
  onBuildingsUpdate,
  onNearMerchant,
  onNearSpeakableNpc,
  onNpcSelect,
  onNpcUpdate,
  selectedNpcId,
  onMinimapUpdate,
  onPickupPrompt,
  onClimbablePrompt,
  onClimbingStateChange,
  climbInputRef,
  onPickupItem,
  onWeatherUpdate,
  onPushCharge,
  pushTriggerRef,
  onMoraleUpdate,
  actionEvent,
  showDemographicsOverlay,
  npcStateOverride,
  npcPool,
  buildingInfection,
  onPlayerPositionUpdate,
  dossierMode,
  onPlagueExposure,
  onNPCInitiatedEncounter,
  onFallDamage,
  cameraViewTarget,
  onPlayerStartMove,
  dropRequests,
  observeMode,
  gameLoading,
  mapEntrySpawn,
  onExitInterior,
  onNearChest,
  onShowLootModal,
  performanceMonitor
}) => {
  return (
    <Canvas
      shadows
      camera={canvasCamera}
      dpr={canvasDpr}
      gl={canvasGl}
      onPointerDownCapture={onClearSelectedNpc}
      onPointerMissed={onClearSelectedNpc}
      onCreated={({ gl, camera }) => {
        gl.shadowMap.enabled = true;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        r3fRef.current = { gl, camera };
      }}
    >
      <AdaptiveEvents />
      <PerformanceMonitor
        onIncline={() => {
          const now = Date.now();
          if (now - performanceMonitor.lastPerfChangeRef.current > performanceMonitor.perfDebounceMs) {
            performanceMonitor.lastPerfChangeRef.current = now;
            performanceMonitor.setPerformanceDegraded(false);
            performanceMonitor.setIndicatorDismissed(false);
            if (performanceMonitor.shadowsDisabledByPerf.current) {
              performanceMonitor.shadowsDisabledByPerf.current = false;
              performanceMonitor.setDevSettings(prev => ({ ...prev, showShadows: true }));
            }
          }
        }}
        onDecline={() => {
          const now = Date.now();
          if (now - performanceMonitor.lastPerfChangeRef.current > performanceMonitor.perfDebounceMs) {
            performanceMonitor.lastPerfChangeRef.current = now;
            performanceMonitor.setPerformanceDegraded(true);
          }
        }}
        flipflops={5}
        onChange={({ factor, fps }) => {
          if (performanceMonitor.devSettings.enabled && performanceMonitor.devSettings.showPerfPanel) {
            console.log(`Performance: ${fps?.toFixed(1) ?? '?'} FPS, factor: ${factor.toFixed(2)}x`);
          }
          if (fps !== undefined && fps < performanceMonitor.lowFpsThreshold && performanceMonitor.devSettings.showShadows && !performanceMonitor.shadowsDisabledByPerf.current) {
            performanceMonitor.shadowsDisabledByPerf.current = true;
            performanceMonitor.setDevSettings(prev => ({ ...prev, showShadows: false }));
            performanceMonitor.setPerformanceDegraded(true);
            console.log(`[Performance] Shadows disabled due to low FPS (${fps.toFixed(1)} < ${performanceMonitor.lowFpsThreshold})`);
          }
        }}
      />

      <Suspense fallback={null}>
        {!transitioning && sceneMode === 'outdoor' && (
          <Simulation
            params={params}
            simTime={stats.simTime}
            devSettings={devSettings}
            playerStats={playerStats}
            onStatsUpdate={onStatsUpdate}
            onMapChange={onMapChange}
            onNearBuilding={onNearBuilding}
            onBuildingsUpdate={onBuildingsUpdate}
            onNearMerchant={onNearMerchant}
            onNpcSelect={onNpcSelect}
            onNpcUpdate={onNpcUpdate}
            selectedNpcId={selectedNpcId}
            onMinimapUpdate={onMinimapUpdate}
            onPickupPrompt={onPickupPrompt}
            onClimbablePrompt={onClimbablePrompt}
            onClimbingStateChange={onClimbingStateChange}
            climbInputRef={climbInputRef}
            onPickupItem={onPickupItem}
            onWeatherUpdate={onWeatherUpdate}
            onPushCharge={onPushCharge}
            pushTriggerRef={pushTriggerRef}
            onMoraleUpdate={onMoraleUpdate}
            actionEvent={actionEvent}
            showDemographicsOverlay={showDemographicsOverlay}
            npcStateOverride={npcStateOverride}
            npcPool={npcPool}
            buildingInfection={buildingInfection}
            onPlayerPositionUpdate={onPlayerPositionUpdate}
            dossierMode={dossierMode}
            onPlagueExposure={onPlagueExposure}
            onNPCInitiatedEncounter={onNPCInitiatedEncounter}
            onFallDamage={onFallDamage}
            cameraViewTarget={cameraViewTarget}
            onPlayerStartMove={onPlayerStartMove}
            dropRequests={dropRequests}
            onNearSpeakableNpc={onNearSpeakableNpc}
            observeMode={observeMode}
            gameLoading={gameLoading}
            mapEntrySpawn={mapEntrySpawn}
            onShowLootModal={onShowLootModal}
            onNearChest={onNearChest}
          />
        )}
        {!transitioning && sceneMode === 'interior' && interiorSpec && (
          <InteriorScene
            spec={interiorSpec}
            params={params}
            simTime={stats.simTime}
            playerStats={playerStats}
            onPickupPrompt={onPickupPrompt}
            onPickupItem={onPickupItem}
            onNpcSelect={onNpcSelect}
            onNpcUpdate={onNpcUpdate}
            selectedNpcId={selectedNpcId}
            showDemographicsOverlay={showDemographicsOverlay}
            npcStateOverride={npcStateOverride}
            onPlagueExposure={onPlagueExposure}
            onPlayerPositionUpdate={onPlayerPositionUpdate}
            dropRequests={dropRequests}
            observeMode={observeMode}
            onExitInterior={onExitInterior}
            onNearChest={onNearChest}
          />
        )}
      </Suspense>
    </Canvas>
  );
});

SimulationShell.displayName = 'SimulationShell';
