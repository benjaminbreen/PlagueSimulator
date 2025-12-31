/**
 * Jewish Quarter (Al-Yahud) Decorations - COMPLETE REDESIGN
 *
 * Historical context: In 14th century Damascus under Mamluk rule, the Jewish Quarter
 * (Al-Yahud) was a vibrant, densely populated neighborhood housing the city's Jewish
 * population. The quarter featured:
 *
 * - CENTRAL SYNAGOGUE: Main house of worship with distinctive architecture
 * - SMALLER SYNAGOGUES: Multiple smaller prayer houses for different communities
 * - MIKVEH: Ritual bath house, essential for Jewish religious practice
 * - YESHIVA: Study house with scholars and students
 * - KOSHER FACILITIES: Butcher shops, bakeries, wine cellars
 * - RESIDENTIAL BUILDINGS: Distinctive darker stone, mezuzahs on doorframes
 * - COMMUNITY PLAZA: Central gathering space with fountain
 * - MARKET STALLS: Jewish merchants selling textiles, spices, metalwork
 * - DISTINCTIVE FEATURES: Hebrew inscriptions, Magen David symbols, menorah displays
 *
 * Under dhimmi status, there were building restrictions (no tall minarets, subdued
 * external decoration), but the community maintained vibrant internal cultural life.
 */

import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { getDistrictType } from '../../../types';
import { TerrainHeightmap, sampleTerrainHeight } from '../../../utils/terrain';
import { seededRandom } from '../../../utils/procedural';
import { HoverLabel } from '../shared/HoverSystem';

