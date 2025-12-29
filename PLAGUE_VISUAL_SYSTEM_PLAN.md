# Plague Visual System Implementation Plan

## Overview

Integrate mourning/protective clothing features with building infection state tracking and add beautiful 3D floating markers above infected buildings.

---

## Phase 1: Building Infection State Infrastructure

### Current State ✅
- ✅ `utils/buildingInfection.ts` exists and tracks infection states
- ✅ `App.tsx` line 826 calls `updateBuildingInfections()`
- ✅ States: `'clear' | 'incubating' | 'infected' | 'deceased'`
- ✅ Decay system: infections persist 6-12 hours after NPCs leave/recover

### Required Changes

**File: `App.tsx`**
- Pass `buildingInfectionMap` to `Simulation` component
- Already computed at line 826, just needs to be passed down

**File: `components/Simulation.tsx`**
- Accept `buildingInfectionMap` prop
- Pass to `<Agents>` component
- Pass to `<InfectedBuildingMarkers>` component (new)

**File: `components/Agents.tsx`**
- Accept `buildingInfectionMap` prop
- Pass to each `<NPC>` component

**File: `components/NPC.tsx`**
- Accept `buildingInfectionMap` prop
- Pass to `<Humanoid>` component

---

## Phase 2: Mourning Clothing Integration

### Implementation: `components/Humanoid.tsx` (lines ~1698-1450)

**Add imports:**
```typescript
import { applyMourningColors } from '../utils/procedural';
import { BuildingInfectionState } from '../types';
```

**Add prop interface:**
```typescript
interface HumanoidProps {
  // ... existing props
  buildingInfectionState?: BuildingInfectionState;
  currentSimTime: number;
}
```

**Apply mourning colors (add at line ~340 where colors are computed):**
```typescript
// Get base colors from stats
let robeBase = stats.robeBaseColor ?? defaultRobe;
let robeAccent = stats.robeAccentColor ?? defaultAccent;

// Apply mourning if building has deceased residents
if (buildingInfectionState?.status === 'deceased') {
  const hoursSinceDeath = currentSimTime - buildingInfectionState.lastSeenSimTime;
  const daysSinceDeath = hoursSinceDeath / 24;

  // Mourning intensity fades over 14 days (historical: 3-40 days depending on relation)
  const mourningIntensity = Math.max(0, Math.min(1, 1.0 - daysSinceDeath / 14));

  if (mourningIntensity > 0.1) {
    const mourningColors = applyMourningColors(robeBase, robeAccent, mourningIntensity);
    robeBase = mourningColors.base;
    robeAccent = mourningColors.accent;
  }
}
```

**Performance**: Color interpolation only, 3 math operations per NPC. Negligible cost.

---

## Phase 3: Protective Accessories Integration

### Implementation: `utils/procedural.ts` (line ~1400 in `generateNPCStats`)

**After accessories generation (line ~1202):**
```typescript
// Existing accessory generation
const accessories = [
  rand() > 0.6 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none',
  rand() > 0.7 ? accessoryPool[Math.floor(rand() * accessoryPool.length)] : 'none'
].filter(a => a !== 'none');

// NEW: Add plague-aware protective accessories
// Note: This requires passing plague context at generation time
// OR applying it dynamically in NPC component
```

**Option A: Generation-time (static)**
- Add `awarenessLevel` to procedural generation
- Accessories baked into NPCStats at creation
- ✅ Zero runtime cost
- ❌ Can't change dynamically as plague spreads

**Option B: Runtime (dynamic)**
- Check awareness in `Humanoid.tsx` or `NPC.tsx`
- Add accessories on-the-fly based on current state
- ✅ Responds to plague progression
- ✅ Still very cheap (array concat)
- ✅ **RECOMMENDED**

**Implementation (Option B) in `NPC.tsx`:**
```typescript
import { getPlagueProtectiveAccessories } from '../utils/procedural';

// Around line 340 where colors are computed
const effectiveAccessories = useMemo(() => {
  if (!buildingInfectionState) return stats.accessories;

  const plagueContext = {
    buildingHasDeceased: buildingInfectionState.status === 'deceased',
    buildingHasInfected: buildingInfectionState.status === 'infected',
    awarenessLevel: stats.awarenessLevel,
    socialClass: stats.socialClass,
  };

  return getPlagueProtectiveAccessories(plagueContext, stats.accessories ?? []);
}, [buildingInfectionState, stats.accessories, stats.awarenessLevel, stats.socialClass]);
```

