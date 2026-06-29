'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Text, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { useScanStore } from '@/store/scanStore';

export default function RepoNode() {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const { scanResult } = useScanStore();
  const isReady = !!scanResult;
  const score = scanResult?.threatScore ?? 0;

  const color = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#3b82f6';
  const repoName = scanResult?.repoUrl?.split('/').slice(-2).join('/') ?? 'SYSTEM IDLE';

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.05;
      const pulse = 1 + 0.04 * Math.sin(state.clock.elapsedTime * 2);
      meshRef.current.scale.setScalar(pulse);
    }
    if (ringRef.current) {
      ringRef.current.rotation.z += 0.006;
    }
  });

  return (
    <group>
      {/* High-res Core sphere (64 segments makes it perfectly smooth) */}
      <Sphere ref={meshRef} args={[10, 64, 64]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.2} metalness={0.9} />
      </Sphere>

      <Sphere args={[15, 32, 32]}>
        <meshStandardMaterial color={color} transparent opacity={0.06} wireframe />
      </Sphere>

      <Ring ref={ringRef} args={[17, 19, 64]}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.5} side={THREE.DoubleSide} />
      </Ring>

      {/* TEXT UPGRADES: High contrast white with black outlines */}
      <Text 
        position={[0, -22, 0]} 
        fontSize={isReady ? 4.5 : 3} 
        color="#ffffff" 
        outlineWidth={0.25} 
        outlineColor="#000000" 
        anchorX="center" 
        anchorY="middle"
      >
        {repoName}
      </Text>
      
      {isReady && (
        <Text 
          position={[0, -28, 0]} 
          fontSize={3.5} 
          color="#ffffff" 
          outlineWidth={0.2} 
          outlineColor="#000000" 
          anchorX="center" 
          anchorY="middle"
        >
          {`THREAT SCORE: ${score}/100`}
        </Text>
      )}
    </group>
  );
}