// AUTHENTIC DAMASCENE SYNAGOGUE (Main Community Synagogue)
const MainSynagogue: React.FC<{ seed: number; timeOfDay?: number }> = ({ seed, timeOfDay }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const [hovered, setHovered] = useState(false);

  // Determine if lanterns should be lit (evening/night)
  const isNight = timeOfDay !== undefined && (timeOfDay < 0.25 || timeOfDay > 0.75);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {hovered && (
        <HoverLabel
          title="Main Synagogue"
          lines={[
            'Central house of worship',
            'Stone construction',
            'Torah ark and bimah'
          ]}
          offset={[0, 13, 0]}
        />
      )}
      {/* OUTER COURTYARD */}
      <group position={[0, 0, 0]}>
        {/* Courtyard walls - warm limestone (not dark!) */}
        <mesh position={[0, 2, -8]} castShadow receiveShadow>
          <boxGeometry args={[14, 4, 0.5]} />
          <meshStandardMaterial color="#d9c9a9" roughness={0.88} />
        </mesh>
        <mesh position={[0, 2, 8]} castShadow receiveShadow>
          <boxGeometry args={[14, 4, 0.5]} />
          <meshStandardMaterial color="#d9c9a9" roughness={0.88} />
        </mesh>
        <mesh position={[-7, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 4, 16]} />
          <meshStandardMaterial color="#d9c9a9" roughness={0.88} />
        </mesh>
        <mesh position={[7, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.5, 4, 16]} />
          <meshStandardMaterial color="#d9c9a9" roughness={0.88} />
        </mesh>

        {/* Decorative stone bands on courtyard walls */}
        {[-8, 8].map((z) => (
          <mesh key={`band-z-${z}`} position={[0, 3.5, z]} castShadow receiveShadow>
            <boxGeometry args={[14.2, 0.2, 0.6]} />
            <meshStandardMaterial color="#c9b999" roughness={0.85} />
          </mesh>
        ))}
        {[-7, 7].map((x) => (
          <mesh key={`band-x-${x}`} position={[x, 3.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.6, 0.2, 16.2]} />
            <meshStandardMaterial color="#c9b999" roughness={0.85} />
          </mesh>
        ))}

        {/* Main entrance gate - impressive stone archway */}
        <group position={[7, 0, 0]}>
          {/* Ornate wooden door */}
          <mesh position={[0, 2.2, 0]} castShadow>
            <boxGeometry args={[0.2, 4.4, 2.8]} />
            <meshStandardMaterial color="#8a6a4a" roughness={0.75} />
          </mesh>

          {/* Stone arch - semi-circular made of segments */}
          {Array.from({ length: 11 }).map((_, i) => {
            const angle = (i / 10) * Math.PI; // 0 to PI (half circle)
            const radius = 1.6;
            const x = 0.25;
            const y = 4.4 + Math.sin(angle) * radius;
            const z = -Math.cos(angle) * radius; // Properly centered: -radius to +radius
            return (
              <mesh key={`arch-${i}`} position={[x, y, z]} rotation={[angle, 0, 0]} castShadow>
                <boxGeometry args={[0.3, 0.35, 0.2]} />
                <meshStandardMaterial color="#c9b999" roughness={0.88} />
              </mesh>
            );
          })}

          {/* Decorative keystone at arch top */}
          <mesh position={[0.25, 6, 0]} castShadow>
            <boxGeometry args={[0.35, 0.5, 0.4]} />
            <meshStandardMaterial color="#b9a989" roughness={0.85} />
          </mesh>

          {/* Mezuzah on gate */}
          <mesh position={[0.3, 3, 1.3]} rotation={[0, 0, Math.PI / 12]} castShadow>
            <boxGeometry args={[0.1, 0.35, 0.09]} />
            <meshStandardMaterial color="#7a5a3a" roughness={0.6} metalness={0.3} />
          </mesh>

          {/* Large Magen David above gate - carved stone */}
          <group position={[0.4, 6.8, 0]} rotation={[0, Math.PI / 2, 0]} scale={1.0}>
            <StarOfDavid size={0.7} color="#a99979" />
          </group>
        </group>

        {/* Courtyard fountain - ritual washing */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[1.2, 1.4, 1, 8]} />
            <meshStandardMaterial color="#7a6a58" roughness={0.94} />
          </mesh>
          <mesh position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.4, 8]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.7} metalness={0.3} />
          </mesh>
          {/* Water basin */}
          <mesh position={[0, 0.95, 0]}>
            <cylinderGeometry args={[1.15, 1.15, 0.1, 12]} />
            <meshStandardMaterial color="#3a4a5a" roughness={0.2} transparent opacity={0.8} />
          </mesh>
        </group>

        {/* Stone benches around courtyard */}
        {[0, 1, 2, 3].map((i) => {
          const angle = (i / 4) * Math.PI * 2;
          const x = Math.cos(angle) * 4.5;
          const z = Math.sin(angle) * 4.5;
          return (
            <mesh key={`bench-${i}`} position={[x, 0.25, z]} rotation={[0, angle, 0]} receiveShadow>
              <boxGeometry args={[2, 0.5, 0.5]} />
              <meshStandardMaterial color="#6a5a48" roughness={0.95} />
            </mesh>
          );
        })}
      </group>

      {/* MAIN PRAYER HALL - Impressive stone structure */}
      <group position={[0, 0, 0]}>
        {/* Building base - warm limestone (Damascus sandstone) */}
        <mesh position={[0, 5.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[12, 11, 12]} />
          <meshStandardMaterial color="#d9c9a9" roughness={0.88} />
        </mesh>

        {/* Stone courses - ashlar masonry blocks */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <mesh key={`band-${i}`} position={[0, 1.2 + i * 1.15, 0]} castShadow receiveShadow>
            <boxGeometry args={[12.15, 0.12, 12.15]} />
            <meshStandardMaterial color="#c9b999" roughness={0.9} />
          </mesh>
        ))}

        {/* Decorative cornice below roof */}
        <mesh position={[0, 10.8, 0]} castShadow receiveShadow>
          <boxGeometry args={[12.5, 0.4, 12.5]} />
          <meshStandardMaterial color="#b9a989" roughness={0.85} />
        </mesh>

        {/* Flat roof with parapet (dhimmi restrictions - no tall minaret-like structures) */}
        <mesh position={[0, 11.2, 0]} receiveShadow>
          <boxGeometry args={[12.8, 0.2, 12.8]} />
          <meshStandardMaterial color="#c9b999" roughness={0.92} />
        </mesh>

        {/* Substantial parapet walls */}
        {[-6.3, 6.3].map((x) => (
          <mesh key={`parapet-x-${x}`} position={[x, 11.8, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.4, 1, 12.8]} />
            <meshStandardMaterial color="#d9c9a9" roughness={0.88} />
          </mesh>
        ))}
        {[-6.3, 6.3].map((z) => (
          <mesh key={`parapet-z-${z}`} position={[0, 11.8, z]} castShadow receiveShadow>
            <boxGeometry args={[12.4, 1, 0.4]} />
            <meshStandardMaterial color="#d9c9a9" roughness={0.88} />
          </mesh>
        ))}

        {/* Tall arched windows - multiple stories */}
        {/* Upper level windows */}
        {[-4, 0, 4].map((z, idx) => (
          <group key={`upper-window-${idx}`} position={[6, 8, z]}>
            <mesh position={[0.08, 0, 0]} castShadow>
              <boxGeometry args={[0.15, 2.5, 0.8]} />
              <meshStandardMaterial color="#7a8a9a" roughness={0.3} transparent opacity={0.5} />
            </mesh>
            {/* Decorative stone lintel above window */}
            <mesh position={[0.15, 1.35, 0]} castShadow>
              <boxGeometry args={[0.25, 0.3, 1.0]} />
              <meshStandardMaterial color="#c9b999" roughness={0.88} />
            </mesh>
          </group>
        ))}
        {/* Lower level windows */}
        {[-4, 0, 4].map((z, idx) => (
          <group key={`lower-window-${idx}`} position={[6, 4, z]}>
            <mesh position={[0.08, 0, 0]} castShadow>
              <boxGeometry args={[0.15, 2, 0.7]} />
              <meshStandardMaterial color="#7a8a9a" roughness={0.3} transparent opacity={0.5} />
            </mesh>
            {/* Decorative stone lintel above window */}
            <mesh position={[0.15, 1.1, 0]} castShadow>
              <boxGeometry args={[0.25, 0.25, 0.9]} />
              <meshStandardMaterial color="#c9b999" roughness={0.88} />
            </mesh>
          </group>
        ))}

        {/* Main entrance from courtyard - impressive carved doors */}
        <mesh position={[-6.05, 3.5, 0]} castShadow>
          <boxGeometry args={[0.2, 6.5, 3.2]} />
          <meshStandardMaterial color="#8a6a4a" roughness={0.75} />
        </mesh>

        {/* Stone arch above door - semi-circular segments */}
        {Array.from({ length: 13 }).map((_, i) => {
          const angle = (i / 12) * Math.PI;
          const radius = 1.8;
          const x = -6.3;
          const y = 6.8 + Math.sin(angle) * radius;
          const z = -Math.cos(angle) * radius; // Properly centered
          return (
            <mesh key={`main-arch-${i}`} position={[x, y, z]} rotation={[angle, 0, 0]} castShadow>
              <boxGeometry args={[0.35, 0.4, 0.25]} />
              <meshStandardMaterial color="#c9b999" roughness={0.88} />
            </mesh>
          );
        })}

        {/* Decorative keystone */}
        <mesh position={[-6.3, 8.6, 0]} castShadow>
          <boxGeometry args={[0.4, 0.6, 0.5]} />
          <meshStandardMaterial color="#b9a989" roughness={0.85} />
        </mesh>

        {/* Mezuzah on doorframe */}
        <mesh position={[-5.9, 5, 1.5]} rotation={[0, 0, Math.PI / 12]} castShadow>
          <boxGeometry args={[0.12, 0.4, 0.1]} />
          <meshStandardMaterial color="#7a5a3a" roughness={0.6} metalness={0.3} />
        </mesh>

        {/* INTERIOR - ARON KODESH (Torah Ark) */}
        <group position={[-3.5, 3, 0]}>
          {/* Ark structure - ornate wooden cabinet */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[1.2, 2.8, 0.8]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.7} />
          </mesh>
          {/* Decorative columns flanking ark */}
          <mesh position={[-0.7, 0, 0.4]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 2.8, 8]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
          </mesh>
          <mesh position={[0.7, 0, 0.4]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 2.8, 8]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.8} />
          </mesh>
          {/* Keter Torah (crown) on top */}
          <mesh position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.35, 0.4, 8]} />
            <meshStandardMaterial color="#d4a030" roughness={0.4} metalness={0.6} />
          </mesh>
          {/* Crown points */}
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i / 5) * Math.PI * 2;
            return (
              <mesh
                key={`crown-${i}`}
                position={[Math.cos(angle) * 0.3, 2.0, Math.sin(angle) * 0.3]}
                castShadow
              >
                <coneGeometry args={[0.08, 0.25, 6]} />
                <meshStandardMaterial color="#d4a030" roughness={0.4} metalness={0.6} />
              </mesh>
            );
          })}
          {/* Parochet (curtain) */}
          <mesh position={[0.55, 0, 0]} castShadow>
            <boxGeometry args={[0.05, 2.4, 0.7]} />
            <meshStandardMaterial color="#5a2a3a" roughness={0.85} />
          </mesh>
          {/* Gold embroidery on curtain */}
          <group position={[0.58, 0, 0]}>
            <StarOfDavid size={0.3} color="#d4a030" />
          </group>
        </group>

        {/* BIMAH (Central raised platform) */}
        <group position={[0, 0.5, 0]}>
          {/* Platform base */}
          <mesh position={[0, 0, 0]} receiveShadow>
            <boxGeometry args={[2.5, 1, 2.5]} />
            <meshStandardMaterial color="#7a6a58" roughness={0.95} />
          </mesh>
          {/* Steps leading up */}
          {[0, 1, 2].map((i) => (
            <mesh key={`step-${i}`} position={[1.5 + i * 0.3, -0.35 + i * 0.25, 0]} receiveShadow>
              <boxGeometry args={[0.3, 0.2, 2]} />
              <meshStandardMaterial color="#8a7a68" roughness={0.95} />
            </mesh>
          ))}
          {/* Reading desk */}
          <mesh position={[0, 0.75, 0]} castShadow>
            <boxGeometry args={[1.2, 0.15, 0.9]} />
            <meshStandardMaterial color="#4a3a2a" roughness={0.8} />
          </mesh>
          {/* Torah scroll on desk */}
          <mesh position={[0, 0.9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
            <meshStandardMaterial color="#d4c4b4" roughness={0.7} />
          </mesh>
          {/* Wooden handles on scroll */}
          <mesh position={[-0.35, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
          </mesh>
          <mesh position={[0.35, 0.9, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.3, 6]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
          </mesh>
          {/* Ornate railing around bimah */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const angle = (i / 8) * Math.PI * 2;
            const r = 1.25;
            return (
              <mesh
                key={`rail-${i}`}
                position={[Math.cos(angle) * r, 0.5, Math.sin(angle) * r]}
                castShadow
              >
                <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
                <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
              </mesh>
            );
          })}
        </group>

        {/* MENORAH (Seven-branched candelabrum) - on side wall */}
        <group position={[3.5, 4, 0]}>
          {/* Central stem */}
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 1.8, 8]} />
            <meshStandardMaterial color="#d4a030" roughness={0.4} metalness={0.7} />
          </mesh>
          {/* Base */}
          <mesh position={[0, -1.0, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.3, 0.3, 8]} />
            <meshStandardMaterial color="#d4a030" roughness={0.4} metalness={0.7} />
          </mesh>
          {/* Seven branches */}
          {[-3, -2, -1, 0, 1, 2, 3].map((offset, idx) => {
            if (offset === 0) {
              // Center candle
              return (
                <mesh key={`candle-center`} position={[0, 1.0, 0]} castShadow>
                  <cylinderGeometry args={[0.06, 0.06, 0.3, 6]} />
                  <meshStandardMaterial color="#f4e4c4" roughness={0.8} />
                </mesh>
              );
            }
            // Side branches
            const x = offset * 0.25;
            const height = 0.8 - Math.abs(offset) * 0.15;
            return (
              <group key={`branch-${idx}`}>
                {/* Curved arm */}
                <mesh position={[x, height / 2, 0]} rotation={[0, 0, offset > 0 ? -Math.PI / 6 : Math.PI / 6]} castShadow>
                  <cylinderGeometry args={[0.05, 0.05, height, 6]} />
                  <meshStandardMaterial color="#d4a030" roughness={0.4} metalness={0.7} />
                </mesh>
                {/* Candle */}
                <mesh position={[x, height + 0.2, 0]} castShadow>
                  <cylinderGeometry args={[0.05, 0.05, 0.25, 6]} />
                  <meshStandardMaterial color="#f4e4c4" roughness={0.8} />
                </mesh>
              </group>
            );
          })}
        </group>

        {/* Stone benches along walls for worshippers */}
        {[-3, 3].map((x) =>
          [-3, -1, 1, 3].map((z, idx) => (
            <mesh key={`seat-${x}-${idx}`} position={[x, 0.3, z]} receiveShadow>
              <boxGeometry args={[0.6, 0.6, 1.5]} />
              <meshStandardMaterial color="#6a5a48" roughness={0.95} />
            </mesh>
          ))
        )}

        {/* WROUGHT IRON LANTERNS on extending brackets - all four walls */}
        {[
          { x: 6.5, y: 7, z: 0, rotation: [0, -Math.PI / 2, 0] },   // East wall
          { x: -6.5, y: 7, z: 0, rotation: [0, Math.PI / 2, 0] },   // West wall
          { x: 0, y: 7, z: 6.5, rotation: [0, 0, 0] },              // South wall
          { x: 0, y: 7, z: -6.5, rotation: [0, Math.PI, 0] }        // North wall
        ].map((pos, i) => (
          <group key={`lantern-${i}`} position={[pos.x, pos.y, pos.z]} rotation={pos.rotation}>
            {/* Wrought iron extending bracket */}
            <mesh position={[0.6, 0, 0]} rotation={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 1.2, 6]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.8} />
            </mesh>
            {/* Decorative scroll at wall */}
            <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
              <torusGeometry args={[0.15, 0.03, 6, 8, Math.PI]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.8} />
            </mesh>

            {/* Lantern cage at end of bracket */}
            <group position={[1.2, 0, 0]}>
              {/* Iron frame - hexagonal */}
              {[0, 1, 2, 3, 4, 5].map((side) => {
                const angle = (side / 6) * Math.PI * 2;
                const x = Math.cos(angle) * 0.2;
                const z = Math.sin(angle) * 0.2;
                return (
                  <mesh key={`frame-${side}`} position={[0, 0, 0]} rotation={[0, angle, 0]} castShadow>
                    <boxGeometry args={[0.015, 0.5, 0.4]} />
                    <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.8} />
                  </mesh>
                );
              })}

              {/* Top and bottom caps */}
              <mesh position={[0, 0.25, 0]} castShadow>
                <cylinderGeometry args={[0.22, 0.18, 0.08, 6]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.8} />
              </mesh>
              <mesh position={[0, -0.25, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.22, 0.08, 6]} />
                <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.8} />
              </mesh>

              {/* Glass panels (slightly amber) */}
              <mesh position={[0, 0, 0]}>
                <cylinderGeometry args={[0.18, 0.18, 0.45, 6]} />
                <meshStandardMaterial
                  color="#f4e4c4"
                  transparent
                  opacity={0.3}
                  roughness={0.1}
                  emissive={isNight ? "#ff9944" : "#000000"}
                  emissiveIntensity={isNight ? 0.4 : 0}
                />
              </mesh>

              {/* Glowing flame inside (only at night) */}
              {isNight && (
                <>
                  <mesh position={[0, 0, 0]} castShadow>
                    <sphereGeometry args={[0.08, 8, 8]} />
                    <meshStandardMaterial
                      color="#ffaa44"
                      emissive="#ff8833"
                      emissiveIntensity={1.5}
                      transparent
                      opacity={0.9}
                    />
                  </mesh>
                  {/* Point light for illumination */}
                  <pointLight
                    position={[0, 0, 0]}
                    color="#ff9944"
                    intensity={2.5}
                    distance={8}
                    castShadow
                  />
                </>
              )}
            </group>
          </group>
        ))}
      </group>
    </group>
  );
};

