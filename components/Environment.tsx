
import React, { useMemo, useRef, useState, useEffect, useContext } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { CONSTANTS, BuildingMetadata, BuildingType, DistrictType, getDistrictType } from '../types';
import { generateBuildingMetadata, seededRandom } from '../utils/procedural';

// Utility to generate a procedural noise texture to avoid external loading errors
const createNoiseTexture = (size = 256, opacity = 0.2) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const val = Math.random() * 255;
    imageData.data[i] = val;
    imageData.data[i + 1] = val;
    imageData.data[i + 2] = val;
    imageData.data[i + 3] = 255 * opacity;
  }
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const createBlotchTexture = (size = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 40 + Math.random() * 120;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255,255,255,0.12)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
};

const HOVER_WIREFRAME_COLORS = {
  default: '#3bdc7f',
  poi: '#f4c542',
  danger: '#ef5a4c'
};

const HoverWireframeContext = React.createContext(false);
const HoverLabelContext = React.createContext(false);

const useHoverFade = (ref: React.RefObject<THREE.Object3D>, active: boolean, opacity = 0.35) => {
  const originals = useRef(new Map<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean }>());

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!originals.current.has(mat)) {
          originals.current.set(mat, {
            opacity: mat.opacity ?? 1,
            transparent: mat.transparent ?? false,
            depthWrite: mat.depthWrite ?? true
          });
        }
        if (active) {
          mat.transparent = true;
          mat.opacity = Math.min(mat.opacity ?? 1, opacity);
          mat.depthWrite = false;
          mat.needsUpdate = true;
        } else {
          const original = originals.current.get(mat);
          if (original) {
            mat.opacity = original.opacity;
            mat.transparent = original.transparent;
            mat.depthWrite = original.depthWrite;
            mat.needsUpdate = true;
          }
        }
      });
    });
  }, [active, opacity, ref]);
};

const HoverOutlineBox: React.FC<{ size: [number, number, number]; color: string; opacity?: number; position?: [number, number, number] }> = ({ size, color, opacity = 0.85, position }) => {
  const geometry = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0], size[1], size[2])), [size[0], size[1], size[2]]);
  const material = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }), [color, opacity]);
  return <lineSegments geometry={geometry} material={material} position={position} />;
};

const HoverLabel: React.FC<{ title: string; lines?: string[]; offset?: [number, number, number] }> = ({ title, lines = [], offset = [0, 1.4, 0] }) => (
  <Html position={offset} center>
    <div className="pointer-events-none rounded-lg border border-amber-700/40 bg-black/70 px-3 py-2 text-[10px] uppercase tracking-widest text-amber-200 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="text-[11px] text-amber-400">{title}</div>
      {lines.length > 0 && (
        <div className="mt-1 space-y-0.5 text-[9px] text-amber-200/70">
          {lines.slice(0, 4).map((line, index) => (
            <div key={`${title}-line-${index}`}>{line}</div>
          ))}
        </div>
      )}
    </div>
  </Html>
);

const HoverableGroup: React.FC<{
  position?: [number, number, number];
  boxSize: [number, number, number];
  boxOffset?: [number, number, number];
  color?: string;
  labelTitle?: string;
  labelLines?: string[];
  labelOffset?: [number, number, number];
  children: React.ReactNode;
}> = ({ position, boxSize, boxOffset, color = HOVER_WIREFRAME_COLORS.default, labelTitle, labelLines, labelOffset, children }) => {
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  useHoverFade(groupRef, wireframeEnabled && hovered);

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {children}
      {labelEnabled && hovered && labelTitle && <HoverLabel title={labelTitle} lines={labelLines} offset={labelOffset} />}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={boxSize} color={color} position={boxOffset} />
          <HoverOutlineBox size={[boxSize[0] * 1.04, boxSize[1] * 1.04, boxSize[2] * 1.04]} color={color} opacity={0.35} position={boxOffset} />
        </>
      )}
    </group>
  );
};

const createStripeTexture = (colorA: string, colorB: string, stripeCount = 10) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const stripeWidth = canvas.width / stripeCount;
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
    ctx.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
};
// Color palettes for different districts and building functions
const BUILDING_PALETTES = {
  [BuildingType.RESIDENTIAL]: { color: '#d6ccb7', metalness: 0, roughness: 0.85 },
  [BuildingType.COMMERCIAL]: { color: '#a68a64', metalness: 0, roughness: 1.0 },
  [BuildingType.RELIGIOUS]: { color: '#e8dcc4', metalness: 0.05, roughness: 0.7 },
  [BuildingType.CIVIC]: { color: '#d4a373', metalness: 0.1, roughness: 0.65 },
};

interface EnvironmentProps {
  mapX: number;
  mapY: number;
  onGroundClick?: (point: THREE.Vector3) => void;
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void;
  nearBuildingId?: string | null;
  timeOfDay?: number;
  enableHoverWireframe?: boolean;
  enableHoverLabel?: boolean;
}

const Awning: React.FC<{ material: THREE.Material; position: [number, number, number]; rotation: [number, number, number]; width: number; seed: number }> = ({ material, position, rotation, width, seed }) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = rotation[0] + Math.sin(state.clock.elapsedTime + seed) * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation} castShadow receiveShadow>
       <planeGeometry args={[width, 3]} />
       <primitive object={material} />
    </mesh>
  );
};

const Torch: React.FC<{ position: [number, number, number]; rotation: [number, number, number]; intensity: number }> = ({ position, rotation, intensity }) => {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
        <meshStandardMaterial color="#3b2a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.25, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 0.2, 8]} />
        <meshStandardMaterial color="#5a3b25" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.12, 10, 10]} />
        <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={intensity * 1.2} />
      </mesh>
    </group>
  );
};

const PotTree: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.1, 1.0, 1.1]}
    labelTitle="Potted Olive Tree"
    labelLines={['Fragrant foliage', 'Terracotta pot', 'Shaded fruit']}
    labelOffset={[0, 1.1, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.35, 0.45, 0.4, 10]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.45, 0]} castShadow>
      <sphereGeometry args={[0.45, 10, 8]} />
      <meshStandardMaterial color="#4b6b3a" roughness={0.9} />
    </mesh>
  </HoverableGroup>
);