**Rendering accessories in `Humanoid.tsx`:**
```typescript
// Add small geometry for visible accessories (optional enhancement)
{accessories.includes('prayer beads') && (
  <mesh position={[0.3, 0.9, 0.1]}>
    <torusGeometry args={[0.05, 0.015, 6, 8]} />
    <meshStandardMaterial color="#2a1810" roughness={0.8} />
  </mesh>
)}

{accessories.includes('protective amulet') && (
  <mesh position={[0, 1.1, 0.25]}>
    <boxGeometry args={[0.08, 0.08, 0.02]} />
    <meshStandardMaterial color="#8b7355" roughness={0.9} />
  </mesh>
)}

// Perfumed cloth as held item (reuse existing heldItem system)
```

**Performance**: Accessories rendered only if present. ~50 triangles per accessory. Negligible.

---

## Phase 4: Infected Building Visual Markers ⭐

### Design: Floating Red Crescent with Glow

**Visual Description:**
- Red crescent moon symbol (Islamic medical symbol, culturally appropriate)
- Floats 8-10 units above infected/deceased buildings
- Gentle bob animation (0.3 units, 2-second cycle)
- Emissive red glow with pulsing intensity
- Visible from ~100 units away
- Only appears over RESIDENTIAL buildings (not commercial/religious)

**Symbol Choice Rationale:**
- ✅ Red crescent: Islamic medical symbol (anachronistic but recognizable)
- ✅ Culturally appropriate for Damascus 1348
- ✅ Simple geometry (arc + extrusion)
- ❌ Red cross: Christian symbol (less appropriate)
- ❌ Flame: More complex geometry
- ❌ Orb: Less visually distinctive

### Implementation: `components/environment/InfectedBuildingMarkers.tsx` (NEW FILE)

```typescript
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BuildingMetadata, BuildingInfectionState, BuildingType } from '../../types';

interface InfectedBuildingMarkersProps {
  buildings: BuildingMetadata[];
  buildingInfectionMap: Map<string, BuildingInfectionState>;
  playerPosition: [number, number, number];
}

/**
 * Renders floating red crescent symbols above infected/deceased buildings
 * Performance: Instanced rendering, distance culling, simple geometry
 */
export const InfectedBuildingMarkers: React.FC<InfectedBuildingMarkersProps> = ({
  buildings,
  buildingInfectionMap,
  playerPosition,
}) => {
  const groupRef = useRef<THREE.Group>(null);

  // Filter to infected/deceased residential buildings near player
  const infectedBuildings = useMemo(() => {
    const maxDistance = 100; // Only render markers within 100 units

    return buildings.filter((building) => {
      const state = buildingInfectionMap.get(building.id);
      if (!state) return false;
      if (state.status !== 'infected' && state.status !== 'deceased') return false;
      if (building.type !== BuildingType.RESIDENTIAL) return false; // Only mark homes

      // Distance culling
      const dx = building.position[0] - playerPosition[0];
      const dz = building.position[2] - playerPosition[2];
      const distance = Math.sqrt(dx * dx + dz * dz);

      return distance < maxDistance;
    }).map((building) => ({
      building,
      state: buildingInfectionMap.get(building.id)!,
    }));
  }, [buildings, buildingInfectionMap, playerPosition]);

  // Gentle bobbing animation
  useFrame((state) => {
    if (!groupRef.current) return;

    groupRef.current.children.forEach((marker, i) => {
      const time = state.clock.elapsedTime;
      const offset = i * 0.3; // Stagger animation
      const bobHeight = Math.sin(time * 2 + offset) * 0.3;
      marker.position.y = 8 + bobHeight; // Float at 8 units + bob
    });
  });

  return (
    <group ref={groupRef}>
      {infectedBuildings.map(({ building, state }) => (
        <InfectedMarker
          key={building.id}
          position={building.position}
          status={state.status}
        />
      ))}
    </group>
  );
};

interface InfectedMarkerProps {
  position: [number, number, number];
  status: 'infected' | 'deceased';
}

const InfectedMarker: React.FC<InfectedMarkerProps> = ({ position, status }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Crescent geometry (simple arc)
  const crescentGeometry = useMemo(() => {
    const shape = new THREE.Shape();

    // Outer arc (radius 0.5)
    const outerRadius = 0.5;
    const innerRadius = 0.35;
    const startAngle = -Math.PI / 4;
    const endAngle = Math.PI / 4;

    // Create crescent shape
    shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
    shape.absarc(0, 0.1, innerRadius, endAngle, startAngle, true);
    shape.closePath();

    // Extrude slightly for 3D effect
    const extrudeSettings = {
      depth: 0.1,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 2,
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, []);

  // Pulsing glow animation
  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;
    const pulseSpeed = status === 'deceased' ? 0.8 : 1.5; // Slower pulse for deceased
    const pulse = (Math.sin(time * pulseSpeed) + 1) / 2; // 0-1

    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.5 + pulse * 0.5; // 0.5-1.0
  });

  const baseColor = status === 'deceased' ? '#8a0000' : '#cc0000'; // Darker red for deceased
  const emissiveColor = status === 'deceased' ? '#aa0000' : '#ff0000'; // Bright red glow

  return (
    <mesh
      ref={meshRef}
      position={[position[0], 8, position[2]]} // Float at 8 units high
      rotation={[0, 0, 0]} // Face upward
      geometry={crescentGeometry}
      castShadow={false} // No shadow needed
      receiveShadow={false}
    >
      <meshStandardMaterial
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={0.8}
        roughness={0.3}
        metalness={0.1}
        toneMapped={false} // Prevent tonemapping from dulling glow
      />
    </mesh>
  );
};
```