// Star of David component (used throughout district)
const StarOfDavid: React.FC<{ size?: number; color?: string }> = ({ size = 0.4, color = '#3a3a3a' }) => {
  // Vertices of upward-pointing triangle
  const h = size * 0.866; // height from center to vertex (sqrt(3)/2)
  const upTop = { x: 0, y: h * 0.667 };
  const upLeft = { x: -size * 0.5, y: -h * 0.333 };
  const upRight = { x: size * 0.5, y: -h * 0.333 };

  // Vertices of downward-pointing triangle
  const downBottom = { x: 0, y: -h * 0.667 };
  const downLeft = { x: -size * 0.5, y: h * 0.333 };
  const downRight = { x: size * 0.5, y: h * 0.333 };

  const thickness = 0.08;

  // Helper to create a line between two points
  const createLine = (p1: { x: number; y: number }, p2: { x: number; y: number }, key: string) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    return (
      <mesh key={key} position={[0, midY, midX]} rotation={[0, 0, angle]} castShadow>
        <boxGeometry args={[length, thickness, thickness]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    );
  };

  return (
    <group>
      {/* Upward triangle */}
      {createLine(upTop, upLeft, 'up-tl')}
      {createLine(upTop, upRight, 'up-tr')}
      {createLine(upLeft, upRight, 'up-lr')}

      {/* Downward triangle */}
      {createLine(downBottom, downLeft, 'down-bl')}
      {createLine(downBottom, downRight, 'down-br')}
      {createLine(downLeft, downRight, 'down-lr')}
    </group>
  );
};

