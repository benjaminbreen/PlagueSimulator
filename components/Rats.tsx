import React, { useRef, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationParams, CONSTANTS } from '../types';

const RAT_SPEED = 5.0;
const tempObj = new THREE.Object3D();

export class Rat {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    active: boolean;

    constructor() {
        this.position = new THREE.Vector3((Math.random()-0.5)*70, 0, (Math.random()-0.5)*70);
        this.velocity = new THREE.Vector3(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        this.active = true;
    }

    update(dt: number, params: SimulationParams) {
        if (!this.active) return;
        
        if (Math.random() < 0.03) {
             this.velocity.set(Math.random()-0.5, 0, Math.random()-0.5).normalize();
        }

        // Avoid the central well area if too close
        if (this.position.length() < 4) {
             this.velocity.add(this.position.clone().normalize().multiplyScalar(0.5)).normalize();
        }

        const boundary = CONSTANTS.MARKET_SIZE - 5;
        if (Math.abs(this.position.x) > boundary || Math.abs(this.position.z) > boundary) {
            this.velocity.multiplyScalar(-1);
            this.position.clamp(new THREE.Vector3(-boundary, 0, -boundary), new THREE.Vector3(boundary, 0, boundary));
        }

        this.position.add(this.velocity.clone().multiplyScalar(RAT_SPEED * dt));
    }
}

interface RatsProps {
  params: SimulationParams;
}

export const Rats = forwardRef<Rat[], RatsProps>(({ params }, ref) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const rats = useMemo(() => {
      const arr = [];
      for(let i=0; i<40; i++) arr.push(new Rat());
      return arr;
  }, []);

  useImperativeHandle(ref, () => rats, [rats]);

  useFrame((state, delta) => {
    const dt = delta * params.simulationSpeed;
    
    // Rats only appear if sanitation < 40%
    const showRats = params.hygieneLevel < 0.4;
    const ratLimit = showRats ? Math.floor(rats.length * (0.8 - params.hygieneLevel * 2)) : 0;
    
    rats.forEach((rat, i) => {
        rat.active = i < Math.max(0, ratLimit);
        if (rat.active && dt > 0) rat.update(dt, params);
    });

    if (meshRef.current) {
        rats.forEach((rat, i) => {
            if (rat.active) {
                tempObj.position.copy(rat.position);
                tempObj.lookAt(rat.position.clone().add(rat.velocity));
                tempObj.scale.set(0.2, 0.1, 0.45); 
                tempObj.updateMatrix();
            } else {
                tempObj.scale.set(0,0,0);
                tempObj.updateMatrix();
            }
            meshRef.current!.setMatrixAt(i, tempObj.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, 40]} castShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#1a110a" roughness={1.0} />
    </instancedMesh>
  );
});