const GeraniumPot: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[0.9, 1.0, 0.9]}
    labelTitle="Geranium Pot"
    labelLines={['Flowering blooms', 'Clay planter', 'Gardened by locals']}
    labelOffset={[0, 1.0, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.3, 0.4, 0.35, 10]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.9} />
    </mesh>
    <mesh position={[0, 0.35, 0]} castShadow>
      <sphereGeometry args={[0.35, 10, 8]} />
      <meshStandardMaterial color="#4b6b3a" roughness={0.9} />
    </mesh>
    <mesh position={[0.12, 0.55, 0.05]} castShadow>
      <sphereGeometry args={[0.08, 8, 8]} />
      <meshStandardMaterial color="#c43b3b" roughness={0.85} />
    </mesh>
    <mesh position={[-0.08, 0.58, -0.06]} castShadow>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshStandardMaterial color="#d14848" roughness={0.85} />
    </mesh>
    <mesh position={[0.02, 0.62, 0.12]} castShadow>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshStandardMaterial color="#b83333" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const PlazaCat: React.FC<{ waypoints: [number, number, number][] }> = ({ waypoints }) => {
  const catRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const state = useRef({ targetIndex: 0, mode: 'sleep', timer: 0 });

  useFrame((_, delta) => {
    if (!catRef.current || !groupRef.current) return;
    const current = groupRef.current.position;
    state.current.timer -= delta;

    if (state.current.mode === 'sleep') {
      groupRef.current.rotation.z = Math.sin(state.current.timer * 2) * 0.04;
      if (tailRef.current) tailRef.current.rotation.y = Math.sin(state.current.timer * 1.5) * 0.3;
      if (state.current.timer <= 0) {
        state.current.mode = 'walk';
        state.current.targetIndex = (state.current.targetIndex + 1) % waypoints.length;
        state.current.timer = 6 + Math.random() * 6;
      }
      return;
    }

    const target = new THREE.Vector3(...waypoints[state.current.targetIndex]);
    const dir = target.clone().sub(current);
    const dist = dir.length();
    if (dist < 0.1) {
      state.current.mode = 'sleep';
      state.current.timer = 8 + Math.random() * 10;
      return;
    }
    dir.normalize();
    current.add(dir.multiplyScalar(delta * 0.6));
    groupRef.current.lookAt(target);
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(state.current.timer * 4) * 0.2;
    if (headRef.current) headRef.current.rotation.y = Math.sin(state.current.timer * 3) * 0.1;
  });

  useHoverFade(groupRef, wireframeEnabled && hovered);

  return (
    <group
      ref={groupRef}
      position={waypoints[0]}
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
          title="Market Cat"
          lines={['Local stray', 'Dozing between strolls', 'Likes warm benches']}
          offset={[0, 0.6, 0]}
        />
      )}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={[0.6, 0.4, 0.6]} color={HOVER_WIREFRAME_COLORS.default} />
          <HoverOutlineBox size={[0.65, 0.44, 0.65]} color={HOVER_WIREFRAME_COLORS.default} opacity={0.35} />
        </>
      )}
      <group ref={catRef}>
        <mesh position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.14, 0.3, 8]} />
          <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
        </mesh>
      <mesh position={[0.18, 0.16, 0]} castShadow ref={headRef}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[0.22, 0.23, 0.04]} castShadow>
        <coneGeometry args={[0.03, 0.05, 6]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[0.22, 0.23, -0.04]} castShadow>
        <coneGeometry args={[0.03, 0.05, 6]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[0.24, 0.16, 0.04]} castShadow>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#111111" roughness={1} />
      </mesh>
      <mesh position={[0.24, 0.16, -0.04]} castShadow>
        <sphereGeometry args={[0.008, 6, 6]} />
        <meshStandardMaterial color="#111111" roughness={1} />
      </mesh>
      <mesh position={[0.26, 0.14, 0]} castShadow>
        <sphereGeometry args={[0.007, 6, 6]} />
        <meshStandardMaterial color="#2a1a12" roughness={1} />
      </mesh>
      <mesh position={[0.08, 0.04, 0.06]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[0.08, 0.04, -0.06]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[-0.08, 0.04, 0.06]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
      <mesh position={[-0.08, 0.04, -0.06]} castShadow>
        <boxGeometry args={[0.05, 0.08, 0.05]} />
        <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
      </mesh>
        <mesh ref={tailRef} position={[-0.2, 0.14, 0]} rotation={[0, 0.6, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.25, 6]} />
          <meshStandardMaterial color="#5b4a3b" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
};

const ClayJar: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[0.7, 0.7, 0.7]}
    labelTitle="Clay Jar"
    labelLines={['Water storage', 'Hand-thrown', 'Market utility']}
    labelOffset={[0, 0.9, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.25, 0.35, 0.6, 10]} />
      <meshStandardMaterial color="#a9703a" roughness={0.95} />
    </mesh>
  </HoverableGroup>
);

const Amphora: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[0.9, 1.1, 0.9]}
    labelTitle="Amphora"
    labelLines={['Storage vessel', 'Fired clay', 'Stamped shoulder']}
    labelOffset={[0, 1.1, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.2, 0.35, 0.7, 10]} />
      <meshStandardMaterial color="#a06b3a" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.35, 0]} castShadow>
      <sphereGeometry args={[0.28, 10, 8]} />
      <meshStandardMaterial color="#a06b3a" roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.72, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.16, 0.2, 10]} />
      <meshStandardMaterial color="#8f5f33" roughness={0.95} />
    </mesh>
  </HoverableGroup>
);

const StoneSculpture: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.0, 1.1, 1.0]}
    labelTitle="Stone Plinth"
    labelLines={['Decorative carving', 'Local limestone', 'Weathered edges']}
    labelOffset={[0, 1.1, 0]}
  >
    <mesh castShadow>
      <boxGeometry args={[0.8, 0.3, 0.8]} />
      <meshStandardMaterial color="#b79e7f" roughness={0.85} />
    </mesh>
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.25, 0.3, 0.7, 10]} />
      <meshStandardMaterial color="#a98963" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const CornerTurret: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[1.6, 2.8, 1.6]}
    labelTitle="Roof Turret"
    labelLines={['Defensive lookout', 'Baked brick', 'City skyline mark']}
    labelOffset={[0, 2.3, 0]}
  >
    <mesh castShadow>
      <cylinderGeometry args={[0.6, 0.7, 2.2, 12]} />
      <meshStandardMaterial color="#c9b79d" roughness={0.85} />
    </mesh>
    <mesh position={[0, 1.2, 0]} castShadow>
      <coneGeometry args={[0.7, 0.6, 10]} />
      <meshStandardMaterial color="#b79e7f" roughness={0.85} />
    </mesh>
  </HoverableGroup>
);

const Bench: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <HoverableGroup
    position={position}
    boxSize={[2.2, 0.6, 1.1]}
    labelTitle="Stone Bench"
    labelLines={['Resting place', 'Cool limestone', 'Market shade']}
    labelOffset={[0, 0.6, 0]}
  >
    <mesh castShadow>
      <boxGeometry args={[1.8, 0.2, 0.7]} />
      <meshStandardMaterial color="#a98963" roughness={0.9} />
    </mesh>
    <mesh position={[-0.6, -0.1, 0]} castShadow>
      <boxGeometry args={[0.2, 0.2, 0.7]} />
      <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
    </mesh>
    <mesh position={[0.6, -0.1, 0]} castShadow>
      <boxGeometry args={[0.2, 0.2, 0.7]} />
      <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
    </mesh>
  </HoverableGroup>
);

