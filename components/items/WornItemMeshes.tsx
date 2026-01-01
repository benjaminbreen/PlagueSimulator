import React from 'react';
import * as THREE from 'three';

// Worn items are scaled-down versions of inventory items for display on the player character
// These attach to specific body locations based on item type

export type WornItemType =
  | 'prayer_beads'
  | 'coin_purse'
  | 'waterskin'
  | 'dagger'
  | 'scimitar'
  | 'satchel'
  | 'amulet'
  | 'key'
  | 'writing_reed'
  | 'hemp_rope'
  | 'bronze_bell'
  | 'herb_bundle'
  | 'medicine_pouch'
  | 'scroll'
  | 'food_bundle'
  | 'oil_lamp'
  | 'small_pouch';

export interface WornItemConfig {
  type: WornItemType;
  attachment: 'belt_left' | 'belt_right' | 'belt_back' | 'shoulder' | 'neck' | 'hand_left';
  scale: number;
  offset: [number, number, number];
  rotation: [number, number, number];
}

// Map item names to worn item configs
export const getWornItemConfig = (itemName: string): WornItemConfig | null => {
  const name = itemName.toLowerCase();

  if (name.includes('prayer bead')) {
    return {
      type: 'prayer_beads',
      attachment: 'belt_left',
      scale: 0.35,
      offset: [-0.25, -0.1, 0.1],
      rotation: [0, 0, Math.PI / 6]
    };
  }

  if (name.includes('coin purse')) {
    return {
      type: 'coin_purse',
      attachment: 'belt_right',
      scale: 0.3,
      offset: [0.28, -0.05, 0.08],
      rotation: [0, 0, 0]
    };
  }

  if (name.includes('waterskin')) {
    return {
      type: 'waterskin',
      attachment: 'belt_right',
      scale: 0.38,
      offset: [0.1, -0.2, 0.12],
      rotation: [0.2, 0, -0.15]
    };
  }

  if (name.includes('dagger')) {
    return {
      type: 'dagger',
      attachment: 'belt_back',
      scale: 0.3,
      offset: [0.15, 0, -0.12],
      rotation: [0, 0, Math.PI / 12]
    };
  }

  if (name.includes('scimitar')) {
    return {
      type: 'scimitar',
      attachment: 'belt_back',
      scale: 0.28,
      offset: [-0.1, 0.1, -0.15],
      rotation: [0, 0, -Math.PI / 6]
    };
  }

  if (name.includes('satchel') || name.includes('leather bag')) {
    return {
      type: 'satchel',
      attachment: 'shoulder',
      scale: 0.28,
      offset: [-0.2, -0.3, 0.05],
      rotation: [0, Math.PI / 8, 0]
    };
  }

  if (name.includes('amulet')) {
    return {
      type: 'amulet',
      attachment: 'neck',
      scale: 0.55,
      offset: [0, -0.35, 0.18],
      rotation: [0, 0, 0]
    };
  }

  if (name.includes('key')) {
    return {
      type: 'key',
      attachment: 'belt_left',
      scale: 0.25,
      offset: [-0.2, -0.15, 0.06],
      rotation: [0, 0, Math.PI / 4]
    };
  }

  if (name.includes('writing reed')) {
    return {
      type: 'writing_reed',
      attachment: 'belt_right',
      scale: 0.3,
      offset: [0.22, 0.05, 0.05],
      rotation: [0, 0, -Math.PI / 10]
    };
  }

  if (name.includes('hemp rope') || name.includes('rope')) {
    return {
      type: 'hemp_rope',
      attachment: 'belt_back',
      scale: 0.35,
      offset: [-0.15, -0.05, -0.08],
      rotation: [Math.PI / 2, 0, 0]
    };
  }

  if (name.includes('bell')) {
    return {
      type: 'bronze_bell',
      attachment: 'belt_left',
      scale: 0.3,
      offset: [-0.22, -0.12, 0.1],
      rotation: [0, 0, 0]
    };
  }

  if (name.includes('mint') || name.includes('herb')) {
    return {
      type: 'herb_bundle',
      attachment: 'belt_left',
      scale: 0.35,
      offset: [-0.15, 0.02, 0.1],
      rotation: [0, 0, 0.2]
    };
  }

  if (name.includes('theriac') || name.includes('camphor') || name.includes('myrrh')) {
    return {
      type: 'medicine_pouch',
      attachment: 'belt_right',
      scale: 0.32,
      offset: [0.18, -0.05, 0.1],
      rotation: [0, 0, 0]
    };
  }

  if (name.includes('manuscript') || name.includes('scroll')) {
    return {
      type: 'scroll',
      attachment: 'belt_back',
      scale: 0.35,
      offset: [0.12, 0.08, -0.1],
      rotation: [0, 0, Math.PI / 8]
    };
  }

  if (name.includes('dates') || name.includes('figs') || name.includes('apricot')) {
    return {
      type: 'food_bundle',
      attachment: 'belt_left',
      scale: 0.3,
      offset: [-0.2, -0.08, 0.1],
      rotation: [0, 0, 0]
    };
  }

  if (name.includes('oil lamp') || name.includes('brass lamp')) {
    return {
      type: 'oil_lamp',
      attachment: 'belt_right',
      scale: 0.28,
      offset: [0.2, -0.1, 0.08],
      rotation: [0, 0, 0]
    };
  }

  if (name.includes('pouch')) {
    return {
      type: 'small_pouch',
      attachment: 'belt_left',
      scale: 0.3,
      offset: [-0.18, -0.08, 0.08],
      rotation: [0, 0, 0]
    };
  }

  return null;
};