### Integration: `components/Simulation.tsx`

**Add to imports:**
```typescript
import { InfectedBuildingMarkers } from './environment/InfectedBuildingMarkers';
```

**Add to render (after `<Environment>`)**:
```typescript
{/* Infected building markers */}
<InfectedBuildingMarkers
  buildings={buildings}
  buildingInfectionMap={buildingInfectionMap}
  playerPosition={playerPos}
/>
```

### Performance Analysis

**Geometry**:
- Crescent shape: ~40 vertices per marker
- Typical scene: 20-30 infected buildings
- Total: ~1000 vertices (negligible)

**Rendering**:
- Distance culling: Only render within 100 units (~20 markers max)
- Simple emissive material (no complex shaders)
- No shadows (disabled)
- Instanced geometry reuse

**Animation**:
- `useFrame` updates position (3 float ops per marker)
- Pulse animation updates emissiveIntensity (1 float op)
- Total: ~80 ops/frame for 20 markers (negligible)

**Estimated cost**: <0.5ms per frame (60fps → 30 microseconds per marker)

---

## Phase 5: Alternative Visual Designs (Optional)

### Option A: Simpler Billboard Sprite
```typescript
// Replace crescent geometry with flat quad + texture
<sprite position={[position[0], 8, position[2]]} scale={[1, 1, 1]}>
  <spriteMaterial
    map={crescentTexture}
    color={baseColor}
    emissive={emissiveColor}
    emissiveIntensity={pulseIntensity}
    transparent
    opacity={0.9}
  />
</sprite>
```
✅ Even cheaper (2 triangles vs 40 vertices)
❌ Less "3D" feeling
❌ Always faces camera (billboard effect)

### Option B: Particle Ring
```typescript
// Orbiting particle ring around building
<points>
  <bufferGeometry>
    {/* 16 particles in ring */}
  </bufferGeometry>
  <pointsMaterial
    size={0.2}
    color="#ff0000"
    emissive="#ff0000"
    transparent
    opacity={0.8}
  />
</points>
```
✅ Very distinctive
✅ Animated orbit
❌ More expensive (16 particles × update cost)
❌ Might be visually noisy