const Building: React.FC<{ 
  data: BuildingMetadata; 
  mainMaterial: THREE.Material; 
  otherMaterials: any;
  isNear: boolean;
  torchIntensity: number;
  district: DistrictType;
  nightFactor: number;
}> = ({ data, mainMaterial, otherMaterials, isNear, torchIntensity, district, nightFactor }) => {
  const wireframeEnabled = useContext(HoverWireframeContext);
  const labelEnabled = useContext(HoverLabelContext);
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const localSeed = data.position[0] * 1000 + data.position[2];
  const baseHeight = data.type === BuildingType.RELIGIOUS || data.type === BuildingType.CIVIC ? 12 : 4 + seededRandom(localSeed + 1) * 6;
  const districtScale = district === 'WEALTHY' ? 1.35 : district === 'HOVELS' ? 0.7 : district === 'CIVIC' ? 1.2 : 1.0;
  const height = baseHeight * districtScale;
  const buildingSize = CONSTANTS.BUILDING_SIZE * districtScale;
  const buildingMaterial = useMemo(() => {
    if (!(mainMaterial instanceof THREE.MeshStandardMaterial)) return mainMaterial;
    const mat = mainMaterial.clone();
    const color = mat.color.clone();
    if (data.type === BuildingType.RESIDENTIAL) {
      const hueShift = (seededRandom(localSeed + 7) - 0.5) * 0.03;
      const lightShift = (seededRandom(localSeed + 33) - 0.5) * 0.08;
      color.offsetHSL(hueShift, -0.02, lightShift);
      mat.color.copy(color);
      const roughnessJitter = (seededRandom(localSeed + 55) - 0.5) * 0.1;
      mat.roughness = THREE.MathUtils.clamp(0.8 + roughnessJitter, 0.65, 0.9);
      mat.metalness = 0.03;
      mat.envMapIntensity = 1.35;
    }
    mat.needsUpdate = true;
    return mat;
  }, [data.type, localSeed, mainMaterial]);
  const baseResidentialColor = useMemo(() => {
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return null;
    return buildingMaterial.color.clone();
  }, [buildingMaterial]);

  useEffect(() => {
    if (!(buildingMaterial instanceof THREE.MeshStandardMaterial)) return;
    if (!baseResidentialColor || data.type !== BuildingType.RESIDENTIAL) return;
    const nightTint = new THREE.Color('#6f7f96');
    const nightDarken = 1 - nightFactor * 0.55;
    const tinted = baseResidentialColor.clone().lerp(nightTint, nightFactor);
    tinted.multiplyScalar(nightDarken);
    buildingMaterial.color.copy(tinted);
    buildingMaterial.envMapIntensity = 1.35 - nightFactor * 0.9;
    buildingMaterial.needsUpdate = true;
  }, [buildingMaterial, baseResidentialColor, nightFactor, data.type]);

  // Door positioning based on metadata
  const doorRotation = data.doorSide * (Math.PI / 2);
  const doorOffset = buildingSize / 2 + 0.1;
  const doorPos: [number, number, number] = [0, -height / 2 + 1.25, 0];
  const doorVariant = Math.floor(seededRandom(localSeed + 21) * 3);
  
  if (data.doorSide === 0) doorPos[2] = doorOffset; // N
  else if (data.doorSide === 1) doorPos[0] = doorOffset; // E
  else if (data.doorSide === 2) doorPos[2] = -doorOffset; // S
  else if (data.doorSide === 3) doorPos[0] = -doorOffset; // W

  const activeGlow = isNear || hovered;
  const wireColor = data.isQuarantined ? HOVER_WIREFRAME_COLORS.danger : data.isPointOfInterest ? HOVER_WIREFRAME_COLORS.poi : HOVER_WIREFRAME_COLORS.default;
  useHoverFade(groupRef, wireframeEnabled && hovered, 0.35);
  const torchChance = seededRandom(localSeed + 17);
  const torchCount = torchChance > 0.97 ? 2 : torchChance > 0.9 ? 1 : 0;
  const torchOffsets: [number, number, number][] = [];
  if (torchCount >= 1) torchOffsets.push([buildingSize / 2 + 0.2, -height * 0.15, 0]);
  if (torchCount >= 2) torchOffsets.push([-buildingSize / 2 - 0.2, -height * 0.15, 0]);
  const hasMarketOrnaments = district === 'MARKET' && seededRandom(localSeed + 81) > 0.6;
  const hasResidentialClutter = district !== 'MARKET' && seededRandom(localSeed + 83) > 0.5;
  const clutterType = Math.floor(seededRandom(localSeed + 84) * 3);
  const ornamentType = Math.floor(seededRandom(localSeed + 82) * 3);
  const hasTurret = district === 'MARKET' && seededRandom(localSeed + 91) > 0.85;
  const hasWealthyDoorOrnaments = district === 'WEALTHY' && seededRandom(localSeed + 121) > 0.35;
  const hasWealthyWindowTrim = district === 'WEALTHY' && seededRandom(localSeed + 123) > 0.4;
  const hasCrenelation = seededRandom(localSeed + 141) > 0.75;
  const hasRoofCap = seededRandom(localSeed + 145) > 0.6;
  const hasParapetRing = seededRandom(localSeed + 149) > 0.7;
  const dirtBandHeight = height * 0.2;
  const crenelRef = useRef<THREE.InstancedMesh>(null);
  const crenelTemp = useMemo(() => new THREE.Object3D(), []);
  const crenelPositions = useMemo<[number, number, number][]>(() => {
    if (!hasCrenelation) return [];
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 12; i += 1) {
      const side = i % 4;
      const step = Math.floor(i / 4) - 1;
      const offset = buildingSize * 0.42;
      const x = side === 0 ? -offset : side === 1 ? offset : step * (buildingSize * 0.3);
      const z = side === 2 ? -offset : side === 3 ? offset : step * (buildingSize * 0.3);
      positions.push([x, 0, z]);
    }
    return positions;
  }, [buildingSize, hasCrenelation]);
  useEffect(() => {
    if (!crenelRef.current || crenelPositions.length === 0) return;
    crenelPositions.forEach((pos, index) => {
      crenelTemp.position.set(pos[0], pos[1], pos[2]);
      crenelTemp.updateMatrix();
      crenelRef.current!.setMatrixAt(index, crenelTemp.matrix);
    });
    crenelRef.current.instanceMatrix.needsUpdate = true;
  }, [crenelPositions, crenelTemp]);
  const doorOutwardOffset: [number, number, number] =
    data.doorSide === 0 ? [0, 0, 0.6]
    : data.doorSide === 1 ? [0.6, 0, 0]
    : data.doorSide === 2 ? [0, 0, -0.6]
    : [-0.6, 0, 0];
  const doorSideOffset: [number, number, number] =
    data.doorSide === 0 || data.doorSide === 2 ? [1.4, 0, 0] : [0, 0, 1.4];

  return (
    <group 
      ref={groupRef}
      position={[data.position[0], height / 2, data.position[2]]}
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
          title={data.type === BuildingType.RELIGIOUS ? 'Holy Sanctuary' : data.type === BuildingType.CIVIC ? "Governor's Office" : data.type === BuildingType.COMMERCIAL ? 'Merchant Stall' : 'Private Residence'}
          lines={[
            data.ownerName,
            data.ownerProfession,
            `Age ${data.ownerAge}`,
            data.isQuarantined ? 'Quarantined' : 'Open'
          ]}
          offset={[0, height / 2 + 1.4, 0]}
        />
      )}
      {wireframeEnabled && hovered && (
        <>
          <HoverOutlineBox size={[buildingSize * 1.02, height * 1.02, buildingSize * 1.02]} color={wireColor} />
          <HoverOutlineBox size={[buildingSize * 1.06, height * 1.06, buildingSize * 1.06]} color={wireColor} opacity={0.35} />
        </>
      )}
      {/* Main weathered sandstone structure */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[buildingSize, height, buildingSize]} />
        <primitive object={buildingMaterial} />
      </mesh>
      {/* Ambient dirt banding */}
      <mesh position={[0, -height * 0.35, 0]} receiveShadow>
        <boxGeometry args={[buildingSize * 1.01, dirtBandHeight, buildingSize * 1.01]} />
        <meshStandardMaterial color="#5e4b37" transparent opacity={0.18} roughness={1} />
      </mesh>
      
      {/* Dome for Religious/Civic */}
      {(data.type === BuildingType.RELIGIOUS || seededRandom(localSeed + 2) > 0.85) && (
        <mesh position={[0, height / 2, 0]} castShadow>
          <sphereGeometry args={[buildingSize / 2.2, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <primitive object={otherMaterials.dome[Math.floor(seededRandom(localSeed + 73) * otherMaterials.dome.length)]} />
        </mesh>
      )}
      {/* Subtle roof caps / parapet ring */}
      {hasRoofCap && (
        <mesh position={[0, height / 2 + 0.08, 0]} receiveShadow>
          <boxGeometry args={[buildingSize * 0.6, 0.16, buildingSize * 0.6]} />
          <meshStandardMaterial color="#9b7b4f" roughness={0.85} />
        </mesh>
      )}
      {hasParapetRing && (
        <mesh position={[0, height / 2 + 0.12, 0]} receiveShadow>
          <boxGeometry args={[buildingSize * 0.92, 0.18, buildingSize * 0.92]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.9} />
        </mesh>
      )}
      {hasCrenelation && (
        <instancedMesh ref={crenelRef} args={[undefined, undefined, crenelPositions.length]} position={[0, height / 2 + 0.2, 0]} receiveShadow>
          <boxGeometry args={[0.4, 0.3, 0.4]} />
          <meshStandardMaterial color="#a98963" roughness={0.95} />
        </instancedMesh>
      )}

      {/* DETAILED DOORWAY */}
      <group position={doorPos} rotation={[0, doorRotation, 0]}>
        {district === 'WEALTHY' && (
          <>
            <mesh position={[0, 0.1, -0.05]} castShadow>
              <boxGeometry args={[3.1, 3.2, 0.12]} />
              <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.7, 0.12]} castShadow>
              <boxGeometry args={[2.8, 0.25, 0.18]} />
              <meshStandardMaterial color="#7a5b42" roughness={0.9} />
            </mesh>
          </>
        )}
        {doorVariant === 0 && (
          <mesh castShadow>
            <boxGeometry args={[2.5, 2.5, 0.2]} />
            <meshStandardMaterial color="#4a3b2b" />
          </mesh>
        )}
        {doorVariant === 1 && (
          <>
            <mesh castShadow>
              <boxGeometry args={[2.4, 2.2, 0.2]} />
              <meshStandardMaterial color="#4a3b2b" />
            </mesh>
            <mesh position={[0, 1.05, 0.1]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
              <cylinderGeometry args={[1.0, 1.0, 0.2, 16, 1, false, 0, Math.PI]} />
              <meshStandardMaterial color="#4a3b2b" />
            </mesh>
          </>
        )}
        {doorVariant === 2 && (
          <>
            <mesh castShadow>
              <boxGeometry args={[2.8, 2.8, 0.2]} />
              <meshStandardMaterial color="#5b4634" />
            </mesh>
            <mesh position={[0, 0, 0.12]} castShadow>
              <boxGeometry args={[2.3, 2.3, 0.15]} />
              <meshStandardMaterial color="#3d2e21" />
            </mesh>
          </>
        )}
        <mesh position={[0, -1.35, 0.25]} receiveShadow>
          <boxGeometry args={[2.8, 0.2, 0.6]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        {/* Door Panels */}
        <mesh position={[0, 0, 0.1]} castShadow>
           <boxGeometry args={[1.8, 2.3, 0.1]} />
           <meshStandardMaterial 
             color={activeGlow ? "#8b4513" : "#3d2817"} 
             emissive={activeGlow ? "#fbbf24" : "black"}
             emissiveIntensity={activeGlow ? 0.3 : 0}
             roughness={0.8}
           />
        </mesh>
        {doorVariant === 1 && (
          <mesh position={[0, 1.15, 0.1]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.9, 0.9, 0.1, 16, 1, false, 0, Math.PI]} />
            <meshStandardMaterial color={activeGlow ? "#fbbf24" : "#3d2817"} emissive={activeGlow ? "#fbbf24" : "black"} emissiveIntensity={activeGlow ? 0.2 : 0} />
          </mesh>
        )}
      </group>

      {/* Roof Parapet / Cap for Wealthy */}
      {district === 'WEALTHY' && seededRandom(localSeed + 31) > 0.6 && (
        <>
          <mesh position={[0, height / 2 + 0.15, 0]} castShadow>
            <boxGeometry args={[buildingSize + 0.6, 0.3, buildingSize + 0.6]} />
            <meshStandardMaterial color="#c9b79d" roughness={0.9} />
          </mesh>
          <mesh position={[0, height / 2 + 0.35, 0]} castShadow>
            <boxGeometry args={[buildingSize + 0.4, 0.08, buildingSize + 0.4]} />
            <meshStandardMaterial color="#bfae96" roughness={0.85} />
          </mesh>
          {seededRandom(localSeed + 37) > 0.7 && (
            <mesh position={[0, height / 2 + 0.6, 0]} castShadow>
              <sphereGeometry args={[buildingSize / 4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#bda88b" roughness={0.8} />
            </mesh>
          )}
        </>
      )}

      {/* WINDOWS (Mashrabiya-style visual) */}
      {[0, 1, 2, 3].map((side) => {
        if (side === data.doorSide && seededRandom(localSeed + side) < 0.8) return null;
        
        const sideRand = seededRandom(localSeed + side + 10);
        if (sideRand < 0.3) return null;

        const rot = side * (Math.PI / 2);
        const off = buildingSize / 2 + 0.05;
        const wPos: [number, number, number] = [0, height / 2 - 2, 0];
        if (side === 0) wPos[2] = off;
        else if (side === 1) wPos[0] = off;
        else if (side === 2) wPos[2] = -off;
        else if (side === 3) wPos[0] = -off;

        const windowGlowRoll = seededRandom(localSeed + side + 120);
        const hasGlow = windowGlowRoll > 0.5 && nightFactor > 0.2;
        const glowIntensity = windowGlowRoll > 0.9 ? 0.5 : 0.25;
        return (
          <group key={side} position={wPos} rotation={[0, rot, 0]}>
            <mesh position={[0, 0, -0.08]} receiveShadow>
              <boxGeometry args={[data.hasSymmetricalWindows ? 2.6 : 1.4, 2.1, 0.08]} />
              <meshStandardMaterial color="#1f140a" roughness={1} />
            </mesh>
            <mesh position={data.hasSymmetricalWindows ? [-1, 0, 0] : [0, 0, 0]}>
               <boxGeometry args={[1.2, 1.8, 0.1]} />
               <meshStandardMaterial color="#2a1a0a" roughness={1} />
            </mesh>
            {data.hasSymmetricalWindows && (
              <mesh position={[1, 0, 0]}>
                <boxGeometry args={[1.2, 1.8, 0.1]} />
                <meshStandardMaterial color="#2a1a0a" roughness={1} />
              </mesh>
            )}
            {hasGlow && (
              <>
                <mesh position={[0, 0, 0.06]}>
                  <boxGeometry args={[1.0, 1.5, 0.02]} />
                  <meshStandardMaterial color="#f5d7a3" emissive="#f2b760" emissiveIntensity={glowIntensity} roughness={0.9} metalness={0.05} />
                </mesh>
                {data.hasSymmetricalWindows && (
                  <mesh position={[1, 0, 0.06]}>
                    <boxGeometry args={[1.0, 1.5, 0.02]} />
                    <meshStandardMaterial color="#f5d7a3" emissive="#f2b760" emissiveIntensity={glowIntensity} roughness={0.9} metalness={0.05} />
                  </mesh>
                )}
              </>
            )}
            {hasWealthyWindowTrim && (
              <mesh position={[0, 0, 0.08]} castShadow>
                <boxGeometry args={[1.6, 2.2, 0.08]} />
                <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
              </mesh>
            )}
            {district === 'MARKET' && seededRandom(localSeed + side + 22) > 0.7 && (
              <mesh position={[0, 0, 0.08]} castShadow>
                <boxGeometry args={[1.4, 2.0, 0.08]} />
                <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
              </mesh>
            )}
          </group>
        );
      })}
      
      {/* Animated Awnings */}
      {(data.type === BuildingType.COMMERCIAL || seededRandom(localSeed + 3) > 0.6) && (
        <Awning 
          material={seededRandom(localSeed + 5) > 0.5 
            ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 6) * otherMaterials.awningStriped.length)]
            : otherMaterials.awning[
                Math.floor(
                  seededRandom(localSeed + 4) *
                    (district === 'WEALTHY' ? otherMaterials.awning.length : 4)
                )
              ]}
          position={[0, -height / 2 + height * 0.4, buildingSize / 2 + 1.5]}
          rotation={[0.3, 0, 0]}
          width={buildingSize * 0.8}
          seed={localSeed}
        />
      )}

      {/* Secondary Awning / Beam Protrusions */}
      {seededRandom(localSeed + 61) > 0.75 && (
        <Awning 
          material={seededRandom(localSeed + 63) > 0.5 
            ? otherMaterials.awningStriped[Math.floor(seededRandom(localSeed + 64) * otherMaterials.awningStriped.length)]
            : otherMaterials.awning[
                Math.floor(
                  seededRandom(localSeed + 62) *
                    (district === 'WEALTHY' ? otherMaterials.awning.length : 4)
                )
              ]}
          position={[0, -height / 2 + height * 0.55, -buildingSize / 2 - 1.2]}
          rotation={[0.25, Math.PI, 0]}
          width={buildingSize * 0.6}
          seed={localSeed + 2}
        />
      )}
      {seededRandom(localSeed + 71) > 0.6 && (
        <group>
          {[0, 1, 2].map((i) => (
            <mesh key={`beam-${i}`} position={[buildingSize / 2 + 0.4, -height / 2 + 1 + i * 1.4, (i - 1) * 1.2]} castShadow>
              <boxGeometry args={[0.6, 0.15, 0.15]} />
              <meshStandardMaterial color="#3d2817" roughness={1} />
            </mesh>
          ))}
        </group>
      )}

      {hasMarketOrnaments && (
        <group position={[0, -height / 2, 0]}>
          {ornamentType === 0 && <PotTree position={[buildingSize / 2 + 0.8, 0.2, 1.2]} />}
          {ornamentType === 1 && (
            <>
              <ClayJar position={[buildingSize / 2 + 0.7, 0.3, 1]} />
              <ClayJar position={[buildingSize / 2 + 1.1, 0.3, 1.3]} />
            </>
          )}
          {ornamentType === 2 && <PotTree position={[-buildingSize / 2 - 0.8, 0.2, -1.2]} />}
        </group>
      )}
      {hasResidentialClutter && (
        <group position={[0, -height / 2, 0]}>
          {clutterType === 0 && <Amphora position={[buildingSize / 2 + 0.9, 0.25, -1.1]} />}
          {clutterType === 1 && <PotTree position={[-buildingSize / 2 - 0.9, 0.2, 1.1]} />}
          {clutterType === 2 && <StoneSculpture position={[buildingSize / 2 + 0.7, 0.2, 1.3]} />}
        </group>
      )}
      {hasWealthyDoorOrnaments && (
        <group position={[0, -height / 2, 0]}>
          <PotTree position={[
            doorPos[0] + doorOutwardOffset[0] + doorSideOffset[0],
            0.2,
            doorPos[2] + doorOutwardOffset[2] + doorSideOffset[2]
          ]} />
          <PotTree position={[
            doorPos[0] + doorOutwardOffset[0] - doorSideOffset[0],
            0.2,
            doorPos[2] + doorOutwardOffset[2] - doorSideOffset[2]
          ]} />
        </group>
      )}

      {hasTurret && (
        <CornerTurret position={[buildingSize / 2 - 0.6, height / 2 - 1.1, buildingSize / 2 - 0.6]} />
      )}

      {/* Wall Torches */}
      {torchOffsets.map((offset, index) => (
        <Torch
          key={`torch-${data.id}-${index}`}
          position={[offset[0], offset[1], offset[2]]}
          rotation={[0, offset[0] > 0 ? Math.PI / 2 : -Math.PI / 2, 0]}
          intensity={torchIntensity}
        />
      ))}
    </group>
  );
};