// Prayer beads hanging from belt
const WornPrayerBeads: React.FC<{ scale: number }> = ({ scale }) => {
  const beadCount = 8;
  const radius = 0.15;
  const beadSize = 0.03;

  return (
    <group scale={scale}>
      {/* Beads in a dangling arc */}
      {Array.from({ length: beadCount }).map((_, i) => {
        const t = i / (beadCount - 1);
        const x = Math.sin(t * Math.PI * 0.6) * radius * 0.5;
        const y = -t * radius * 1.8;
        return (
          <mesh key={i} position={[x, y, 0]} castShadow>
            <sphereGeometry args={[beadSize, 8, 6]} />
            <meshStandardMaterial color="#5c3a1e" roughness={0.7} />
          </mesh>
        );
      })}
      {/* Larger connector bead */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <sphereGeometry args={[beadSize * 1.3, 8, 6]} />
        <meshStandardMaterial color="#3d2512" roughness={0.6} />
      </mesh>
      {/* Tassel */}
      <mesh position={[radius * 0.25, -radius * 1.9, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.025, 0.08, 6]} />
        <meshStandardMaterial color="#8b4513" roughness={0.8} />
      </mesh>
    </group>
  );
};

// Small coin purse at belt
const WornCoinPurse: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Rounded pouch body */}
    <mesh castShadow>
      <sphereGeometry args={[0.18, 12, 10]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.85} />
    </mesh>
    {/* Gathered top */}
    <mesh position={[0, 0.14, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.1, 0.1, 10]} />
      <meshStandardMaterial color="#6a4a2a" roughness={0.85} />
    </mesh>
    {/* Drawstring */}
    <mesh position={[0, 0.12, 0]}>
      <torusGeometry args={[0.08, 0.012, 6, 12]} />
      <meshStandardMaterial color="#4a3a20" roughness={0.8} />
    </mesh>
    {/* Metal clasp */}
    <mesh position={[0, 0.18, 0]} castShadow>
      <cylinderGeometry args={[0.03, 0.04, 0.04, 8]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.6} />
    </mesh>
  </group>
);