// MIKVEH (Ritual Bath) - Essential Jewish structure
const Mikveh: React.FC<{ seed: number }> = ({ seed }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {hovered && (
        <HoverLabel
          title="Mikveh"
          lines={[
            'Ritual bath house',
            'Seven stone steps',
            'Natural spring water'
          ]}
          offset={[0, 4, 0]}
        />
      )}
      {/* Entrance building */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 3, 3.5]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.96} />
      </mesh>

      {/* Door */}
      <mesh position={[1.76, 1.2, 0]} castShadow>
        <boxGeometry args={[0.12, 2.2, 1.2]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mezuzah */}
      <mesh position={[1.82, 1.8, 0.55]} rotation={[0, 0, Math.PI / 12]} castShadow>
        <boxGeometry args={[0.08, 0.28, 0.07]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Underground pool */}
      <group position={[0, -1.2, 3]}>
        {/* Pool basin */}
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[3, 2.4, 3]} />
          <meshStandardMaterial color="#6a5a4a" roughness={0.96} />
        </mesh>

        {/* Water - natural spring water (required for mikveh) */}
        <mesh position={[0, 1.0, 0]}>
          <boxGeometry args={[2.8, 0.08, 2.8]} />
          <meshStandardMaterial color="#2a3a4a" roughness={0.15} metalness={0.2} transparent opacity={0.85} />
        </mesh>

        {/* Seven stone steps (traditional number) */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <mesh key={`step-${i}`} position={[-1.2, 0.9 - i * 0.22, 1.2 - i * 0.35]} receiveShadow>
            <boxGeometry args={[0.8, 0.18, 0.5]} />
            <meshStandardMaterial color="#7a6a58" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Sign with Hebrew inscription */}
      <mesh position={[1.9, 2.8, 0]} castShadow>
        <boxGeometry args={[0.08, 0.5, 1.2]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
      </mesh>
    </group>
  );
};

