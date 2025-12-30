import React from 'react';
import * as THREE from 'three';
import { BuildingMetadata, BuildingType } from '../../../types';
import { seededRandom } from '../../../utils/procedural';
import {
  GeometricTile,
  OrnateFountain,
  LionSculpture,
  ArcadeColumn,
  Mashrabiya,
  DecorativeUrn,
  Muqarnas,
  ISLAMIC_COLORS
} from '../decorations/IslamicOrnaments';
import { HoverLabel, HoverOutlineBox } from '../shared/HoverSystem';

interface CourtyardBuildingProps {
  data: BuildingMetadata;
  finalHeight: number;
  finalBuildingSize: number;
  courtyardSize: number;
  wallThickness: number;
  gateWidth: number;
  gateHeight: number;
  halfSize: number;
  localSeed: number;
  courtyardWallColor: string;
  wireColor: string;
  labelEnabled: boolean;
  wireframeEnabled: boolean;
  hovered: boolean;
  setHovered: React.Dispatch<React.SetStateAction<boolean>>;
  groupRef: React.MutableRefObject<THREE.Group | null>;
  otherMaterials: any;
}

export const CourtyardBuilding: React.FC<CourtyardBuildingProps> = ({
  data,
  finalHeight,
  finalBuildingSize,
  courtyardSize,
  wallThickness,
  gateWidth,
  gateHeight,
  halfSize,
  localSeed,
  courtyardWallColor,
  wireColor,
  labelEnabled,
  wireframeEnabled,
  hovered,
  setHovered,
  groupRef,
  otherMaterials
}) => {
  const gateSegment = (finalBuildingSize - gateWidth) / 2;
  const gateOffset = gateWidth / 2 + gateSegment / 2;
  const courtyardFloorY = -finalHeight / 2 + 0.03;
  const treeOffset = courtyardSize * 0.22;
  const potOffset = courtyardSize * 0.32;
  const vineHeight = finalHeight * 0.7;
  const wingHeight = finalHeight * 0.9;
  const wingDepth = Math.max(finalBuildingSize * 0.24, 2.0);
  const wingInset = courtyardSize / 2 - wingDepth / 2;
  const wingWidth = courtyardSize - wallThickness * 2;
  const wingVariant = Math.floor(seededRandom(localSeed + 402) * 3);
  const fountainVariant = Math.floor(seededRandom(localSeed + 406) * 3);
  const hasMashrabiya = seededRandom(localSeed + 411) > 0.45;
  const hasAblaqBand = seededRandom(localSeed + 413) > 0.35;
  const hasLintel = seededRandom(localSeed + 415) > 0.3;

  const floorMat = otherMaterials?.courtyardFloor ?? new THREE.MeshStandardMaterial({ color: '#d7cfbf', roughness: 0.95, metalness: 0 });
  const vineMat = otherMaterials?.vine ?? new THREE.MeshStandardMaterial({ color: '#3a5a3c', roughness: 0.9, metalness: 0 });
  const potMat = otherMaterials?.pottery ?? new THREE.MeshStandardMaterial({ color: '#b08a63', roughness: 0.85, metalness: 0 });
  const gateFrameWidth = gateWidth * 0.6;
  const gateFrameHeight = gateHeight * 0.65;
  const gateFrameY = -finalHeight / 2 + gateFrameHeight / 2 + 0.15;
  const gatePlaneOffset = halfSize + 0.15;
  const gateFrameZ = data.doorSide === 0 ? gatePlaneOffset : data.doorSide === 2 ? -gatePlaneOffset : 0;
  const gateFrameX = data.doorSide === 1 ? gatePlaneOffset : data.doorSide === 3 ? -gatePlaneOffset : 0;
  const gateFrameRot: [number, number, number] =
    data.doorSide === 0 ? [0, 0, 0]
    : data.doorSide === 2 ? [0, Math.PI, 0]
    : data.doorSide === 1 ? [0, -Math.PI / 2, 0]
    : [0, Math.PI / 2, 0];

  return (
    <group
      ref={groupRef}
      position={[data.position[0], finalHeight / 2, data.position[2]]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {labelEnabled && hovered && (
        <HoverLabel
          title={data.type === BuildingType.COMMERCIAL ? 'Merchant Residence' : 'Courtyard House'}
          lines={[
            data.ownerName,
            data.ownerProfession,
            `Age ${data.ownerAge}`,
            data.isQuarantined ? 'Quarantined' : 'Open'
          ]}
          offset={[0, finalHeight / 2 + 1.4, 0]}
        />
      )}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={[finalBuildingSize * 1.02, finalHeight * 1.02, finalBuildingSize * 1.02]} color={wireColor} />
          <HoverOutlineBox size={[finalBuildingSize * 1.06, finalHeight * 1.06, finalBuildingSize * 1.06]} color={wireColor} opacity={0.35} />
        </>
      )}

      {/* Courtyard walls with open gate - using proper sandstone color */}
      {data.doorSide === 0 ? (
        <>
          <mesh position={[gateOffset, 0, halfSize - wallThickness / 2]} castShadow receiveShadow>
            <boxGeometry args={[gateSegment, finalHeight, wallThickness]} />
            <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
          </mesh>
          <mesh position={[-gateOffset, 0, halfSize - wallThickness / 2]} castShadow receiveShadow>
            <boxGeometry args={[gateSegment, finalHeight, wallThickness]} />
            <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
          </mesh>
        </>
      ) : data.doorSide === 2 ? (
        <>
          <mesh position={[gateOffset, 0, -halfSize + wallThickness / 2]} castShadow receiveShadow>
            <boxGeometry args={[gateSegment, finalHeight, wallThickness]} />
            <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
          </mesh>
          <mesh position={[-gateOffset, 0, -halfSize + wallThickness / 2]} castShadow receiveShadow>
            <boxGeometry args={[gateSegment, finalHeight, wallThickness]} />
            <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
          </mesh>
        </>
      ) : data.doorSide === 1 ? (
        <>
          <mesh position={[halfSize - wallThickness / 2, 0, gateOffset]} castShadow receiveShadow>
            <boxGeometry args={[wallThickness, finalHeight, gateSegment]} />
            <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
          </mesh>
          <mesh position={[halfSize - wallThickness / 2, 0, -gateOffset]} castShadow receiveShadow>
            <boxGeometry args={[wallThickness, finalHeight, gateSegment]} />
            <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
          </mesh>
        </>
      ) : (
        <>
          <mesh position={[-halfSize + wallThickness / 2, 0, gateOffset]} castShadow receiveShadow>
            <boxGeometry args={[wallThickness, finalHeight, gateSegment]} />
            <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
          </mesh>
          <mesh position={[-halfSize + wallThickness / 2, 0, -gateOffset]} castShadow receiveShadow>
            <boxGeometry args={[wallThickness, finalHeight, gateSegment]} />
            <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
          </mesh>
        </>
      )}

      {/* Remaining walls */}
      {data.doorSide !== 0 && (
        <mesh position={[0, 0, halfSize - wallThickness / 2]} castShadow receiveShadow>
          <boxGeometry args={[finalBuildingSize, finalHeight, wallThickness]} />
          <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
        </mesh>
      )}
      {data.doorSide !== 2 && (
        <mesh position={[0, 0, -halfSize + wallThickness / 2]} castShadow receiveShadow>
          <boxGeometry args={[finalBuildingSize, finalHeight, wallThickness]} />
          <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
        </mesh>
      )}
      {data.doorSide !== 1 && (
        <mesh position={[halfSize - wallThickness / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[wallThickness, finalHeight, finalBuildingSize]} />
          <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
        </mesh>
      )}
      {data.doorSide !== 3 && (
        <mesh position={[-halfSize + wallThickness / 2, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[wallThickness, finalHeight, finalBuildingSize]} />
          <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
        </mesh>
      )}

      {/* Gate lintel */}
      <mesh position={[
        data.doorSide === 1 ? halfSize - wallThickness / 2 : data.doorSide === 3 ? -halfSize + wallThickness / 2 : 0,
        -finalHeight / 2 + gateHeight,
        data.doorSide === 0 ? halfSize - wallThickness / 2 : data.doorSide === 2 ? -halfSize + wallThickness / 2 : 0
      ]} castShadow receiveShadow>
        <boxGeometry args={[
          data.doorSide === 0 || data.doorSide === 2 ? gateWidth : wallThickness,
          wallThickness * 0.8,
          data.doorSide === 1 || data.doorSide === 3 ? gateWidth : wallThickness
        ]} />
        <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
      </mesh>

      {/* Courtyard floor */}
      <mesh position={[0, courtyardFloorY, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[courtyardSize, courtyardSize]} />
        <primitive object={floorMat} />
      </mesh>

      {/* Courtyard wings - interior residence buildings */}
      {wingVariant !== 2 && (
        <mesh position={[0, -finalHeight / 2 + wingHeight / 2, wingInset]} castShadow receiveShadow>
          <boxGeometry args={[wingWidth, wingHeight, wingDepth]} />
          <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
        </mesh>
      )}
      {wingVariant !== 1 && (
        <mesh position={[0, -finalHeight / 2 + wingHeight / 2, -wingInset]} castShadow receiveShadow>
          <boxGeometry args={[wingWidth, wingHeight, wingDepth]} />
          <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
        </mesh>
      )}
      {wingVariant !== 0 && (
        <mesh position={[wingInset, -finalHeight / 2 + wingHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[wingDepth, wingHeight, wingWidth]} />
          <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
        </mesh>
      )}
      <mesh position={[-wingInset, -finalHeight / 2 + wingHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wingDepth, wingHeight, wingWidth]} />
        <meshStandardMaterial color={courtyardWallColor} roughness={0.85} metalness={0} />
      </mesh>

      {/* Ablaq banding - offset slightly from wall to prevent z-fighting */}
      {hasAblaqBand && (
        <>
          <mesh position={[0, -finalHeight / 2 + wingHeight * 0.35, halfSize + 0.08]} castShadow>
            <boxGeometry args={[finalBuildingSize * 0.88, 0.22, 0.12]} />
            <meshStandardMaterial color="#9b7d55" roughness={0.9} metalness={0} />
          </mesh>
          <mesh position={[0, -finalHeight / 2 + wingHeight * 0.42, halfSize + 0.08]} castShadow>
            <boxGeometry args={[finalBuildingSize * 0.88, 0.22, 0.12]} />
            <meshStandardMaterial color="#d8ccb8" roughness={0.9} metalness={0} />
          </mesh>
        </>
      )}

      {/* Proper Mashrabiya lattice screen */}
      {hasMashrabiya && (
        <Mashrabiya
          position={[halfSize - wallThickness * 0.55, -finalHeight / 2 + wingHeight * 0.55, 0]}
          rotation={[0, Math.PI / 2, 0]}
          width={finalBuildingSize * 0.35}
          height={wingHeight * 0.35}
          pattern={seededRandom(localSeed + 412) > 0.5 ? 'diamond' : seededRandom(localSeed + 413) > 0.5 ? 'star' : 'hexagonal'}
        />
      )}

      {/* Muqarnas (honeycomb vaulting) above gate arch */}
      {seededRandom(localSeed + 460) > 0.4 && (
        <Muqarnas
          position={[
            data.doorSide === 1 ? halfSize - wallThickness * 0.4 : data.doorSide === 3 ? -halfSize + wallThickness * 0.4 : 0,
            -finalHeight / 2 + gateHeight + 0.4,
            data.doorSide === 0 ? halfSize - wallThickness * 0.4 : data.doorSide === 2 ? -halfSize + wallThickness * 0.4 : 0
          ]}
          width={gateWidth * 0.8}
          depth={wallThickness * 1.2}
          tiers={3}
          color={ISLAMIC_COLORS.limestone}
          accentColor={ISLAMIC_COLORS.cobaltBlue}
        />
      )}

      {/* Grand arched entry with flanking columns - for grander mansions */}
      {seededRandom(localSeed + 465) > 0.55 && (
        <group position={[
          data.doorSide === 1 ? halfSize + 0.8 : data.doorSide === 3 ? -halfSize - 0.8 : 0,
          -finalHeight / 2,
          data.doorSide === 0 ? halfSize + 0.8 : data.doorSide === 2 ? -halfSize - 0.8 : 0
        ]} rotation={[0, data.doorSide === 0 ? 0 : data.doorSide === 1 ? -Math.PI / 2 : data.doorSide === 2 ? Math.PI : Math.PI / 2, 0]}>
          {/* Left column */}
          <group position={[-gateWidth / 2 - 0.3, 0, 0]}>
            {/* Column base */}
            <mesh position={[0, 0.15, 0]} castShadow>
              <boxGeometry args={[0.55, 0.3, 0.55]} />
              <meshStandardMaterial color="#c9b99a" roughness={0.85} />
            </mesh>
            {/* Column shaft */}
            <mesh position={[0, gateHeight / 2, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.22, gateHeight - 0.5, 12]} />
              <meshStandardMaterial color="#d4c4a8" roughness={0.8} />
            </mesh>
            {/* Column capital */}
            <mesh position={[0, gateHeight - 0.15, 0]} castShadow>
              <boxGeometry args={[0.5, 0.35, 0.5]} />
              <meshStandardMaterial color="#c9b99a" roughness={0.85} />
            </mesh>
          </group>
          {/* Right column */}
          <group position={[gateWidth / 2 + 0.3, 0, 0]}>
            <mesh position={[0, 0.15, 0]} castShadow>
              <boxGeometry args={[0.55, 0.3, 0.55]} />
              <meshStandardMaterial color="#c9b99a" roughness={0.85} />
            </mesh>
            <mesh position={[0, gateHeight / 2, 0]} castShadow>
              <cylinderGeometry args={[0.18, 0.22, gateHeight - 0.5, 12]} />
              <meshStandardMaterial color="#d4c4a8" roughness={0.8} />
            </mesh>
            <mesh position={[0, gateHeight - 0.15, 0]} castShadow>
              <boxGeometry args={[0.5, 0.35, 0.5]} />
              <meshStandardMaterial color="#c9b99a" roughness={0.85} />
            </mesh>
          </group>
          {/* Arch spanning between columns */}
          <mesh position={[0, gateHeight + 0.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[gateWidth / 2 + 0.5, gateWidth / 2 + 0.5, 0.4, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color="#c4b496" roughness={0.85} />
          </mesh>
          {/* Arch keystone */}
          <mesh position={[0, gateHeight + 0.55, 0]} castShadow>
            <boxGeometry args={[0.35, 0.5, 0.45]} />
            <meshStandardMaterial color="#b5a080" roughness={0.8} />
          </mesh>
          {/* Optional small dome above entry */}
          {seededRandom(localSeed + 466) > 0.6 && (
            <>
              <mesh position={[0, gateHeight + 0.9, 0]} castShadow>
                <cylinderGeometry args={[gateWidth / 3, gateWidth / 2.5, 0.25, 12]} />
                <meshStandardMaterial color="#c9b99a" roughness={0.85} />
              </mesh>
              <mesh position={[0, gateHeight + 1.2, 0]} castShadow>
                <sphereGeometry args={[gateWidth / 3.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#bda88b" roughness={0.8} />
              </mesh>
              <mesh position={[0, gateHeight + 1.2 + gateWidth / 4, 0]} castShadow>
                <sphereGeometry args={[0.12, 8, 6]} />
                <meshStandardMaterial color="#d8c8a0" roughness={0.6} metalness={0.2} />
              </mesh>
            </>
          )}
        </group>
      )}

      {/* Ornate lintel at gate - offset to prevent z-fighting */}
      {hasLintel && (
        <mesh position={[
          data.doorSide === 1 ? halfSize + 0.1 : data.doorSide === 3 ? -halfSize - 0.1 : 0,
          -finalHeight / 2 + gateHeight + 0.25,
          data.doorSide === 0 ? halfSize + 0.1 : data.doorSide === 2 ? -halfSize - 0.1 : 0
        ]} castShadow receiveShadow>
          <boxGeometry args={[
            data.doorSide === 0 || data.doorSide === 2 ? gateWidth * 1.08 : 0.25,
            0.3,
            data.doorSide === 1 || data.doorSide === 3 ? gateWidth * 1.08 : 0.25
          ]} />
          <meshStandardMaterial color="#9b7d55" roughness={0.85} metalness={0} />
        </mesh>
      )}

      {/* Decorative Islamic tile gate frame - positioned outside the wall */}
      <mesh
        position={[gateFrameX, gateFrameY, gateFrameZ]}
        rotation={gateFrameRot}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[gateFrameWidth, gateFrameHeight, 0.2]} />
        <meshStandardMaterial color="#caa77b" roughness={0.85} metalness={0} />
      </mesh>

      {/* Geometric tile panel above gate - positioned clearly in front */}
      <GeometricTile
        position={[
          gateFrameX + (data.doorSide === 0 ? 0 : data.doorSide === 2 ? 0 : (data.doorSide === 1 ? 0.25 : -0.25)),
          gateFrameY + gateFrameHeight * 0.4,
          gateFrameZ + (data.doorSide === 0 ? 0.25 : data.doorSide === 2 ? -0.25 : 0)
        ]}
        rotation={[
          0,
          data.doorSide === 0 ? 0 : data.doorSide === 2 ? Math.PI : data.doorSide === 1 ? -Math.PI / 2 : Math.PI / 2,
          0
        ]}
        size={gateFrameWidth * 0.65}
        pattern="star8"
        primaryColor={ISLAMIC_COLORS.cobaltBlue}
        secondaryColor={ISLAMIC_COLORS.cream}
        accentColor={ISLAMIC_COLORS.gold}
      />

      {/* Decorative tile band along top of gate - offset to prevent z-fighting */}
      <mesh
        position={[
          gateFrameX + (data.doorSide === 0 ? 0 : data.doorSide === 2 ? 0 : (data.doorSide === 1 ? 0.15 : -0.15)),
          gateFrameY + gateFrameHeight * 0.28,
          gateFrameZ + (data.doorSide === 0 ? 0.15 : data.doorSide === 2 ? -0.15 : 0)
        ]}
        rotation={gateFrameRot}
        castShadow
      >
        <boxGeometry args={[gateFrameWidth * 0.88, gateFrameHeight * 0.1, 0.15]} />
        <meshStandardMaterial color="#7a5a3a" roughness={0.85} metalness={0} />
      </mesh>

      {/* Wall tile panels - Islamic geometric patterns on courtyard interior walls */}
      {seededRandom(localSeed + 470) > 0.35 && (
        <>
          <GeometricTile
            position={[0, -finalHeight / 2 + wingHeight * 0.4, -wingInset + wingDepth / 2 + 0.05]}
            rotation={[0, 0, 0]}
            size={courtyardSize * 0.28}
            pattern={seededRandom(localSeed + 471) > 0.5 ? 'arabesque' : 'star6'}
            primaryColor={ISLAMIC_COLORS.turquoise}
            secondaryColor={ISLAMIC_COLORS.cream}
            accentColor={ISLAMIC_COLORS.gold}
          />
          <GeometricTile
            position={[-wingInset + wingDepth / 2 + 0.05, -finalHeight / 2 + wingHeight * 0.4, 0]}
            rotation={[0, Math.PI / 2, 0]}
            size={courtyardSize * 0.24}
            pattern="hexagonal"
            primaryColor={ISLAMIC_COLORS.deepGreen}
            secondaryColor={ISLAMIC_COLORS.cream}
            accentColor={ISLAMIC_COLORS.gold}
          />
        </>
      )}

      {/* Window tile frame accents - offset from wall */}
      {hasMashrabiya && (
        <mesh
          position={[halfSize + 0.08, -finalHeight / 2 + wingHeight * 0.55, 0]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        >
          <boxGeometry args={[finalBuildingSize * 0.32, wingHeight * 0.32, 0.15]} />
          <meshStandardMaterial color="#caa77b" roughness={0.85} metalness={0} />
        </mesh>
      )}

      {/* Ornate Islamic courtyard fountain */}
      <OrnateFountain
        position={[0, courtyardFloorY, 0]}
        scale={courtyardSize * 0.18}
        variant={fountainVariant === 0 ? 'tiered' : fountainVariant === 1 ? 'octagonal' : 'tiered'}
        hasWaterAnimation={true}
      />

      {/* Geometric tile pattern on courtyard floor - placed around fountain */}
      {seededRandom(localSeed + 420) > 0.3 && (
        <>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([dx, dz], i) => (
            <GeometricTile
              key={`floor-tile-${i}`}
              position={[
                dx * courtyardSize * 0.28,
                courtyardFloorY + 0.01,
                dz * courtyardSize * 0.28
              ]}
              rotation={[-Math.PI / 2, 0, seededRandom(localSeed + 425 + i) * Math.PI * 2]}
              size={courtyardSize * 0.22}
              pattern={['star8', 'star6', 'hexagonal', 'arabesque'][i % 4] as 'star8' | 'star6' | 'hexagonal' | 'arabesque'}
              primaryColor={ISLAMIC_COLORS.cobaltBlue}
              secondaryColor={ISLAMIC_COLORS.cream}
              accentColor={ISLAMIC_COLORS.gold}
            />
          ))}
        </>
      )}

      {/* Arcade columns at courtyard corners */}
      {seededRandom(localSeed + 430) > 0.4 && (
        <>
          {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([dx, dz], i) => (
            <ArcadeColumn
              key={`col-${i}`}
              position={[
                dx * (courtyardSize * 0.4 - wingDepth * 0.3),
                courtyardFloorY,
                dz * (courtyardSize * 0.4 - wingDepth * 0.3)
              ]}
              height={wingHeight * 0.7}
              color={seededRandom(localSeed + 435 + i) > 0.5 ? ISLAMIC_COLORS.limestone : ISLAMIC_COLORS.sandstone}
            />
          ))}
        </>
      )}

      {/* Decorative urns along courtyard edges */}
      {seededRandom(localSeed + 450) > 0.35 && (
        <>
          {[0, 1, 2, 3].map((corner) => {
            if (seededRandom(localSeed + 455 + corner) < 0.5) return null;
            const cx = corner < 2 ? -1 : 1;
            const cz = corner % 2 === 0 ? -1 : 1;
            return (
              <DecorativeUrn
                key={`urn-${corner}`}
                position={[
                  cx * courtyardSize * 0.38,
                  courtyardFloorY,
                  cz * courtyardSize * 0.38
                ]}
                scale={0.55}
                variant={['amphora', 'vase', 'jar'][corner % 3] as 'amphora' | 'vase' | 'jar'}
                color={[ISLAMIC_COLORS.terracotta, ISLAMIC_COLORS.cobaltBlue, ISLAMIC_COLORS.turquoise][corner % 3]}
              />
            );
          })}
        </>
      )}

      {/* Courtyard tree */}
      <mesh position={[-treeOffset, courtyardFloorY + 0.6, treeOffset]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 8]} />
        <meshStandardMaterial color="#6b4a2e" roughness={0.95} metalness={0} />
      </mesh>
      <mesh position={[-treeOffset, courtyardFloorY + 1.5, treeOffset]} castShadow>
        <sphereGeometry args={[0.9, 10, 10]} />
        <meshStandardMaterial color="#5b7a46" roughness={0.9} metalness={0} />
      </mesh>

      {/* Pots */}
      <mesh position={[potOffset, courtyardFloorY + 0.18, -potOffset]} castShadow receiveShadow>
        <cylinderGeometry args={[0.28, 0.36, 0.35, 10]} />
        <primitive object={potMat} />
      </mesh>
      <mesh position={[potOffset + 0.5, courtyardFloorY + 0.16, -potOffset + 0.4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.3, 0.3, 10]} />
        <primitive object={potMat} />
      </mesh>
      <mesh position={[-potOffset + 0.4, courtyardFloorY + 0.16, potOffset]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.28, 0.28, 10]} />
        <primitive object={potMat} />
      </mesh>
      <mesh position={[-potOffset + 0.4, courtyardFloorY + 0.42, potOffset]} castShadow>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#5c8a4f" roughness={0.9} />
      </mesh>

      {/* Vines */}
      <mesh position={[0, -finalHeight / 2 + vineHeight / 2, -courtyardSize / 2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[courtyardSize * 0.7, vineHeight]} />
        <primitive object={vineMat} />
      </mesh>
      <mesh position={[courtyardSize / 2, -finalHeight / 2 + vineHeight / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[courtyardSize * 0.6, vineHeight * 0.9]} />
        <primitive object={vineMat} />
      </mesh>
    </group>
  );
};
