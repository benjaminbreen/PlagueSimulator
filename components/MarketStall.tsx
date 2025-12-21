import React from 'react';
import * as THREE from 'three';
import { MarketStall as MarketStallData, MarketStallType } from '../types';

interface MarketStallProps {
  stall: MarketStallData;
  nightFactor: number;
}

export const MarketStall: React.FC<MarketStallProps> = ({ stall, nightFactor }) => {
  const { position, rotation, size, awningColor, woodColor, goodsColor, type } = stall;

  // Size configurations
  const sizeConfig = {
    small: { width: 3, depth: 2.5, height: 2.8, awningHeight: 2.2 },
    medium: { width: 4.5, depth: 3, height: 3.2, awningHeight: 2.6 },
    large: { width: 6, depth: 3.5, height: 3.6, awningHeight: 3.0 }
  }[size];

  const rotationRadians = (rotation * Math.PI) / 180;

  // Render different goods based on stall type
  const renderGoods = () => {
    switch (type) {
      case MarketStallType.SPICES:
        return (
          <group>
            {/* Burlap sacks with spices */}
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[-sizeConfig.width/4 + i * sizeConfig.width/4, 0.3, -sizeConfig.depth/4]} castShadow>
                <boxGeometry args={[0.5, 0.6, 0.4]} />
                <meshStandardMaterial color={i === 0 ? '#d4a574' : i === 1 ? '#b8860b' : '#cd853f'} roughness={0.9} />
              </mesh>
            ))}
            {/* Small bowls of spices on counter */}
            {[0, 1, 2, 3].map((i) => (
              <mesh key={`bowl-${i}`} position={[-sizeConfig.width/3 + i * sizeConfig.width/4.5, 1.0, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.12, 0.08, 12]} />
                <meshStandardMaterial color={['#8b4513', '#daa520', '#dc143c', '#ff8c00'][i]} roughness={0.7} />
              </mesh>
            ))}
          </group>
        );

      case MarketStallType.TEXTILES:
        return (
          <group>
            {/* Fabric bolts */}
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[-sizeConfig.width/4 + i * sizeConfig.width/3.5, 0.5, -sizeConfig.depth/4]} castShadow rotation={[0, Math.PI / 4, 0]}>
                <cylinderGeometry args={[0.15, 0.15, 1.2, 12]} />
                <meshStandardMaterial color={['#8b0000', '#4169e1', '#228b22'][i]} roughness={0.4} />
              </mesh>
            ))}
            {/* Draped fabric */}
            <mesh position={[0, 1.5, sizeConfig.depth/3]} castShadow>
              <boxGeometry args={[sizeConfig.width * 0.8, 0.02, 0.8]} />
              <meshStandardMaterial color={goodsColor} roughness={0.3} />
            </mesh>
          </group>
        );

      case MarketStallType.POTTERY:
        return (
          <group>
            {/* Large ceramic jars (amphorae) */}
            {[0, 1].map((i) => (
              <mesh key={i} position={[-sizeConfig.width/4 + i * sizeConfig.width/2, 0.4, -sizeConfig.depth/4]} castShadow>
                <cylinderGeometry args={[0.25, 0.2, 0.8, 16]} />
                <meshStandardMaterial color="#d2691e" roughness={0.6} />
              </mesh>
            ))}
            {/* Small bowls and plates on counter */}
            {[0, 1, 2, 3].map((i) => (
              <mesh key={`plate-${i}`} position={[-sizeConfig.width/3 + i * sizeConfig.width/4.5, 1.05, 0.1]} castShadow>
                <cylinderGeometry args={[0.12, 0.12, 0.03, 16]} />
                <meshStandardMaterial color={goodsColor} roughness={0.5} />
              </mesh>
            ))}
          </group>
        );

      case MarketStallType.METALWORK:
        return (
          <group>
            {/* Brass/copper pots */}
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[-sizeConfig.width/4 + i * sizeConfig.width/3.5, 1.0, 0]} castShadow>
                <sphereGeometry args={[0.18, 12, 12]} />
                <meshStandardMaterial color="#b87333" metalness={0.6} roughness={0.3} />
              </mesh>
            ))}
            {/* Hanging brass lanterns */}
            {[0, 1].map((i) => (
              <mesh key={`lantern-${i}`} position={[-sizeConfig.width/4 + i * sizeConfig.width/2, sizeConfig.awningHeight - 0.3, sizeConfig.depth/4]} castShadow>
                <cylinderGeometry args={[0.1, 0.15, 0.25, 8]} />
                <meshStandardMaterial color="#cd7f32" metalness={0.7} roughness={0.2} />
              </mesh>
            ))}
          </group>
        );

      case MarketStallType.RUGS:
        return (
          <group>
            {/* Rolled rugs leaning */}
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[-sizeConfig.width/4 + i * sizeConfig.width/3.5, 0.6, -sizeConfig.depth/3]} castShadow rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.15, 0.15, 1.0, 12]} />
                <meshStandardMaterial color={['#8b0000', '#00008b', '#006400'][i]} roughness={0.8} />
              </mesh>
            ))}
            {/* Flat rug displayed on counter */}
            <mesh position={[0, 1.05, 0]} castShadow>
              <boxGeometry args={[sizeConfig.width * 0.7, 0.05, sizeConfig.depth * 0.6]} />
              <meshStandardMaterial color={goodsColor} roughness={0.7} />
            </mesh>
          </group>
        );

      case MarketStallType.FOOD:
        return (
          <group>
            {/* Wicker baskets with food */}
            {[0, 1, 2, 3].map((i) => (
              <group key={i} position={[-sizeConfig.width/3 + i * sizeConfig.width/4.5, 0.9, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.15, 0.12, 0.15, 12]} />
                  <meshStandardMaterial color="#d2691e" roughness={0.9} />
                </mesh>
                {/* Contents (dates, olives, etc) */}
                <mesh position={[0, 0.08, 0]} castShadow>
                  <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
                  <meshStandardMaterial color={['#8b4513', '#556b2f', '#daa520', '#cd853f'][i]} roughness={0.8} />
                </mesh>
              </group>
            ))}
          </group>
        );

      case MarketStallType.PERFUMES:
        return (
          <group>
            {/* Small glass bottles */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <mesh key={i} position={[-sizeConfig.width/3 + (i % 3) * sizeConfig.width/3.5, 1.0 + Math.floor(i / 3) * 0.15, 0.1]} castShadow>
                <cylinderGeometry args={[0.06, 0.05, 0.15, 12]} />
                <meshStandardMaterial color="#4682b4" transparent opacity={0.7} roughness={0.1} />
              </mesh>
            ))}
            {/* Incense burner */}
            <mesh position={[sizeConfig.width/3, 1.0, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.08, 0.12, 12]} />
              <meshStandardMaterial color="#8b7355" roughness={0.7} />
            </mesh>
          </group>
        );

      case MarketStallType.GLASSWARE:
        return (
          <group>
            {/* Damascus glassware - various vessels */}
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[-sizeConfig.width/3 + i * sizeConfig.width/4.5, 1.05, 0]} castShadow>
                <sphereGeometry args={[0.12, 12, 12]} />
                <meshStandardMaterial
                  color={['#20b2aa', '#4169e1', '#9370db', '#48d1cc'][i]}
                  transparent
                  opacity={0.6}
                  roughness={0.1}
                  metalness={0.1}
                />
              </mesh>
            ))}
          </group>
        );

      default:
        return null;
    }
  };

  return (
    <group position={position} rotation={[0, rotationRadians, 0]}>
      {/* Wooden frame - posts */}
      <mesh position={[-sizeConfig.width/2, sizeConfig.height/2, -sizeConfig.depth/2]} castShadow>
        <boxGeometry args={[0.12, sizeConfig.height, 0.12]} />
        <meshStandardMaterial color={woodColor} roughness={0.9} />
      </mesh>
      <mesh position={[sizeConfig.width/2, sizeConfig.height/2, -sizeConfig.depth/2]} castShadow>
        <boxGeometry args={[0.12, sizeConfig.height, 0.12]} />
        <meshStandardMaterial color={woodColor} roughness={0.9} />
      </mesh>
      <mesh position={[-sizeConfig.width/2, sizeConfig.height/2, sizeConfig.depth/2]} castShadow>
        <boxGeometry args={[0.12, sizeConfig.height, 0.12]} />
        <meshStandardMaterial color={woodColor} roughness={0.9} />
      </mesh>
      <mesh position={[sizeConfig.width/2, sizeConfig.height/2, sizeConfig.depth/2]} castShadow>
        <boxGeometry args={[0.12, sizeConfig.height, 0.12]} />
        <meshStandardMaterial color={woodColor} roughness={0.9} />
      </mesh>

      {/* Top crossbeams */}
      <mesh position={[0, sizeConfig.height, -sizeConfig.depth/2]} castShadow>
        <boxGeometry args={[sizeConfig.width + 0.2, 0.1, 0.1]} />
        <meshStandardMaterial color={woodColor} roughness={0.9} />
      </mesh>
      <mesh position={[0, sizeConfig.height, sizeConfig.depth/2]} castShadow>
        <boxGeometry args={[sizeConfig.width + 0.2, 0.1, 0.1]} />
        <meshStandardMaterial color={woodColor} roughness={0.9} />
      </mesh>

      {/* Awning - draped fabric */}
      <mesh position={[0, sizeConfig.awningHeight, 0]} castShadow receiveShadow>
        <boxGeometry args={[sizeConfig.width + 0.3, 0.05, sizeConfig.depth + 0.3]} />
        <meshStandardMaterial color={awningColor} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* Awning sides (draped effect) */}
      <mesh position={[-sizeConfig.width/2 - 0.1, sizeConfig.awningHeight - 0.3, 0]} rotation={[0, 0, -0.2]} castShadow>
        <boxGeometry args={[0.05, 0.6, sizeConfig.depth + 0.2]} />
        <meshStandardMaterial color={awningColor} roughness={0.7} />
      </mesh>
      <mesh position={[sizeConfig.width/2 + 0.1, sizeConfig.awningHeight - 0.3, 0]} rotation={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.05, 0.6, sizeConfig.depth + 0.2]} />
        <meshStandardMaterial color={awningColor} roughness={0.7} />
      </mesh>

      {/* Counter/display table */}
      <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
        <boxGeometry args={[sizeConfig.width - 0.2, 0.1, sizeConfig.depth * 0.7]} />
        <meshStandardMaterial color={woodColor} roughness={0.85} />
      </mesh>
      {/* Table legs */}
      {[-1, 1].map((xSign) =>
        [-1, 1].map((zSign) => (
          <mesh
            key={`leg-${xSign}-${zSign}`}
            position={[xSign * (sizeConfig.width/2 - 0.3), 0.45, zSign * (sizeConfig.depth/3)]}
            castShadow
          >
            <boxGeometry args={[0.08, 0.9, 0.08]} />
            <meshStandardMaterial color={woodColor} roughness={0.9} />
          </mesh>
        ))
      )}

      {/* Goods specific to stall type */}
      {renderGoods()}
    </group>
  );
};