// YESHIVA (Study House) - Multiple rooms with scholars
const Yeshiva: React.FC<{ seed: number }> = ({ seed }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {hovered && (
        <HoverLabel
          title="Yeshiva"
          lines={[
            'Jewish study house',
            'Torah scholarship',
            'Students and scholars'
          ]}
          offset={[0, 5, 0]}
        />
      )}
      {/* Main study hall */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, 4, 6]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.96} />
      </mesh>

      {/* Door */}
      <mesh position={[3.05, 1.5, 0]} castShadow>
        <boxGeometry args={[0.12, 2.8, 1.4]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mezuzah */}
      <mesh position={[3.12, 2.2, 0.65]} rotation={[0, 0, Math.PI / 12]} castShadow>
        <boxGeometry args={[0.08, 0.28, 0.07]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Large windows for studying (natural light essential) */}
      {[-1.5, 0, 1.5].map((z, i) => (
        <mesh key={`window-${i}`} position={[3.05, 2.8, z]} castShadow>
          <boxGeometry args={[0.12, 1.2, 0.6]} />
          <meshStandardMaterial color="#1a1a2a" roughness={0.4} />
        </mesh>
      ))}

      {/* Interior bookshelves - visible through windows */}
      <group position={[-2.5, 2, 0]}>
        {/* Shelf structure */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.5, 3, 5]} />
          <meshStandardMaterial color="#4a3a2a" roughness={0.9} />
        </mesh>
        {/* Books - stacked */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={`books-${i}`} position={[0.22, -1.2 + i * 0.5, 0]} castShadow>
            <boxGeometry args={[0.35, 0.45, 4.5]} />
            <meshStandardMaterial color="#3a2a1a" roughness={0.95} />
          </mesh>
        ))}
      </group>

      {/* Study tables */}
      {[-1.5, 1.5].map((x, i) => (
        <group key={`table-${i}`} position={[x, 0.5, 0]}>
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[2, 0.12, 1.2]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
          {/* Open books on table */}
          <mesh position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.5, 0.06, 0.7]} />
            <meshStandardMaterial color="#d4c4b4" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Stone benches for students */}
      {[-1.5, 1.5].map((x) =>
        [-1.5, 1.5].map((z, i) => (
          <mesh key={`bench-${x}-${i}`} position={[x, 0.25, z]} receiveShadow>
            <boxGeometry args={[1.8, 0.5, 0.5]} />
            <meshStandardMaterial color="#6a5a48" roughness={0.95} />
          </mesh>
        ))
      )}
    </group>
  );
};

// KOSHER BUTCHER SHOP
const KosherButcher: React.FC<{ seed: number }> = ({ seed }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {hovered && (
        <HoverLabel
          title="Kosher Butcher"
          lines={[
            'Kosher meat shop',
            'Ritual slaughter',
            'Certified kosher'
          ]}
          offset={[0, 3.5, 0]}
        />
      )}
      {/* Shop building */}
      <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 2.4, 3]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.96} />
      </mesh>

      {/* Open storefront */}
      <mesh position={[1.51, 0.8, 0]} castShadow>
        <boxGeometry args={[0.1, 1.6, 2.2]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mezuzah */}
      <mesh position={[1.56, 1.2, 1.05]} rotation={[0, 0, Math.PI / 12]} castShadow>
        <boxGeometry args={[0.06, 0.22, 0.06]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Hanging meat hooks */}
      {[-0.5, 0, 0.5].map((z, i) => (
        <group key={`meat-${i}`} position={[0.8, 1.5, z]}>
          <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.12, 0.5, 8]} />
            <meshStandardMaterial color="#7a4a3a" roughness={0.75} />
          </mesh>
        </group>
      ))}

      {/* Stone cutting counter */}
      <mesh position={[0, 0.6, 0]} receiveShadow>
        <boxGeometry args={[2.5, 1.2, 1.5]} />
        <meshStandardMaterial color="#8a7a6a" roughness={0.95} />
      </mesh>

      {/* Kosher certification sign (Hebrew) */}
      <mesh position={[1.6, 2.2, 0]} castShadow>
        <boxGeometry args={[0.08, 0.4, 0.8]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
      </mesh>
    </group>
  );
};