export const Buildings: React.FC<{ 
  mapX: number, 
  mapY: number, 
  onBuildingsGenerated?: (buildings: BuildingMetadata[]) => void,
  nearBuildingId?: string | null,
  torchIntensity: number;
  nightFactor: number;
}> = ({ mapX, mapY, onBuildingsGenerated, nearBuildingId, torchIntensity, nightFactor }) => {
  const noiseTexture = useMemo(() => createNoiseTexture(256, 0.35), []);

  const materials = useMemo(() => {
    const matMap = new Map<BuildingType, THREE.MeshStandardMaterial>();
    Object.entries(BUILDING_PALETTES).forEach(([type, props]) => {
      const applyTexture = type === BuildingType.COMMERCIAL || type === BuildingType.CIVIC;
      matMap.set(type as BuildingType, new THREE.MeshStandardMaterial({
        ...props,
        map: applyTexture ? noiseTexture : null,
        bumpMap: applyTexture ? noiseTexture : null,
        bumpScale: applyTexture ? 0.02 : 0,
      }));
    });
    return matMap;
  }, [noiseTexture]);

  const otherMaterials = useMemo(() => ({
    wood: new THREE.MeshStandardMaterial({ color: '#3d2817', roughness: 1.0 }),
    dome: [
      new THREE.MeshStandardMaterial({ color: '#b8a98e', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#a6947a', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#c7b89c', roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: '#b8c3c9', roughness: 0.7 }) // pale blue
    ],
    awning: [
      new THREE.MeshStandardMaterial({ color: '#d9c9a8', side: THREE.DoubleSide }), // cream
      new THREE.MeshStandardMaterial({ color: '#cdbb9a', side: THREE.DoubleSide }), // light tan
      new THREE.MeshStandardMaterial({ color: '#c3ab85', side: THREE.DoubleSide }), // earth
      new THREE.MeshStandardMaterial({ color: '#e4d6b5', side: THREE.DoubleSide }), // light linen
      new THREE.MeshStandardMaterial({ color: '#3b4f6b', side: THREE.DoubleSide }), // indigo (wealthy)
      new THREE.MeshStandardMaterial({ color: '#4a356a', side: THREE.DoubleSide }), // purple (wealthy)
      new THREE.MeshStandardMaterial({ color: '#2f4f7a', side: THREE.DoubleSide }), // blue (wealthy)
      new THREE.MeshStandardMaterial({ color: '#b0813a', side: THREE.DoubleSide }), // ochre (wealthy)
    ],
    awningStriped: [
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#f3ead6', '#d9c9a8'), side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#e6d6b8', '#bfae8d'), side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ map: createStripeTexture('#e6d6b8', '#c6cdb2'), side: THREE.DoubleSide })
    ]
  }), []);

  const metadata = useMemo(() => {
    const bldMetadata: BuildingMetadata[] = [];
    const district = getDistrictType(mapX, mapY);
    const size = CONSTANTS.MARKET_SIZE * (district === 'WEALTHY' ? 1.1 : district === 'HOVELS' ? 0.9 : 1.0);
    const baseBuilding = CONSTANTS.BUILDING_SIZE * (district === 'WEALTHY' ? 1.2 : district === 'HOVELS' ? 0.75 : 1.0);
    const street = CONSTANTS.STREET_WIDTH * (district === 'WEALTHY' ? 1.6 : district === 'HOVELS' ? 0.7 : 1.0);
    const gap = baseBuilding + street;
    let seed = (mapX * 100) + mapY;

    for (let x = -size; x <= size; x += gap) {
      for (let z = -size; z <= size; z += gap) {
        const localSeed = seed + Math.abs(x) * 1000 + Math.abs(z);
        const chance = seededRandom(localSeed);
        if (chance < 0.3) continue; 
        if (mapX === 0 && mapY === 0 && Math.abs(x) < gap * 1.5 && Math.abs(z) < gap * 1.5) continue;
        const data = generateBuildingMetadata(localSeed, x, z);
        bldMetadata.push(data);
      }
    }
    return bldMetadata;
  }, [mapX, mapY]);

  React.useEffect(() => {
    onBuildingsGenerated?.(metadata);
  }, [metadata, onBuildingsGenerated]);

  return (
    <group>
      {metadata.map((data) => (
        <Building 
          key={data.id} 
          data={data} 
          mainMaterial={materials.get(data.type) || materials.get(BuildingType.RESIDENTIAL)!}
          otherMaterials={otherMaterials}
          isNear={nearBuildingId === data.id}
          torchIntensity={torchIntensity}
          district={getDistrictType(mapX, mapY)}
          nightFactor={nightFactor}
        />
      ))}
    </group>
  );
};

export const Ground: React.FC<{ onClick?: (point: THREE.Vector3) => void; district: DistrictType; seed: number }> = ({ onClick, district, seed }) => {
  const roughnessTexture = useMemo(() => createNoiseTexture(128, 0.05), []);
  const blotchTexture = useMemo(() => createBlotchTexture(512), []);

  const groundPalette = useMemo(() => ({
    MARKET: ['#e3c595', '#dbbe8e', '#d4b687', '#cdae80', '#c6a679'],
    WEALTHY: ['#d7d1c4', '#cfc7b6'],
    HOVELS: ['#d7b68e', '#cfad86'],
    CIVIC: ['#d8c2a0', '#d1b896'],
    DEFAULT: ['#e2c8a2', '#dbc29a']
  }), []);
  const pick = (list: string[]) => list[Math.floor(seed * list.length) % list.length];
  const baseColor = district === 'MARKET' ? pick(groundPalette.MARKET)
    : district === 'WEALTHY' ? pick(groundPalette.WEALTHY)
    : district === 'HOVELS' ? pick(groundPalette.HOVELS)
    : district === 'CIVIC' ? pick(groundPalette.CIVIC)
    : pick(groundPalette.DEFAULT);
  const overlayColor = district === 'WEALTHY' ? '#c3b9a9'
    : district === 'HOVELS' ? '#caa77b'
    : '#d2b483';

  const groundMaterial = useMemo(() => {
    if (roughnessTexture) {
      roughnessTexture.repeat.set(6, 6);
    }
    return new THREE.MeshStandardMaterial({ 
      color: baseColor, 
      roughness: 0.95, 
      metalness: 0,
      roughnessMap: roughnessTexture || null,
      bumpMap: roughnessTexture || null,
      bumpScale: 0.0035
    });
  }, [roughnessTexture, baseColor]);

  const groundOverlayMaterial = useMemo(() => {
    if (blotchTexture) {
      blotchTexture.repeat.set(2, 2);
    }
    return new THREE.MeshStandardMaterial({
      color: overlayColor,
      transparent: true,
      opacity: 0.35,
      map: blotchTexture || null,
      depthWrite: false,
      roughness: 1,
      metalness: 0
    });
  }, [blotchTexture, overlayColor]);

  return (
    <group>
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        receiveShadow 
        position={[0, -0.1, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onClick?.(e.point);
        }}
      >
        <planeGeometry args={[250, 250]} />
        <primitive object={groundMaterial} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.095, 0]}>
        <planeGeometry args={[250, 250]} />
        <primitive object={groundOverlayMaterial} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={baseColor} roughness={1} opacity={0.18} transparent />
      </mesh>
    </group>
  );
};