// Waterskin hanging from belt - traditional goatskin style
const WornWaterskin: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Main body - elongated gourd shape */}
    <mesh position={[0, -0.1, 0]} castShadow>
      <sphereGeometry args={[0.22, 14, 12]} />
      <meshStandardMaterial color="#6b4423" roughness={0.9} />
    </mesh>
    {/* Lower bulge */}
    <mesh position={[0, -0.28, 0]} castShadow>
      <sphereGeometry args={[0.18, 12, 10]} />
      <meshStandardMaterial color="#5a3a1a" roughness={0.9} />
    </mesh>
    {/* Upper neck portion */}
    <mesh position={[0, 0.12, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.15, 0.2, 10]} />
      <meshStandardMaterial color="#6b4423" roughness={0.88} />
    </mesh>
    {/* Spout */}
    <mesh position={[0, 0.26, 0]} castShadow>
      <cylinderGeometry args={[0.05, 0.07, 0.1, 8]} />
      <meshStandardMaterial color="#4a3020" roughness={0.85} />
    </mesh>
    {/* Wooden stopper/plug */}
    <mesh position={[0, 0.34, 0]} castShadow>
      <cylinderGeometry args={[0.035, 0.045, 0.08, 8]} />
      <meshStandardMaterial color="#8b7355" roughness={0.8} />
    </mesh>
    {/* Leather binding straps */}
    <mesh position={[0, 0.05, 0]}>
      <torusGeometry args={[0.16, 0.018, 6, 14]} />
      <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
    </mesh>
    <mesh position={[0, -0.15, 0]}>
      <torusGeometry args={[0.2, 0.015, 6, 14]} />
      <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
    </mesh>
    {/* Belt loop/strap at top */}
    <mesh position={[0.12, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <torusGeometry args={[0.06, 0.02, 6, 10, Math.PI]} />
      <meshStandardMaterial color="#4a3020" roughness={0.85} />
    </mesh>
    {/* Stitching detail line */}
    <mesh position={[0, -0.1, 0.21]} rotation={[0, 0, 0]} castShadow>
      <boxGeometry args={[0.015, 0.35, 0.01]} />
      <meshStandardMaterial color="#2a1a10" roughness={0.95} />
    </mesh>
  </group>
);

// Dagger in belt sheath
const WornDagger: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Sheath */}
    <mesh position={[0, -0.2, 0]} castShadow>
      <boxGeometry args={[0.08, 0.5, 0.04]} />
      <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
    </mesh>
    {/* Sheath tip metal cap */}
    <mesh position={[0, -0.46, 0]} castShadow>
      <coneGeometry args={[0.045, 0.06, 8]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Handle visible above sheath */}
    <mesh position={[0, 0.1, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.05, 0.2, 8]} />
      <meshStandardMaterial color="#5c3a1e" roughness={0.8} />
    </mesh>
    {/* Pommel */}
    <mesh position={[0, 0.22, 0]} castShadow>
      <sphereGeometry args={[0.05, 10, 8]} />
      <meshStandardMaterial color="#b87333" roughness={0.35} metalness={0.65} />
    </mesh>
    {/* Cross guard */}
    <mesh position={[0, 0, 0]} castShadow>
      <boxGeometry args={[0.15, 0.03, 0.04]} />
      <meshStandardMaterial color="#b87333" roughness={0.35} metalness={0.65} />
    </mesh>
  </group>
);

// Scimitar in belt
const WornScimitar: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Curved sheath */}
    <mesh position={[0.05, -0.25, 0]} rotation={[0, 0, -0.15]} castShadow>
      <boxGeometry args={[0.06, 0.7, 0.03]} />
      <meshStandardMaterial color="#2a1a10" roughness={0.85} />
    </mesh>
    {/* Sheath tip */}
    <mesh position={[0.12, -0.58, 0]} rotation={[0, 0, -0.15]} castShadow>
      <coneGeometry args={[0.035, 0.08, 8]} />
      <meshStandardMaterial color="#c9a866" roughness={0.35} metalness={0.7} />
    </mesh>
    {/* Handle */}
    <mesh position={[0, 0.15, 0]} castShadow>
      <cylinderGeometry args={[0.035, 0.045, 0.22, 8]} />
      <meshStandardMaterial color="#4a3020" roughness={0.8} />
    </mesh>
    {/* Pommel */}
    <mesh position={[0, 0.28, 0]} castShadow>
      <sphereGeometry args={[0.045, 10, 8]} />
      <meshStandardMaterial color="#c9a866" roughness={0.3} metalness={0.75} />
    </mesh>
    {/* Cross guard - curved */}
    <mesh position={[0, 0.02, 0]} castShadow>
      <boxGeometry args={[0.18, 0.025, 0.035]} />
      <meshStandardMaterial color="#c9a866" roughness={0.3} metalness={0.7} />
    </mesh>
  </group>
);

