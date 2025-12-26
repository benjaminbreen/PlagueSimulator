/**
 * BirdFlock Component
 * Animated flock of sparrows with simple boids-like flocking behavior
 * Performant using InstancedMesh for single draw call
 */

import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Bird {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number; // For wing flapping
}

interface BirdFlockProps {
  center?: [number, number, number];
  count?: number;
  bounds?: number;
  mapX?: number;
  mapY?: number;
}

export const BirdFlock: React.FC<BirdFlockProps> = ({
  center = [0, 6, 0],
  count = 8,
  bounds = 18,
  mapX = 0,
  mapY = 0
}) => {
  // Only render in central marketplace
  if (mapX !== 0 || mapY !== 0) return null;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const frameCounter = useRef(0);

  // Pre-allocate flockCenter to avoid per-frame allocation
  const flockCenter = useMemo(() => new THREE.Vector3(center[0], center[1], center[2]), [center]);

  // Initialize birds with random positions and velocities
  const birds = useRef<Bird[]>(
    Array.from({ length: count }, (_, i) => ({
      position: new THREE.Vector3(
        center[0] + (Math.random() - 0.5) * bounds * 0.5,
        center[1] + Math.random() * 3,
        center[2] + (Math.random() - 0.5) * bounds * 0.5
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 2
      ),
      phase: Math.random() * Math.PI * 2
    }))
  );

  // Reusable vectors to avoid allocations
  const tempVec = useMemo(() => new THREE.Vector3(), []);
  const cohesion = useMemo(() => new THREE.Vector3(), []);
  const separation = useMemo(() => new THREE.Vector3(), []);
  const alignment = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const t = state.clock.elapsedTime;

    // Frame-skipping: only run full boids calculation every 3rd frame
    frameCounter.current++;
    const runFullUpdate = frameCounter.current % 3 === 0;

    // Flocking parameters
    const maxSpeed = 4;
    const minSpeed = 1.5;
    const cohesionStrength = 0.8;
    const separationStrength = 1.2;
    const alignmentStrength = 0.6;
    const separationDist = 1.5;
    const perceptionRadius = 6;
    const boundaryStrength = 0.5;
    const wanderStrength = 0.3;

    // Update each bird
    birds.current.forEach((bird, i) => {
      // Only run expensive boids calculation every 3rd frame
      if (runFullUpdate) {
        cohesion.set(0, 0, 0);
        separation.set(0, 0, 0);
        alignment.set(0, 0, 0);
        let neighbors = 0;

        // Check neighbors
        birds.current.forEach((other, j) => {
          if (i === j) return;

          tempVec.subVectors(other.position, bird.position);
          const dist = tempVec.length();

          if (dist < perceptionRadius) {
            // Cohesion - move toward center of neighbors
            cohesion.add(other.position);

            // Alignment - match velocity of neighbors
            alignment.add(other.velocity);

            neighbors++;

            // Separation - avoid crowding
            if (dist < separationDist && dist > 0.01) {
              tempVec.normalize().multiplyScalar(-1 / dist);
              separation.add(tempVec);
            }
          }
        });

        if (neighbors > 0) {
          // Average cohesion target
          cohesion.divideScalar(neighbors);
          cohesion.sub(bird.position);
          cohesion.normalize().multiplyScalar(cohesionStrength);

          // Average alignment
          alignment.divideScalar(neighbors);
          alignment.normalize().multiplyScalar(alignmentStrength);
        }

        // Apply separation
        separation.multiplyScalar(separationStrength);

        // Boundary avoidance - steer back toward center area
        tempVec.subVectors(flockCenter, bird.position);
        const distFromCenter = tempVec.length();
        if (distFromCenter > bounds * 0.4) {
          tempVec.normalize().multiplyScalar(boundaryStrength * (distFromCenter / bounds));
          bird.velocity.add(tempVec);
        }

        // Height constraints
        if (bird.position.y < 3) {
          bird.velocity.y += 0.5;
        } else if (bird.position.y > 12) {
          bird.velocity.y -= 0.3;
        }

        // Random wander for natural movement
        bird.velocity.x += (Math.sin(t * 2 + i * 1.7) * 0.5 + Math.random() - 0.5) * wanderStrength * delta * 10;
        bird.velocity.z += (Math.cos(t * 1.8 + i * 2.3) * 0.5 + Math.random() - 0.5) * wanderStrength * delta * 10;
        bird.velocity.y += (Math.sin(t * 3 + i * 0.9) * 0.3) * wanderStrength * delta * 5;

        // Apply flocking forces
        bird.velocity.add(cohesion.multiplyScalar(delta * 3));
        bird.velocity.add(separation.multiplyScalar(delta * 3));
        bird.velocity.add(alignment.multiplyScalar(delta * 3));

        // Clamp speed
        const speed = bird.velocity.length();
        if (speed > maxSpeed) {
          bird.velocity.normalize().multiplyScalar(maxSpeed);
        } else if (speed < minSpeed) {
          bird.velocity.normalize().multiplyScalar(minSpeed);
        }
      }

      // Always update position and visuals every frame for smooth movement
      const speed = bird.velocity.length();
      bird.position.add(tempVec.copy(bird.velocity).multiplyScalar(delta));

      // Update wing flap phase
      bird.phase += delta * (12 + speed * 2);

      // Update instance matrix
      dummy.position.copy(bird.position);

      // Bird faces direction of travel
      if (bird.velocity.lengthSq() > 0.01) {
        dummy.lookAt(
          bird.position.x + bird.velocity.x,
          bird.position.y + bird.velocity.y,
          bird.position.z + bird.velocity.z
        );
      }

      // Wing flapping via slight rotation
      dummy.rotation.z += Math.sin(bird.phase) * 0.4;

      // Slight banking on turns
      dummy.rotation.x += bird.velocity.y * 0.1;

      dummy.scale.setScalar(0.12);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Simple bird geometry - elongated shape with wing suggestion
  const birdGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Simple bird shape: body cone + two wing triangles
    const vertices = new Float32Array([
      // Body (elongated cone pointing forward)
      0, 0, 0.5,      // nose
      -0.15, 0.05, -0.3,  // left back
      0.15, 0.05, -0.3,   // right back
      0, -0.08, -0.2,     // bottom

      // Left wing
      -0.15, 0.05, -0.1,
      -0.6, 0.1, 0,
      -0.15, 0.05, 0.1,

      // Right wing
      0.15, 0.05, -0.1,
      0.6, 0.1, 0,
      0.15, 0.05, 0.1,

      // Tail
      0, 0.05, -0.3,
      -0.12, 0.08, -0.5,
      0.12, 0.08, -0.5,
    ]);

    const indices = new Uint16Array([
      // Body
      0, 1, 2,
      0, 3, 1,
      0, 2, 3,
      1, 3, 2,
      // Left wing
      4, 5, 6,
      // Right wing
      7, 8, 9,
      // Tail
      10, 11, 12,
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    geo.computeVertexNormals();

    return geo;
  }, []);

  return (
    <instancedMesh
      ref={meshRef}
      args={[birdGeometry, undefined, count]}
      frustumCulled={false}
    >
      <meshStandardMaterial
        color="#4a3a2a"
        roughness={0.8}
        side={THREE.FrontSide}
      />
    </instancedMesh>
  );
};