// JEWISH RESIDENTIAL HOUSE - Historically accurate Damascus townhouse
const JewishHouse: React.FC<{ seed: number }> = ({ seed }) => {
  const rand = (offset: number) => seededRandom(seed + offset);
  const width = 4.5 + rand(1) * 2;    // Bigger: 4.5-6.5 units
  const depth = 4.5 + rand(2) * 2;    // Bigger: 4.5-6.5 units
  const height = 4.5 + rand(3) * 1.5; // Taller: 4.5-6 units (1.5-2 stories)
  const [hovered, setHovered] = useState(false);

  // Lighter sandstone/limestone colors typical of Damascus
  const stoneColor = rand(10) > 0.5 ? '#c9b896' : '#d4c4a8'; // Warm sandstone
  const roofColor = '#a89878'; // Light terracotta/sandstone roof

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {hovered && (
        <HoverLabel
          title="Modest House"
          lines={[
            'Private residence',
            'Mezuzah on doorframe',
            'Limestone construction'
          ]}
          offset={[0, height + 1.5, 0]}
        />
      )}
      {/* Main house - warm limestone/sandstone */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={stoneColor} roughness={0.88} />
      </mesh>

      {/* Stone courses - horizontal bands for texture */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={`course-${i}`} position={[0, (height / 4) * i + 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[width + 0.05, 0.08, depth + 0.05]} />
          <meshStandardMaterial color="#b8a888" roughness={0.92} />
        </mesh>
      ))}

      {/* Flat roof with parapet */}
      <mesh position={[0, height + 0.05, 0]} receiveShadow>
        <boxGeometry args={[width + 0.3, 0.1, depth + 0.3]} />
        <meshStandardMaterial color={roofColor} roughness={0.95} />
      </mesh>

      {/* Roof parapet walls */}
      {[-width/2, width/2].map((x, idx) => (
        <mesh key={`parapet-x-${idx}`} position={[x, height + 0.4, 0]} castShadow>
          <boxGeometry args={[0.25, 0.6, depth + 0.3]} />
          <meshStandardMaterial color={stoneColor} roughness={0.9} />
        </mesh>
      ))}
      {[-depth/2, depth/2].map((z, idx) => (
        <mesh key={`parapet-z-${idx}`} position={[0, height + 0.4, z]} castShadow>
          <boxGeometry args={[width, 0.6, 0.25]} />
          <meshStandardMaterial color={stoneColor} roughness={0.9} />
        </mesh>
      ))}

      {/* Arched wooden door with stone frame */}
      <group position={[width / 2, 0, 0]}>
        {/* Stone door frame */}
        <mesh position={[0.08, height * 0.4, 0]} castShadow>
          <boxGeometry args={[0.15, height * 0.75, 1.4]} />
          <meshStandardMaterial color="#9a8a7a" roughness={0.9} />
        </mesh>
        {/* Wooden door */}
        <mesh position={[0.05, height * 0.3, 0]} castShadow>
          <boxGeometry args={[0.08, height * 0.55, 1.2]} />
          <meshStandardMaterial color="#6a4a3a" roughness={0.85} />
        </mesh>
        {/* Decorative lintel above door */}
        <mesh position={[0.08, height * 0.72, 0]} castShadow>
          <boxGeometry args={[0.2, 0.25, 1.5]} />
          <meshStandardMaterial color="#9a8a7a" roughness={0.9} />
        </mesh>
      </group>

      {/* MEZUZAH on doorframe - important Jewish marker */}
      <mesh position={[width / 2 + 0.12, height * 0.6, 0.6]} rotation={[0, 0, Math.PI / 12]} castShadow>
        <boxGeometry args={[0.08, 0.28, 0.06]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Multiple windows - ground floor and upper floor */}
      {/* Upper floor windows */}
      {[-depth * 0.25, depth * 0.25].map((z, idx) => (
        <group key={`upper-window-${idx}`} position={[width / 2, height * 0.75, z]}>
          <mesh position={[0.08, 0, 0]} castShadow>
            <boxGeometry args={[0.12, 0.8, 0.6]} />
            <meshStandardMaterial color="#8a9aaa" roughness={0.3} transparent opacity={0.6} />
          </mesh>
          {/* Window frame */}
          <mesh position={[0.12, 0, 0]} castShadow>
            <boxGeometry args={[0.08, 0.9, 0.7]} />
            <meshStandardMaterial color="#9a8a7a" roughness={0.85} />
          </mesh>
        </group>
      ))}

      {/* Ground floor window */}
      <group position={[width / 2, height * 0.45, -depth * 0.3]}>
        <mesh position={[0.08, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.7, 0.5]} />
          <meshStandardMaterial color="#8a9aaa" roughness={0.3} transparent opacity={0.6} />
        </mesh>
        {/* Window frame */}
        <mesh position={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[0.08, 0.8, 0.6]} />
          <meshStandardMaterial color="#9a8a7a" roughness={0.85} />
        </mesh>
      </group>

      {/* Small decorative niche/alcove above door */}
      <mesh position={[width / 2 + 0.1, height * 0.85, 0]} castShadow>
        <boxGeometry args={[0.15, 0.4, 0.5]} />
        <meshStandardMaterial color="#b8a888" roughness={0.9} />
      </mesh>

      {/* Base plinth */}
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <boxGeometry args={[width + 0.2, 0.3, depth + 0.2]} />
        <meshStandardMaterial color="#a89878" roughness={0.95} />
      </mesh>
    </group>
  );
};

// TORAH SCRIBE WORKSHOP (Sofer)
const TorahScribeWorkshop: React.FC<{ seed: number }> = ({ seed }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {hovered && (
        <HoverLabel
          title="Torah Scribe Workshop"
          lines={[
            'Sofer (scribe)',
            'Hand-written scrolls',
            'Sacred texts'
          ]}
          offset={[0, 4, 0]}
        />
      )}
      {/* Workshop building */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.5, 3, 3.5]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.96} />
      </mesh>

      {/* Door */}
      <mesh position={[1.76, 1.2, 0]} castShadow>
        <boxGeometry args={[0.12, 2.2, 1.2]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.7} />
      </mesh>

      {/* Mezuzah */}
      <mesh position={[1.82, 1.6, 0.55]} rotation={[0, 0, Math.PI / 12]} castShadow>
        <boxGeometry args={[0.08, 0.24, 0.06]} />
        <meshStandardMaterial color="#3a2a1a" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Large window (scribes need good light) */}
      <mesh position={[1.76, 2.2, 0]} castShadow>
        <boxGeometry args={[0.12, 1, 1.5]} />
        <meshStandardMaterial color="#1a1a2a" roughness={0.4} />
      </mesh>

      {/* Scribal desk visible through window */}
      <group position={[-1, 1.2, 0]}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[1.2, 0.12, 0.8]} />
          <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
        </mesh>
        {/* Partially written scroll */}
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.6, 8]} />
          <meshStandardMaterial color="#d4c4b4" roughness={0.7} />
        </mesh>
        {/* Parchment */}
        <mesh position={[0.2, 0.08, 0]} castShadow>
          <boxGeometry args={[0.4, 0.02, 0.6]} />
          <meshStandardMaterial color="#e4d4c4" roughness={0.85} />
        </mesh>
      </group>

      {/* Ink well and quills on shelf */}
      <group position={[-1.2, 2, 0.8]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.14, 8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.7} />
        </mesh>
      </group>

      {/* Hebrew sign "Sofer" */}
      <mesh position={[1.85, 2.8, 0]} castShadow>
        <boxGeometry args={[0.08, 0.35, 0.6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.85} />
      </mesh>
    </group>
  );
};

