import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { InteriorRoom, InteriorRoomType, BuildingType, SocialClass } from '../../types';
import { buildWallWithDoorGeometry, buildWallWithGrandArchway, darkenHex } from './geometry';

type Side = 'north' | 'south' | 'east' | 'west';

interface InteriorRoomMeshProps {
  room: InteriorRoom;
  floorMaterial: THREE.MeshStandardMaterial;
  wallMaterial: THREE.MeshStandardMaterial;
  wallColor: string;
  patchMaterial: THREE.MeshStandardMaterial;
  socialClass: SocialClass;
  buildingType: BuildingType;
  wallHeight?: number;
  interiorDoorSide: Side | null;
  interiorDoorSides?: Side[];
  exteriorDoorSide: Side | null;
  cutawaySide: Side | null;
  doorVariant: number;
  alcoveSide: Side | null;
  doorLabel: string | null;
  labelDoorSide: Side | null;
  roomSeed: number;
  sharedWalls?: Side[];  // Walls shared with adjacent rooms (skip rendering to avoid z-fighting)
}

const DoorLabel: React.FC<{ label: string; position: [number, number, number] }> = ({ label, position }) => (
  <Html position={position} center>
    <div className="bg-black/70 border border-amber-700/50 text-amber-200 text-[10px] uppercase tracking-widest px-3 py-1 rounded-full shadow-[0_0_18px_rgba(245,158,11,0.25)] pointer-events-none">
      {label}
    </div>
  </Html>
);