export const MosqueBackground: React.FC<{ mapX: number, mapY: number }> = ({ mapX, mapY }) => {
  if (Math.abs(mapX) > 2 || Math.abs(mapY) > 2) return null;
  return (
    <group position={[-90 - mapX * 10, 0, -90 - mapY * 10]}>
      <mesh position={[0, 15, 0]} castShadow>
          <sphereGeometry args={[20, 32, 32, 0, Math.PI * 2, 0, Math.PI/2]} />
          <meshStandardMaterial color="#a89f91" roughness={0.7} />
      </mesh>
      <mesh position={[0, 7.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[20, 20, 15, 32]} />
          <meshStandardMaterial color="#c2b280" roughness={0.8} />
      </mesh>
      <mesh position={[25, 20, 10]} castShadow>
        <cylinderGeometry args={[2, 3, 40, 8]} />
        <meshStandardMaterial color="#c2b280" />
      </mesh>
      <mesh position={[-25, 20, -10]} castShadow>
        <cylinderGeometry args={[2, 3, 40, 8]} />
        <meshStandardMaterial color="#c2b280" />
      </mesh>
    </group>
  );
};

const HorizonBackdrop: React.FC<{ timeOfDay?: number }> = ({ timeOfDay }) => {
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const twilightFactor = time >= 17 && time < 19 ? (time - 17) / 2 : time >= 5 && time < 7 ? (7 - time) / 2 : 0;
  const skylineColor = nightFactor > 0.8
    ? '#0a0d14'
    : twilightFactor > 0
      ? '#4a505c'
      : '#46566a';
  const skylineOpacity = nightFactor > 0.8 ? 0.1 : twilightFactor > 0 ? 0.16 : 0.08;
  const hazeOpacity = nightFactor > 0.8 ? 0.02 : twilightFactor > 0 ? 0.2 : 0.1;

  return (
    <group>
      {/* Distant skyline silhouettes */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 95 + (i % 3) * 6;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const w = 8 + (i % 4) * 6;
        const h = 6 + (i % 4) * 4;
        return (
          <mesh key={`skyline-${i}`} position={[x, h / 2 - 1, z]} castShadow={false} receiveShadow={false}>
            <boxGeometry args={[w, h, w * 0.8]} />
            <meshStandardMaterial color={skylineColor} roughness={1} transparent opacity={skylineOpacity} />
          </mesh>
        );
      })}
      {/* Distant palm/olive silhouettes */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const radius = 88 + (i % 3) * 5;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        return (
          <group key={`tree-${i}`} position={[x, 0, z]}>
            <mesh position={[0, 6, 0]} castShadow={false} receiveShadow={false}>
              <cylinderGeometry args={[0.4, 0.6, 12, 6]} />
              <meshStandardMaterial color="#2a2a2a" roughness={1} />
            </mesh>
            <mesh position={[0, 13, 0]} castShadow={false} receiveShadow={false}>
              <sphereGeometry args={[3.5, 8, 6]} />
              <meshStandardMaterial color="#1f2a1f" roughness={1} />
            </mesh>
          </group>
        );
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2, 0]}>
        <ringGeometry args={[82, 138, 64]} />
        <meshStandardMaterial color="#a8cfe6" transparent opacity={0.16} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.2, 0]}>
        <ringGeometry args={[90, 150, 64]} />
        <meshStandardMaterial color="#c2dde9" transparent opacity={0.12} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.4, 0]}>
        <ringGeometry args={[100, 165, 64]} />
        <meshStandardMaterial color="#d2e4ef" transparent opacity={0.1} roughness={1} />
      </mesh>
    </group>
  );
};