// COMMUNITY WELL with Hebrew inscription
const CommunityWell: React.FC<{ seed: number }> = ({ seed }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
    >
      {hovered && (
        <HoverLabel
          title="Community Well"
          lines={[
            'Public water source',
            'Hebrew inscription',
            'Gathering place'
          ]}
          offset={[0, 3, 0]}
        />
      )}
      {/* Stone well structure */}
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 1, 1.6, 12]} />
        <meshStandardMaterial color="#6a5a48" roughness={0.96} />
      </mesh>

      {/* Wooden crossbeam for bucket */}
      <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 2, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>

      {/* Support posts */}
      <mesh position={[-1, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.8, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>
      <mesh position={[1, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.8, 6]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
      </mesh>

      {/* Wooden bucket */}
      <mesh position={[0.4, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.22, 0.35, 8]} />
        <meshStandardMaterial color="#6a5a4a" roughness={0.9} />
      </mesh>

      {/* Stone with Hebrew inscription */}
      <mesh position={[0, 1.6, 0.82]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.08]} />
        <meshStandardMaterial color="#5a4a38" roughness={0.9} />
      </mesh>
    </group>
  );
};

// Main Jewish Quarter decoration component
const JewishQuarterDecor: React.FC<{
  mapX: number;
  mapY: number;
  terrainHeightmap: TerrainHeightmap | null;
  sessionSeed: number;
  buildingPositions?: Array<[number, number, number]>;
  timeOfDay?: number;
}> = ({ mapX, mapY, terrainHeightmap, sessionSeed, buildingPositions = [], timeOfDay }) => {
  const district = getDistrictType(mapX, mapY);

  const decorations = useMemo(() => {
    if (district !== 'JEWISH_QUARTER') {
      return [];
    }

    console.log('[JewishQuarterDecor] Rendering Jewish Quarter decorations at', mapX, mapY);
    console.log('[JewishQuarterDecor] Heightmap available:', !!terrainHeightmap);
    console.log('[JewishQuarterDecor] Building positions count:', buildingPositions.length);

    const seed = mapX * 1000 + mapY * 13 + sessionSeed;
    const items: JSX.Element[] = [];
    let idCounter = 0;

    const rand = (offset = 0) => seededRandom(seed + offset);

    // Track placed Jewish Quarter structures to avoid overlaps
    const placedStructures: Array<{ x: number; z: number; radius: number; buffer: number }> = [];

    // Helper function to get terrain height, defaulting to 0 if no heightmap
    const getHeight = (x: number, z: number): number => {
      if (terrainHeightmap) {
        return sampleTerrainHeight(terrainHeightmap, x, z);
      }
      return 0.2; // Default ground level
    };

    // Helper function to check if a position collides with existing buildings or placed structures
    const isPositionClear = (x: number, z: number, radius: number, buffer: number = 3): boolean => {
      // Check against procedural buildings
      for (const building of buildingPositions) {
        const dx = x - building[0];
        const dz = z - building[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        // Buildings are typically 8 units size, so check against half that + our radius + buffer
        const minDist = 4 + radius + buffer;
        if (dist < minDist) {
          return false;
        }
      }

      // Check against already-placed Jewish Quarter structures
      for (const structure of placedStructures) {
        const dx = x - structure.x;
        const dz = z - structure.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const minDist = structure.radius + structure.buffer + radius + buffer;
        if (dist < minDist) {
          return false;
        }
      }

      return true;
    };

    // Helper to find a clear position (tries multiple times)
    const findClearPosition = (baseX: number, baseZ: number, radius: number, maxAttempts: number = 30, buffer: number = 3): [number, number] | null => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const offsetX = (rand(9000 + attempt * 7) - 0.5) * 15;
        const offsetZ = (rand(9001 + attempt * 7) - 0.5) * 15;
        const testX = baseX + offsetX;
        const testZ = baseZ + offsetZ;

        if (isPositionClear(testX, testZ, radius, buffer)) {
          return [testX, testZ];
        }
      }
      return null;
    };

    // MAIN SYNAGOGUE - Center of community (VERY LARGE - radius 12, needs 8 unit buffer!)
    // Try fixed central position first, then search if needed
    let synagoguePos: [number, number] | null = null;
    const synagogueRadius = 12;
    const synagogueBuffer = 8;

    // Try center of district first
    if (isPositionClear(0, 0, synagogueRadius, synagogueBuffer)) {
      synagoguePos = [0, 0];
    } else {
      // Try several other prominent positions with wider search
      synagoguePos = findClearPosition(-8, -8, synagogueRadius, 50, synagogueBuffer);
    }

    if (synagoguePos) {
      const [synagogueX, synagogueZ] = synagoguePos;
      const synagogueY = getHeight(synagogueX, synagogueZ);
      items.push(
        <group key={`main-synagogue`} position={[synagogueX, synagogueY, synagogueZ]} rotation={[0, rand(102) * Math.PI * 2, 0]}>
          <MainSynagogue seed={seed + 1000} timeOfDay={timeOfDay} />
        </group>
      );
      placedStructures.push({ x: synagogueX, z: synagogueZ, radius: synagogueRadius, buffer: synagogueBuffer });
      console.log('[JewishQuarterDecor] Placed main synagogue at', synagogueX, synagogueZ);
    } else {
      console.warn('[JewishQuarterDecor] Could not find clear position for main synagogue after 50 attempts');
    }

    // MIKVEH - Essential ritual bath (medium - radius ~3)
    const mikvehPos = findClearPosition(8, -8, 3);
    if (mikvehPos) {
      const [mikvehX, mikvehZ] = mikvehPos;
      const mikvehY = getHeight(mikvehX, mikvehZ);
      items.push(
        <group key={`mikveh`} position={[mikvehX, mikvehY, mikvehZ]} rotation={[0, rand(202) * Math.PI * 2, 0]}>
          <Mikveh seed={seed + 2000} />
        </group>
      );
      placedStructures.push({ x: mikvehX, z: mikvehZ, radius: 3, buffer: 3 });
    }

    // YESHIVA - Study house (medium - radius ~4)
    const yeshivaPos = findClearPosition(-10, 6, 4);
    if (yeshivaPos) {
      const [yeshivaX, yeshivaZ] = yeshivaPos;
      const yeshivaY = getHeight(yeshivaX, yeshivaZ);
      items.push(
        <group key={`yeshiva`} position={[yeshivaX, yeshivaY, yeshivaZ]} rotation={[0, rand(302) * Math.PI * 2, 0]}>
          <Yeshiva seed={seed + 3000} />
        </group>
      );
      placedStructures.push({ x: yeshivaX, z: yeshivaZ, radius: 4, buffer: 3 });
    }

    // KOSHER BUTCHER - 2 shops (small - radius ~2.5)
    for (let i = 0; i < 2; i++) {
      const angle = rand(400 + i * 50) * Math.PI * 2;
      const dist = 12 + rand(401 + i * 50) * 6;
      const baseX = Math.cos(angle) * dist;
      const baseZ = Math.sin(angle) * dist;

      const butcherPos = findClearPosition(baseX, baseZ, 2.5);
      if (butcherPos) {
        const [x, z] = butcherPos;
        const y = getHeight(x, z);
        items.push(
          <group key={`butcher-${i}`} position={[x, y, z]} rotation={[0, rand(402 + i * 50) * Math.PI * 2, 0]}>
            <KosherButcher seed={seed + 4000 + i * 100} />
          </group>
        );
        placedStructures.push({ x, z, radius: 2.5, buffer: 3 });
      }
    }

    // TORAH SCRIBE WORKSHOP (small - radius ~2.5)
    const scribePos = findClearPosition(5, 8, 2.5);
    if (scribePos) {
      const [scribeX, scribeZ] = scribePos;
      const scribeY = getHeight(scribeX, scribeZ);
      items.push(
        <group key={`scribe`} position={[scribeX, scribeY, scribeZ]} rotation={[0, rand(502) * Math.PI * 2, 0]}>
          <TorahScribeWorkshop seed={seed + 5000} />
        </group>
      );
      placedStructures.push({ x: scribeX, z: scribeZ, radius: 2.5, buffer: 3 });
    }

    // RESIDENTIAL HOUSES - 8-12 distinctive Jewish homes (reduced from 12-15 to avoid overcrowding)
    const houseCount = 8 + Math.floor(rand(600) * 5);
    let housesPlaced = 0;
    for (let i = 0; i < houseCount && housesPlaced < houseCount; i++) {
      const angle = rand(700 + i * 13) * Math.PI * 2;
      const dist = 10 + rand(701 + i * 13) * 12;
      const baseX = Math.cos(angle) * dist;
      const baseZ = Math.sin(angle) * dist;

      const housePos = findClearPosition(baseX, baseZ, 2.5, 20);
      if (housePos) {
        const [x, z] = housePos;
        const y = getHeight(x, z);
        items.push(
          <group key={`house-${i}`} position={[x, y, z]} rotation={[0, rand(702 + i * 13) * Math.PI * 2, 0]}>
            <JewishHouse seed={seed + 6000 + i * 50} />
          </group>
        );
        placedStructures.push({ x, z, radius: 2.5, buffer: 3 });
        housesPlaced++;
      }
    }

    // COMMUNITY WELL - Central gathering point (small - radius ~1.5)
    const wellPos = findClearPosition(0, 0, 1.5);
    if (wellPos) {
      const [wellX, wellZ] = wellPos;
      const wellY = getHeight(wellX, wellZ);
      items.push(
        <group key={`well`} position={[wellX, wellY, wellZ]}>
          <CommunityWell seed={seed + 7000} />
        </group>
      );
      placedStructures.push({ x: wellX, z: wellZ, radius: 1.5, buffer: 3 });
    }

    // MAGEN DAVID SYMBOLS - On walls and posts (6-8 scattered)
    const symbolCount = 6 + Math.floor(rand(900) * 3);
    for (let i = 0; i < symbolCount; i++) {
      const angle = rand(1000 + i * 17) * Math.PI * 2;
      const dist = 5 + rand(1001 + i * 17) * 12;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = getHeight(x, z) + 2.5;
      items.push(
        <group key={`symbol-${i}`} position={[x, y, z]} rotation={[0, rand(1002 + i * 17) * Math.PI * 2, 0]}>
          <StarOfDavid size={0.4} color="#4a3a2a" />
        </group>
      );
    }

    console.log('[JewishQuarterDecor] Created', items.length, 'decoration items');
    return items;
  }, [mapX, mapY, district, terrainHeightmap, sessionSeed, buildingPositions]);

  if (district !== 'JEWISH_QUARTER') return null;

  return <group>{decorations}</group>;
};

export default JewishQuarterDecor;