// Leather satchel hanging from shoulder
const WornSatchel: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Main bag body */}
    <mesh castShadow>
      <boxGeometry args={[0.4, 0.3, 0.15]} />
      <meshStandardMaterial color="#6a4a2a" roughness={0.85} />
    </mesh>
    {/* Flap */}
    <mesh position={[0, 0.08, 0.1]} rotation={[-0.3, 0, 0]} castShadow>
      <boxGeometry args={[0.42, 0.15, 0.03]} />
      <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
    </mesh>
    {/* Buckle */}
    <mesh position={[0, -0.02, 0.12]} castShadow>
      <boxGeometry args={[0.08, 0.06, 0.02]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Strap (going up) */}
    <mesh position={[0.18, 0.25, 0]} castShadow>
      <boxGeometry args={[0.05, 0.35, 0.02]} />
      <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
    </mesh>
  </group>
);

// Copper amulet hanging on cord at chest
const WornAmulet: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Cord going up to neck - left side */}
    <mesh position={[-0.06, 0.18, 0]} rotation={[0, 0, 0.3]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
      <meshStandardMaterial color="#2a1a10" roughness={0.9} />
    </mesh>
    {/* Cord going up to neck - right side */}
    <mesh position={[0.06, 0.18, 0]} rotation={[0, 0, -0.3]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, 0.35, 6]} />
      <meshStandardMaterial color="#2a1a10" roughness={0.9} />
    </mesh>
    {/* Hanging loop at top of amulet */}
    <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.035, 0.015, 6, 10]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Main disc - facing forward */}
    <mesh position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.12, 0.02, 18]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.65} />
    </mesh>
    {/* Engraved inner circle */}
    <mesh position={[0, 0, 0.025]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.08, 0.08, 0.012, 14]} />
      <meshStandardMaterial color="#cd9b4a" roughness={0.35} metalness={0.7} />
    </mesh>
    {/* Central raised motif - 8-pointed star */}
    <mesh position={[0, 0, 0.035]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.035, 0.035, 0.01, 8]} />
      <meshStandardMaterial color="#d4af37" roughness={0.25} metalness={0.85} />
    </mesh>
    {/* Rim detail */}
    <mesh position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[0.11, 0.012, 6, 18]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.5} metalness={0.5} />
    </mesh>
  </group>
);

// Iron key on belt
const WornKey: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Key bow (handle ring) */}
    <mesh position={[0, 0.2, 0]} castShadow>
      <torusGeometry args={[0.08, 0.025, 8, 14]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.5} metalness={0.7} />
    </mesh>
    {/* Key shank */}
    <mesh position={[0, -0.05, 0]} castShadow>
      <boxGeometry args={[0.035, 0.35, 0.02]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.5} metalness={0.7} />
    </mesh>
    {/* Key bit (teeth) */}
    <mesh position={[0.035, -0.2, 0]} castShadow>
      <boxGeometry args={[0.05, 0.08, 0.02]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.5} metalness={0.7} />
    </mesh>
    <mesh position={[-0.025, -0.18, 0]} castShadow>
      <boxGeometry args={[0.03, 0.05, 0.02]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.5} metalness={0.7} />
    </mesh>
  </group>
);

// Writing reed tucked in belt
const WornWritingReed: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Main reed shaft */}
    <mesh castShadow>
      <cylinderGeometry args={[0.018, 0.025, 0.6, 8]} />
      <meshStandardMaterial color="#c4a574" roughness={0.75} />
    </mesh>
    {/* Node rings */}
    <mesh position={[0, 0.1, 0]}>
      <torusGeometry args={[0.022, 0.005, 6, 10]} />
      <meshStandardMaterial color="#a08060" roughness={0.7} />
    </mesh>
    <mesh position={[0, -0.1, 0]}>
      <torusGeometry args={[0.02, 0.004, 6, 10]} />
      <meshStandardMaterial color="#a08060" roughness={0.7} />
    </mesh>
    {/* Carved nib */}
    <mesh position={[0, -0.32, 0]} castShadow>
      <coneGeometry args={[0.018, 0.08, 6]} />
      <meshStandardMaterial color="#8b7355" roughness={0.6} />
    </mesh>
  </group>
);

