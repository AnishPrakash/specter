'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text, Billboard } from '@react-three/drei';
import type { SecretFinding } from '@/types';
import * as THREE from 'three';

interface Props { findings: SecretFinding[]; }

export default function CommitTimeline({ findings }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      child.position.y = -80 + 2.5 * Math.sin(state.clock.elapsedTime * 0.9 + i * 0.6);
    });
  });

  const displayed = findings.slice(0, 24);

  return (
    <group position={[0, -80, 0]}>
      <Box args={[280, 0.4, 0.4]}>
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.5} />
      </Box>
      <Text position={[-148, 5, 0]} fontSize={4} color="#ffffff" outlineWidth={0.2} outlineColor="#000000">
        COMMIT HISTORY
      </Text>

      <group ref={groupRef}>
        {displayed.map((f, i) => {
          const x = -120 + (i / Math.max(displayed.length - 1, 1)) * 240;
          const height = 6 + (f.entropy / 8) * 16;
          return (
            <group key={i} position={[x, 0, 0]}>
              <Box args={[2.5, height, 2.5]}>
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.85} transparent opacity={0.9} />
              </Box>
              <Billboard follow>
                <Text 
                  position={[0, height / 2 + 5, 0]} 
                  fontSize={3.5} 
                  color="#ffffff" 
                  outlineWidth={0.2} 
                  outlineColor="#000000" 
                  anchorX="center"
                >
                  {f.type.substring(0, 12)}
                </Text>
              </Billboard>
            </group>
          );
        })}
      </group>
    </group>
  );
}