export const CentralWell: React.FC<{ mapX: number, mapY: number; timeOfDay?: number }> = ({ mapX, mapY, timeOfDay }) => {
  if (mapX !== 0 || mapY !== 0) return null;
  const waterRef = useRef<THREE.Mesh>(null);
  const rippleRef = useRef<THREE.Mesh>(null);
  const rippleRef2 = useRef<THREE.Mesh>(null);
  const spoutRef = useRef<THREE.Points>(null);
  const spoutGeometry = useRef<THREE.BufferGeometry | null>(null);
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;

  useFrame((state) => {
    if (!waterRef.current) return;
    const t = state.clock.elapsedTime;
    waterRef.current.rotation.z = t * 0.1;
    waterRef.current.position.y = 0.82 + Math.sin(t * 2) * 0.02;
    if (rippleRef.current) {
      const scale = 1 + (Math.sin(t * 1.6) + 1) * 0.02;
      rippleRef.current.scale.set(scale, scale, 1);
      rippleRef.current.material.opacity = 0.35 + Math.sin(t * 1.6 + 0.5) * 0.1;
    }
    if (rippleRef2.current) {
      const scale = 1 + (Math.sin(t * 1.2 + 1.4) + 1) * 0.025;
      rippleRef2.current.scale.set(scale, scale, 1);
      rippleRef2.current.material.opacity = 0.25 + Math.sin(t * 1.2 + 1.2) * 0.08;
    }
    if (spoutRef.current && spoutGeometry.current) {
      const positions = spoutGeometry.current.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < positions.count; i++) {
        const ix = i * 3;
        const x = positions.array[ix] as number;
        const z = positions.array[ix + 2] as number;
        const baseY = (i % 12) * 0.06;
        positions.array[ix + 1] = 0.9 + ((t * 0.6 + i * 0.12) % 0.7) + baseY;
        positions.array[ix] = x * (1 + Math.sin(t + i) * 0.05);
        positions.array[ix + 2] = z * (1 + Math.cos(t + i) * 0.05);
      }
      positions.needsUpdate = true;
    }
  });

  const spoutPoints = useMemo(() => {
    const count = 60;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.06 + Math.random() * 0.04;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 0.9 + Math.random() * 0.6;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    spoutGeometry.current = geometry;
    return geometry;
  }, []);

  const geraniumChance = 0.6;

  return (
    <HoverableGroup
      position={[0, 0, 0]}
      boxSize={[14, 6, 10]}
      color={HOVER_WIREFRAME_COLORS.poi}
      labelTitle="Market Fountain"
      labelLines={['Fresh water', 'Carved limestone', 'City gathering place']}
      labelOffset={[0, 4.2, 0]}
    >
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.4, 3.8, 1.1, 20]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.2, 0.25, 20]} />
        <meshStandardMaterial color="#b79e7f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.95, 0]} castShadow>
        <torusGeometry args={[3.1, 0.2, 8, 24]} />
        <meshStandardMaterial color="#9b7b4f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[2.6, 2.9, 0.4, 16]} />
        <meshStandardMaterial color="#7b5a4a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.45, 0]} castShadow>
        <cylinderGeometry args={[1.2, 1.5, 0.3, 12]} />
        <meshStandardMaterial color="#a98963" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[1.0, 1.0, 0.12, 12]} />
        <meshStandardMaterial color="#bfa57e" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 0.9, 10]} />
        <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
      </mesh>
      <mesh ref={waterRef} position={[0, 0.82, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <circleGeometry args={[2.6, 24]} />
        <meshStandardMaterial color="#1b4f7a" roughness={0.15} metalness={0.7} />
      </mesh>
      <points ref={spoutRef} geometry={spoutPoints} position={[0, 0.7, 0]}>
        <pointsMaterial color="#9bd4f2" size={0.055} sizeAttenuation transparent opacity={0.85} />
      </points>
      <mesh ref={rippleRef} position={[0, 0.83, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[1.1, 2.3, 32]} />
        <meshStandardMaterial color="#6aa5c9" transparent opacity={0.35} roughness={0.1} metalness={0.4} />
      </mesh>
      <mesh ref={rippleRef2} position={[0, 0.835, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.8, 2.1, 32]} />
        <meshStandardMaterial color="#5a95ba" transparent opacity={0.25} roughness={0.1} metalness={0.4} />
      </mesh>
      <mesh position={[0, 3.0, 0]} castShadow>
          <boxGeometry args={[4.6, 0.2, 4.6]} />
          <meshStandardMaterial color="#3d2817" roughness={1.0} />
      </mesh>
      <HoverableGroup
        position={[-6, 0, 0]}
        boxSize={[1.4, 4.2, 1.4]}
        color={HOVER_WIREFRAME_COLORS.poi}
        labelTitle="Lamp Column"
        labelLines={['Braziers lit at night', 'Stone column', 'Market illumination']}
        labelOffset={[0, 4.4, 0]}
      >
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 3.2, 10]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.3, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 10]} />
          <meshStandardMaterial color="#a98963" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.55, 0]} castShadow>
          <boxGeometry args={[0.8, 0.2, 0.8]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        {nightFactor > 0.05 && (
          <>
            <mesh position={[0, 3.8, 0]}>
              <sphereGeometry args={[0.18, 10, 10]} />
              <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.9 * nightFactor} />
            </mesh>
            <pointLight position={[0, 3.8, 0]} intensity={1.5 * nightFactor} distance={22} decay={2} color="#ffb347" />
          </>
        )}
      </HoverableGroup>
      <HoverableGroup
        position={[6, 0, 0]}
        boxSize={[1.4, 4.2, 1.4]}
        color={HOVER_WIREFRAME_COLORS.poi}
        labelTitle="Lamp Column"
        labelLines={['Braziers lit at night', 'Stone column', 'Market illumination']}
        labelOffset={[0, 4.4, 0]}
      >
        <mesh position={[0, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.4, 3.2, 10]} />
          <meshStandardMaterial color="#b79e7f" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.3, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.45, 0.3, 10]} />
          <meshStandardMaterial color="#a98963" roughness={0.85} />
        </mesh>
        <mesh position={[0, 3.55, 0]} castShadow>
          <boxGeometry args={[0.8, 0.2, 0.8]} />
          <meshStandardMaterial color="#8a6b4f" roughness={0.9} />
        </mesh>
        {nightFactor > 0.05 && (
          <>
            <mesh position={[0, 3.8, 0]}>
              <sphereGeometry args={[0.18, 10, 10]} />
              <meshStandardMaterial color="#ffb347" emissive="#ff7a18" emissiveIntensity={0.9 * nightFactor} />
            </mesh>
            <pointLight position={[0, 3.8, 0]} intensity={1.5 * nightFactor} distance={22} decay={2} color="#ffb347" />
          </>
        )}
      </HoverableGroup>
      <Bench position={[-12, 0.2, 9]} />
      <Bench position={[12, 0.2, -9]} />
      <ClayJar position={[-3.2, 0.3, -3.2]} />
      <ClayJar position={[3.4, 0.3, 3.3]} />
      {geraniumChance > 0.4 && (
        <>
          <GeraniumPot position={[6.2, 0.2, -5.0]} />
          <GeraniumPot position={[-5.6, 0.2, 6.0]} />
        </>
      )}
      <PlazaCat waypoints={[[-12, 0.28, 9], [12, 0.28, -9], [6, 0.12, 6]]} />
    </HoverableGroup>
  );
};