// Hemp rope coiled at belt
const WornHempRope: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Coiled rope loops */}
    {[0, 0.06, 0.12].map((y, i) => (
      <mesh key={i} position={[0, y, 0]} castShadow>
        <torusGeometry args={[0.15 - i * 0.02, 0.03, 8, 16]} />
        <meshStandardMaterial color="#a08060" roughness={0.9} />
      </mesh>
    ))}
    {/* Rope end hanging */}
    <mesh position={[0.12, -0.08, 0]} rotation={[0, 0, 0.5]} castShadow>
      <cylinderGeometry args={[0.025, 0.03, 0.2, 8]} />
      <meshStandardMaterial color="#a08060" roughness={0.9} />
    </mesh>
  </group>
);

// Bronze bell hanging from belt
const WornBronzeBell: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Bell body */}
    <mesh position={[0, -0.08, 0]} castShadow>
      <cylinderGeometry args={[0.03, 0.12, 0.18, 12]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.65} />
    </mesh>
    {/* Bell rim */}
    <mesh position={[0, -0.18, 0]} castShadow>
      <torusGeometry args={[0.11, 0.02, 8, 14]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.45} metalness={0.6} />
    </mesh>
    {/* Handle loop */}
    <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <torusGeometry args={[0.04, 0.015, 6, 10]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.65} />
    </mesh>
    {/* Clapper inside (partially visible) */}
    <mesh position={[0, -0.12, 0]} castShadow>
      <sphereGeometry args={[0.03, 8, 6]} />
      <meshStandardMaterial color="#4a4a4a" roughness={0.5} metalness={0.7} />
    </mesh>
  </group>
);

// Herb bundle (mint, etc.) tucked in belt
const WornHerbBundle: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Tied stem bundle */}
    <mesh position={[0, -0.1, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.05, 0.15, 8]} />
      <meshStandardMaterial color="#4a7a3a" roughness={0.75} />
    </mesh>
    {/* Twine tie */}
    <mesh position={[0, -0.05, 0]}>
      <torusGeometry args={[0.045, 0.012, 6, 10]} />
      <meshStandardMaterial color="#8b7355" roughness={0.85} />
    </mesh>
    {/* Leaf clusters */}
    {[[0, 0.08, 0], [-0.04, 0.04, 0.02], [0.03, 0.06, -0.02]].map((pos, i) => (
      <mesh key={i} position={pos as [number, number, number]} castShadow>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshStandardMaterial color={i % 2 === 0 ? '#3d8b3d' : '#4a9a4a'} roughness={0.7} />
      </mesh>
    ))}
  </group>
);

// Medicine pouch for apothecary items
const WornMedicinePouch: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Leather pouch body */}
    <mesh castShadow>
      <boxGeometry args={[0.18, 0.22, 0.1]} />
      <meshStandardMaterial color="#5c3a1e" roughness={0.85} />
    </mesh>
    {/* Flap */}
    <mesh position={[0, 0.08, 0.06]} rotation={[-0.3, 0, 0]} castShadow>
      <boxGeometry args={[0.19, 0.1, 0.02]} />
      <meshStandardMaterial color="#4a2a10" roughness={0.85} />
    </mesh>
    {/* Buckle */}
    <mesh position={[0, 0.02, 0.07]} castShadow>
      <boxGeometry args={[0.05, 0.04, 0.015]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Stitching */}
    <mesh position={[0.08, 0, 0.052]}>
      <boxGeometry args={[0.01, 0.18, 0.005]} />
      <meshStandardMaterial color="#3a2a1a" roughness={0.9} />
    </mesh>
  </group>
);

// Rolled scroll/manuscript tucked in belt
const WornScroll: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Rolled parchment */}
    <mesh castShadow>
      <cylinderGeometry args={[0.05, 0.05, 0.35, 12]} />
      <meshStandardMaterial color="#d4c4a8" roughness={0.8} />
    </mesh>
    {/* Decorative end caps */}
    <mesh position={[0, 0.18, 0]} castShadow>
      <cylinderGeometry args={[0.055, 0.055, 0.02, 10]} />
      <meshStandardMaterial color="#8b6914" roughness={0.6} />
    </mesh>
    <mesh position={[0, -0.18, 0]} castShadow>
      <cylinderGeometry args={[0.055, 0.055, 0.02, 10]} />
      <meshStandardMaterial color="#8b6914" roughness={0.6} />
    </mesh>
    {/* Ribbon tie */}
    <mesh position={[0, 0, 0.055]} castShadow>
      <boxGeometry args={[0.08, 0.03, 0.01]} />
      <meshStandardMaterial color="#8b0000" roughness={0.7} />
    </mesh>
  </group>
);

