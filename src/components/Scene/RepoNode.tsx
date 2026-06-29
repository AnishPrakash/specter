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
  const score = scanResult?.threatScore ?? 0;

  const color = score > 70 ? '#ef4444' : score > 40 ? '#f59e0b' : '#3b82f6';
  const repoName = scanResult?.repoUrl?.split('/').slice(-2).join('/') ?? 'specter';

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
      {/* Core sphere */}
      <Sphere ref={meshRef} args={[10, 64, 64]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          roughness={0.2}
          metalness={0.9}
        />
      </Sphere>

      {/* Outer wireframe shell */}
      <Sphere args={[15, 16, 16]}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.06}
          wireframe
        />
      </Sphere>

      {/* Second wireframe shell at different radius — adds depth */}
      <Sphere args={[22, 8, 8]}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.03}
          wireframe
        />
      </Sphere>

      {/* Outer atmosphere — a slightly larger, barely-visible sphere */}
      <Sphere args={[18, 32, 32]}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.04}
          roughness={1}
          metalness={0}
        />
      </Sphere>

      {/* Equatorial ring */}
      <Ring ref={ringRef} args={[17, 19, 64]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </Ring>

      {/* Labels */}
      <Text position={[0, -22, 0]} fontSize={4} color="white" anchorX="center" anchorY="middle" font={undefined}>
        {repoName}
      </Text>
      {scanResult && (
        <Text position={[0, -28, 0]} fontSize={3.5} color={color} anchorX="center" anchorY="middle">
          {`threat score: ${score}/100`}
        </Text>
      )}
      {!scanResult && (
        <Text position={[0, -22, 0]} fontSize={3} color="#475569" anchorX="center" anchorY="middle">
          paste a github url to scan
        </Text>
      )}
    </group>
  );
}