export const Environment: React.FC<EnvironmentProps> = ({ mapX, mapY, onGroundClick, onBuildingsGenerated, nearBuildingId, timeOfDay, enableHoverWireframe = false, enableHoverLabel = false }) => {
  const district = getDistrictType(mapX, mapY);
  const groundSeed = seededRandom(mapX * 1000 + mapY * 13 + 7);
  const time = timeOfDay ?? 12;
  const nightFactor = time >= 19 || time < 5 ? 1 : time >= 17 ? (time - 17) / 2 : time < 7 ? (7 - time) / 2 : 0;
  const torchIntensity = 0.3 + nightFactor * 1.2;

  return (
    <HoverWireframeContext.Provider value={enableHoverWireframe}>
      <HoverLabelContext.Provider value={enableHoverLabel}>
        <group>
          <Ground onClick={onGroundClick} district={district} seed={groundSeed} />
          <Buildings mapX={mapX} mapY={mapY} onBuildingsGenerated={onBuildingsGenerated} nearBuildingId={nearBuildingId} torchIntensity={torchIntensity} nightFactor={nightFactor} />
          <MosqueBackground mapX={mapX} mapY={mapY} />
          <HorizonBackdrop timeOfDay={timeOfDay} />
          <CentralWell mapX={mapX} mapY={mapY} timeOfDay={timeOfDay} />
          
          <group>
              <mesh position={[0, 5, 80]}><boxGeometry args={[160, 10, 0.5]} /><meshStandardMaterial color="#3d2817" transparent opacity={0.15} /></mesh>
              <mesh position={[0, 5, -80]}><boxGeometry args={[160, 10, 0.5]} /><meshStandardMaterial color="#3d2817" transparent opacity={0.15} /></mesh>
              <mesh position={[80, 5, 0]}><boxGeometry args={[0.5, 10, 160]} /><meshStandardMaterial color="#3d2817" transparent opacity={0.15} /></mesh>
              <mesh position={[-80, 5, 0]}><boxGeometry args={[0.5, 10, 160]} /><meshStandardMaterial color="#3d2817" transparent opacity={0.15} /></mesh>
          </group>
        </group>
      </HoverLabelContext.Provider>
    </HoverWireframeContext.Provider>
  );
};