export const InteriorRoomMesh: React.FC<InteriorRoomMeshProps> = ({
  room,
  floorMaterial,
  wallMaterial,
  wallColor,
  patchMaterial,
  socialClass,
  buildingType,
  wallHeight,
  interiorDoorSide,
  interiorDoorSides = [],
  exteriorDoorSide,
  cutawaySide,
  doorVariant,
  alcoveSide,
  doorLabel,
  labelDoorSide,
  roomSeed,
  sharedWalls = [],
}) => {
  const [hoverDoor, setHoverDoor] = useState<Side | null>(null);
  const height = wallHeight ?? 3.2;
  const thickness = 0.18;
  const [w, , d] = room.size;
  const isArch = doorVariant > 0;
  const doorWidthBase = Math.min(2.4, Math.max(1.6, w * 0.28));
  const doorHeight = isArch ? 2.6 : 2.3;

  const floorMat = useMemo(() => floorMaterial.clone(), [floorMaterial]);
  const wallMat = useMemo(() => {
    const baseMap = wallMaterial.map ?? null;
    return new THREE.MeshStandardMaterial({
      map: baseMap ?? undefined,
      color: wallColor,
      roughness: wallMaterial.roughness ?? 0.9,
      side: THREE.DoubleSide,
    });
  }, [wallMaterial, wallColor]);
  const bandMat = useMemo(() => {
    const baseMap = patchMaterial.map ?? null;
    return new THREE.MeshStandardMaterial({
      map: baseMap ?? undefined,
      color: darkenHex(wallColor, 0.78),
      roughness: patchMaterial.roughness ?? 0.95,
      transparent: true,
      opacity: patchMaterial.opacity ?? 0.45,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [patchMaterial, wallColor]);
  const baseboardMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: darkenHex(wallColor, 0.72),
    roughness: 0.92,
  }), [wallColor]);
  const doorSides = useMemo(() => {
    const sides = new Set<Side>();
    if (interiorDoorSide) sides.add(interiorDoorSide);
    interiorDoorSides.forEach((side) => sides.add(side));
    if (exteriorDoorSide) sides.add(exteriorDoorSide);
    return sides;
  }, [interiorDoorSide, interiorDoorSides, exteriorDoorSide]);
  const tileMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: darkenHex('#e6ddcc', 0.98),
    roughness: 0.8,
  }), []);

  const wallForSide = (side: Side, width: number) => {
    const hasDoor = side === interiorDoorSide || side === exteriorDoorSide;
    if (!hasDoor) {
      return <boxGeometry args={[width, height, thickness]} />;
    }

    // Civic buildings get grand archways
    if (buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL) {
      const archType = doorVariant % 4; // 0=horseshoe, 1=pointed, 2=multifoil, 3=ogee
      return (
        <primitive
          object={buildWallWithGrandArchway(width, height, thickness, archType)}
        />
      );
    }

    return (
      <primitive
        object={buildWallWithDoorGeometry(width, height, Math.min(doorWidthBase, width * 0.5), doorHeight, thickness, isArch)}
      />
    );
  };

  const doorHoverHandlers = (side: Side) => ({
    onPointerOver: (e: React.PointerEvent) => {
      e.stopPropagation();
      setHoverDoor(side);
    },
    onPointerOut: (e: React.PointerEvent) => {
      e.stopPropagation();
      setHoverDoor(null);
    },
  });

  const doorLabelPos = (side: Side): [number, number, number] => {
    const y = 1.2;
    switch (side) {
      case 'north':
        return [0, y, d / 2 - 0.25];
      case 'south':
        return [0, y, -d / 2 + 0.25];
      case 'east':
        return [w / 2 - 0.25, y, 0];
      case 'west':
        return [-w / 2 + 0.25, y, 0];
    }
  };

  const renderCivicArchDecoration = (side: Side, zOffset: number) => {
    const width = side === 'north' || side === 'south' ? w : d;
    const archWidth = Math.min(width * 0.65, 3.4);
    const archHeight = Math.min(height * 0.95, 3.6);
    const halfArchW = archWidth / 2;
    const stoneColor = darkenHex(wallColor, 0.88);
    const accentColor = darkenHex(wallColor, 0.72);
    const archType = doorVariant % 4;

    return (
      <group position={[0, -height / 2, zOffset]}>
        {/* Flanking columns */}
        {[-1, 1].map((dir) => (
          <group key={`column-${dir}`} position={[halfArchW * dir * 1.08, 0, 0]}>
            {/* Column base */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.18, 0.22, 0.4, 8]} />
              <meshStandardMaterial color={stoneColor} roughness={0.85} />
            </mesh>
            {/* Column shaft */}
            <mesh position={[0, archHeight * 0.5, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.14, 0.16, archHeight - 0.4, 8]} />
              <meshStandardMaterial color={stoneColor} roughness={0.88} />
            </mesh>
            {/* Decorative rings on shaft */}
            {[0.3, 0.5, 0.7].map((ratio) => (
              <mesh key={`ring-${ratio}`} position={[0, archHeight * ratio, 0]} receiveShadow>
                <cylinderGeometry args={[0.17, 0.17, 0.06, 8]} />
                <meshStandardMaterial color={accentColor} roughness={0.82} />
              </mesh>
            ))}
            {/* Capital (top of column) */}
            <mesh position={[0, archHeight - 0.15, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.24, 0.16, 0.28, 8]} />
              <meshStandardMaterial color={accentColor} roughness={0.8} />
            </mesh>
            {/* Capital details */}
            <mesh position={[0, archHeight - 0.05, 0]} receiveShadow>
              <cylinderGeometry args={[0.26, 0.24, 0.08, 8]} />
              <meshStandardMaterial color={stoneColor} roughness={0.85} />
            </mesh>
          </group>
        ))}

        {/* Arch frame/molding */}
        {archType === 0 && ( // Horseshoe arch frame
          <mesh position={[0, archHeight - 0.8, 0.05]} castShadow receiveShadow>
            <torusGeometry args={[archWidth * 0.52, 0.08, 8, 24, Math.PI + 0.6]} />
            <meshStandardMaterial color={accentColor} roughness={0.8} />
          </mesh>
        )}
        {archType === 1 && ( // Pointed arch frame - decorative keystone
          <mesh position={[0, archHeight, 0]} castShadow receiveShadow>
            <coneGeometry args={[0.18, 0.32, 4]} />
            <meshStandardMaterial color={accentColor} roughness={0.82} />
          </mesh>
        )}

        {/* Geometric patterns above arch (spandrels) */}
        {[-1, 1].map((dir) => (
          <group key={`spandrel-${dir}`} position={[halfArchW * 0.6 * dir, archHeight * 0.82, 0]}>
            {/* Geometric star pattern */}
            {Array.from({ length: 6 }).map((_, i) => {
              const angle = (i / 6) * Math.PI * 2;
              const radius = 0.15;
              return (
                <mesh
                  key={`star-${i}`}
                  position={[Math.cos(angle) * radius, Math.sin(angle) * radius, 0]}
                  receiveShadow
                >
                  <cylinderGeometry args={[0.03, 0.03, 0.06, 4]} />
                  <meshStandardMaterial color={accentColor} roughness={0.75} />
                </mesh>
              );
            })}
            <mesh receiveShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.06, 6]} />
              <meshStandardMaterial color={accentColor} roughness={0.8} />
            </mesh>
          </group>
        ))}

        {/* Horizontal band above arch with carved pattern */}
        <mesh position={[0, archHeight + 0.15, 0]} receiveShadow castShadow>
          <boxGeometry args={[archWidth * 1.3, 0.16, 0.08]} />
          <meshStandardMaterial color={accentColor} roughness={0.82} />
        </mesh>
        {/* Carved detail on band */}
        {Array.from({ length: 9 }).map((_, i) => (
          <mesh
            key={`band-detail-${i}`}
            position={[
              -archWidth * 0.6 + (archWidth * 1.2 / 8) * i,
              archHeight + 0.15,
              0.05
            ]}
            receiveShadow
          >
            <boxGeometry args={[0.08, 0.08, 0.04]} />
            <meshStandardMaterial color={stoneColor} roughness={0.8} />
          </mesh>
        ))}
      </group>
    );
  };

  const renderWall = (side: Side) => {
    // Skip walls that are cut away or shared with adjacent rooms (to avoid z-fighting)
    if (cutawaySide === side || sharedWalls.includes(side)) return null;
    const width = side === 'north' || side === 'south' ? w : d;
    const geometry = wallForSide(side, width);
    const rotation: [number, number, number] = side === 'north'
      ? [0, 0, 0]
      : side === 'south'
        ? [0, Math.PI, 0]
        : side === 'east'
          ? [0, Math.PI / 2, 0]
          : [0, -Math.PI / 2, 0];
    const position: [number, number, number] = side === 'north'
      ? [0, height / 2, d / 2]
      : side === 'south'
        ? [0, height / 2, -d / 2]
        : side === 'east'
          ? [w / 2, height / 2, 0]
          : [-w / 2, height / 2, 0];
    const hasDoor = side === exteriorDoorSide || side === interiorDoorSide || interiorDoorSides.includes(side);
    const isCivicDoor = hasDoor && (buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL);

    return (
      <group key={`wall-${side}`} position={position} rotation={rotation}>
        <mesh
          castShadow
          receiveShadow
          userData={{ isBuildingWall: true, buildingId: `interior-${side}` }}
        >
          {geometry}
          <primitive object={wallMat} attach="material" />
        </mesh>
        {!hasDoor && (
          <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
            <boxGeometry args={[width, 0.9, thickness + 0.02]} />
            <primitive object={bandMat} attach="material" />
          </mesh>
        )}
        {isCivicDoor && (
          <>
            {renderCivicArchDecoration(side, thickness / 2 + 0.08)}
            {renderCivicArchDecoration(side, -thickness / 2 - 0.08)}
          </>
        )}
        {labelDoorSide === side && doorLabel && (
          <mesh
            position={[0, 1.1, thickness / 2 + 0.02]}
            rotation={[0, 0, 0]}
            {...doorHoverHandlers(side)}
          >
            <planeGeometry args={[2.2, 2.8]} />
            <meshStandardMaterial transparent opacity={0} />
          </mesh>
        )}
        {labelDoorSide === side && hoverDoor === side && doorLabel && (
          <DoorLabel label={doorLabel} position={doorLabelPos(side)} />
        )}
      </group>
    );
  };

  const alcove = alcoveSide && alcoveSide !== cutawaySide
    ? (
      <mesh
        position={
          alcoveSide === 'north'
            ? [0, 1.5, d / 2 - 0.2]
            : alcoveSide === 'south'
              ? [0, 1.5, -d / 2 + 0.2]
              : alcoveSide === 'east'
                ? [w / 2 - 0.2, 1.5, 0]
                : [-w / 2 + 0.2, 1.5, 0]
        }
        rotation={alcoveSide === 'east' || alcoveSide === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]}
      >
        <boxGeometry args={[1.4, 0.9, 0.15]} />
        <meshStandardMaterial color={darkenHex(wallColor, 0.7)} roughness={0.9} />
      </mesh>
    )
    : null;

  const floorTint = buildingType === BuildingType.RELIGIOUS
    ? darkenHex('#c8b396', 1.05)
    : buildingType === BuildingType.CIVIC || buildingType === BuildingType.SCHOOL || buildingType === BuildingType.MEDICAL
      ? '#b7a287'
      : floorMaterial.color?.getStyle?.() ?? '#b59f84';
  const decorSeed = Math.abs(Math.sin(roomSeed * 0.137));
  const showBaseboards = socialClass !== SocialClass.PEASANT;
  const showTiles = (socialClass === SocialClass.MERCHANT || socialClass === SocialClass.NOBILITY) && decorSeed > 0.55;
  const tileWall: Side = cutawaySide === 'north'
    ? 'south'
    : cutawaySide === 'south'
      ? 'north'
      : cutawaySide === 'east'
        ? 'west'
        : 'east';

  // Civic building floor decorations
  const renderCivicFloorInlays = () => {
    if (buildingType !== BuildingType.CIVIC && buildingType !== BuildingType.SCHOOL && buildingType !== BuildingType.MEDICAL) return null;

    const inlayColor = '#1a1a1a'; // Dark black/charcoal for inlays
    const borderWidth = 0.12; // Width of border strips
    const innerInset = 0.8; // Distance from wall to inner border
    const cornerSize = 0.35; // Size of corner medallions

    return (
      <group>
        {/* Perimeter border - outer frame */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, d / 2 - borderWidth / 2]} receiveShadow>
          <planeGeometry args={[w, borderWidth]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -d / 2 + borderWidth / 2]} receiveShadow>
          <planeGeometry args={[w, borderWidth]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2 - borderWidth / 2, 0.005, 0]} receiveShadow>
          <planeGeometry args={[borderWidth, d]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-w / 2 + borderWidth / 2, 0.005, 0]} receiveShadow>
          <planeGeometry args={[borderWidth, d]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Inner decorative border */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, d / 2 - innerInset]} receiveShadow>
          <planeGeometry args={[w - innerInset * 2, 0.08]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -d / 2 + innerInset]} receiveShadow>
          <planeGeometry args={[w - innerInset * 2, 0.08]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2 - innerInset, 0.005, 0]} receiveShadow>
          <planeGeometry args={[0.08, d - innerInset * 2]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-w / 2 + innerInset, 0.005, 0]} receiveShadow>
          <planeGeometry args={[0.08, d - innerInset * 2]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Corner medallions - decorative geometric shapes */}
        {[
          [w / 2 - innerInset, d / 2 - innerInset],
          [-w / 2 + innerInset, d / 2 - innerInset],
          [w / 2 - innerInset, -d / 2 + innerInset],
          [-w / 2 + innerInset, -d / 2 + innerInset]
        ].map(([x, z], idx) => (
          <group key={`corner-${idx}`}>
            {/* Octagonal medallion */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.006, z]} receiveShadow>
              <cylinderGeometry args={[cornerSize, cornerSize, 0.01, 8]} />
              <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
            </mesh>
            {/* Inner star pattern */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.007, z]} receiveShadow>
              <cylinderGeometry args={[cornerSize * 0.5, cornerSize * 0.5, 0.01, 8]} />
              <meshStandardMaterial color={inlayColor} roughness={0.25} metalness={0.15} />
            </mesh>
          </group>
        ))}

        {/* Center medallion */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
          <cylinderGeometry args={[0.6, 0.6, 0.01, 12]} />
          <meshStandardMaterial color={inlayColor} roughness={0.25} metalness={0.15} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.007, 0]} receiveShadow>
          <cylinderGeometry args={[0.35, 0.35, 0.01, 8]} />
          <meshStandardMaterial color={inlayColor} roughness={0.3} metalness={0.1} />
        </mesh>
      </group>
    );
  };

  return (
    <group position={[room.center[0], 0, room.center[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <primitive object={floorMat} attach="material" />
      </mesh>
      {renderCivicFloorInlays()}
      {renderWall('north')}
      {renderWall('south')}
      {renderWall('east')}
      {renderWall('west')}
      {showBaseboards && (
        <>
          {!doorSides.has('north') && (
            <mesh position={[0, 0.12, d / 2 - 0.02]}>
              <boxGeometry args={[w, 0.18, 0.06]} />
              <primitive object={baseboardMat} attach="material" />
            </mesh>
          )}
          {!doorSides.has('south') && (
            <mesh position={[0, 0.12, -d / 2 + 0.02]}>
              <boxGeometry args={[w, 0.18, 0.06]} />
              <primitive object={baseboardMat} attach="material" />
            </mesh>
          )}
          {!doorSides.has('east') && (
            <mesh position={[w / 2 - 0.02, 0.12, 0]}>
              <boxGeometry args={[0.06, 0.18, d]} />
              <primitive object={baseboardMat} attach="material" />
            </mesh>
          )}
          {!doorSides.has('west') && (
            <mesh position={[-w / 2 + 0.02, 0.12, 0]}>
              <boxGeometry args={[0.06, 0.18, d]} />
              <primitive object={baseboardMat} attach="material" />
            </mesh>
          )}
        </>
      )}
      {showTiles && tileWall !== cutawaySide && !sharedWalls.includes(tileWall) && !doorSides.has(tileWall) && (
        <mesh
          position={
            tileWall === 'north'
              ? [0, 1.4, d / 2 - 0.08]
              : tileWall === 'south'
                ? [0, 1.4, -d / 2 + 0.08]
                : tileWall === 'east'
                  ? [w / 2 - 0.08, 1.4, 0]
                  : [-w / 2 + 0.08, 1.4, 0]
          }
          rotation={tileWall === 'east' || tileWall === 'west' ? [0, Math.PI / 2, 0] : [0, 0, 0]}
        >
          <boxGeometry args={[1.8, 0.9, 0.05]} />
          <primitive object={tileMat} attach="material" />
        </mesh>
      )}
      {alcove}
      {socialClass !== SocialClass.PEASANT && room.type !== InteriorRoomType.STORAGE && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[w * 0.86, d * 0.86]} />
          <meshStandardMaterial color={floorTint} transparent opacity={0.08} />
        </mesh>
      )}
    </group>
  );
};

export default InteriorRoomMesh;