// Food bundle (dates, figs wrapped in cloth)
const WornFoodBundle: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Cloth wrap - lumpy to suggest contents */}
    <mesh castShadow>
      <sphereGeometry args={[0.14, 12, 10]} />
      <meshStandardMaterial color="#c4a882" roughness={0.9} />
    </mesh>
    {/* Tied top */}
    <mesh position={[0, 0.12, 0]} castShadow>
      <coneGeometry args={[0.06, 0.1, 8]} />
      <meshStandardMaterial color="#b8986a" roughness={0.88} />
    </mesh>
    {/* Twine */}
    <mesh position={[0, 0.08, 0]}>
      <torusGeometry args={[0.055, 0.012, 6, 10]} />
      <meshStandardMaterial color="#6a5a40" roughness={0.85} />
    </mesh>
  </group>
);

// Brass oil lamp at belt
const WornOilLamp: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Lamp body */}
    <mesh castShadow>
      <sphereGeometry args={[0.12, 14, 12]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Spout */}
    <mesh position={[0.1, 0, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
      <cylinderGeometry args={[0.03, 0.04, 0.12, 8]} />
      <meshStandardMaterial color="#8b5a2b" roughness={0.45} metalness={0.55} />
    </mesh>
    {/* Handle */}
    <mesh position={[-0.08, 0.08, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
      <torusGeometry args={[0.06, 0.015, 6, 10, Math.PI]} />
      <meshStandardMaterial color="#b87333" roughness={0.4} metalness={0.6} />
    </mesh>
    {/* Lid knob */}
    <mesh position={[0, 0.12, 0]} castShadow>
      <sphereGeometry args={[0.025, 8, 6]} />
      <meshStandardMaterial color="#cd9b4a" roughness={0.35} metalness={0.65} />
    </mesh>
  </group>
);

// Small pouch for cosmetics/small items
const WornSmallPouch: React.FC<{ scale: number }> = ({ scale }) => (
  <group scale={scale}>
    {/* Rounded pouch */}
    <mesh castShadow>
      <sphereGeometry args={[0.1, 12, 10]} />
      <meshStandardMaterial color="#6a4a2a" roughness={0.88} />
    </mesh>
    {/* Gathered top */}
    <mesh position={[0, 0.08, 0]} castShadow>
      <cylinderGeometry args={[0.04, 0.07, 0.06, 8]} />
      <meshStandardMaterial color="#5a3a1a" roughness={0.88} />
    </mesh>
    {/* Drawstring */}
    <mesh position={[0, 0.06, 0]}>
      <torusGeometry args={[0.055, 0.01, 6, 10]} />
      <meshStandardMaterial color="#3a2a1a" roughness={0.85} />
    </mesh>
  </group>
);

// Main worn item renderer
export const WornItemMesh: React.FC<{
  type: WornItemType;
  scale?: number;
}> = ({ type, scale = 1 }) => {
  switch (type) {
    case 'prayer_beads':
      return <WornPrayerBeads scale={scale} />;
    case 'coin_purse':
      return <WornCoinPurse scale={scale} />;
    case 'waterskin':
      return <WornWaterskin scale={scale} />;
    case 'dagger':
      return <WornDagger scale={scale} />;
    case 'scimitar':
      return <WornScimitar scale={scale} />;
    case 'satchel':
      return <WornSatchel scale={scale} />;
    case 'amulet':
      return <WornAmulet scale={scale} />;
    case 'key':
      return <WornKey scale={scale} />;
    case 'writing_reed':
      return <WornWritingReed scale={scale} />;
    case 'hemp_rope':
      return <WornHempRope scale={scale} />;
    case 'bronze_bell':
      return <WornBronzeBell scale={scale} />;
    case 'herb_bundle':
      return <WornHerbBundle scale={scale} />;
    case 'medicine_pouch':
      return <WornMedicinePouch scale={scale} />;
    case 'scroll':
      return <WornScroll scale={scale} />;
    case 'food_bundle':
      return <WornFoodBundle scale={scale} />;
    case 'oil_lamp':
      return <WornOilLamp scale={scale} />;
    case 'small_pouch':
      return <WornSmallPouch scale={scale} />;
    default:
      return null;
  }
};