### Option C: Vertical Beam of Light
```typescript
// Pillar of red light from building to sky
<mesh position={[position[0], 15, position[2]]}>
  <cylinderGeometry args={[0.3, 0.5, 30, 8]} />
  <meshBasicMaterial
    color="#ff0000"
    transparent
    opacity={0.3}
    depthWrite={false}
  />
</mesh>
```
✅ Very visible from distance
✅ Dramatic
❌ Might obstruct view
❌ Less culturally appropriate

**RECOMMENDATION**: Stick with **crescent** (main plan) - best balance of performance, cultural fit, and visual appeal.

---

## Phase 6: Enhancement Ideas (Future)

1. **Sound Effects**
   - Faint wailing/mourning sounds near deceased buildings
   - Coughing sounds near infected buildings
   - Triggered at distance <10 units

2. **Visual Polish**
   - Bloom post-processing for marker glow
   - Subtle smoke particles rising from deceased buildings
   - Darkened windows (already have window glow system)

3. **UI Integration**
   - Minimap shows infected buildings in red
   - Building inspection tooltip shows infection status
   - Count of infected buildings in UI stats panel

4. **Historical Accuracy**
   - Red cloth banner on building door (additional mesh)
   - Boarded windows for quarantined buildings
   - NPCs avoid walking near infected buildings (pathfinding weight)

---

## Implementation Order

### Week 1: Core Functionality
1. ✅ Phase 1: Pass `buildingInfectionMap` through component tree (1 hour)
2. ✅ Phase 2: Mourning clothing in `Humanoid.tsx` (2 hours)
3. ✅ Phase 3: Protective accessories in `NPC.tsx` (2 hours)
4. ✅ Test: Verify mourning appears on NPCs from deceased buildings

### Week 2: Visual Markers
5. ✅ Phase 4: Create `InfectedBuildingMarkers.tsx` (3 hours)
6. ✅ Phase 4: Integrate into `Simulation.tsx` (30 minutes)
7. ✅ Test: Verify markers appear and animate correctly
8. ✅ Performance test: Check FPS with 30+ infected buildings

### Week 3: Polish (Optional)
9. ☐ Phase 6: Add sound effects
10. ☐ Phase 6: Add bloom post-processing
11. ☐ Phase 6: UI integration

---

## Testing Checklist

### Mourning Clothes
- [ ] NPC from deceased building wears black
- [ ] Mourning fades over 14 days
- [ ] Multiple NPCs in same building all show mourning
- [ ] NPCs from clear buildings have normal colors
- [ ] Ethnicity colors still work with mourning overlay

### Protective Accessories
- [ ] High awareness NPCs have prayer beads
- [ ] Wealthy NPCs in infected buildings have perfumed cloths
- [ ] Accessories appear dynamically as plague spreads
- [ ] Accessories don't duplicate if already present

### Visual Markers
- [ ] Markers appear only over infected/deceased buildings
- [ ] Crescent geometry renders correctly
- [ ] Bob animation is smooth
- [ ] Pulse animation works
- [ ] Distance culling works (markers disappear >100 units)
- [ ] Deceased buildings have darker red than infected
- [ ] Markers don't render over commercial/religious buildings

### Performance
- [ ] FPS stays >55 with 30 infected buildings
- [ ] No memory leaks over 30 minutes
- [ ] Marker geometry is reused (not recreated)

---

## Code Files Summary

**Files to Modify:**
1. `App.tsx` - Pass buildingInfectionMap prop
2. `components/Simulation.tsx` - Receive and forward buildingInfectionMap
3. `components/Agents.tsx` - Forward buildingInfectionMap to NPCs
4. `components/NPC.tsx` - Apply protective accessories
5. `components/Humanoid.tsx` - Apply mourning colors

**Files to Create:**
1. `components/environment/InfectedBuildingMarkers.tsx` - Visual markers

**Files Already Complete:**
1. ✅ `utils/buildingInfection.ts` - Tracking system
2. ✅ `utils/procedural.ts` - Mourning/protective functions

**Total New Code**: ~250 lines
**Modified Code**: ~50 lines
**Estimated Time**: 8-10 hours for complete implementation
