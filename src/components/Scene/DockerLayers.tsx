'use client';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';
import type { DockerFinding } from '@/types';

interface Props { findings: DockerFinding[]; baseImage: string; }

export default function DockerLayers({ findings, baseImage }: Props) {
  const hasDockerfile = baseImage !== 'No Dockerfile found';
  const layerCount = hasDockerfile ? Math.max(4, Math.min(findings.length + 3, 9)) : 3;

  return (
    <group position={[0, -135, 0]}>
      <Text position={[0, layerCount * 7 + 12, 0]} fontSize={2.8} color="#475569" anchorX="center">
        {hasDockerfile ? 'docker layers' : 'no dockerfile'}
      </Text>
      {Array.from({ length: layerCount }).map((_, i) => {
        const finding = findings.find((f) => f.layer === i || (i === 0 && f.layer === 0));
        const isVuln = !!finding;
        const isCritical = finding?.severity === 'critical';
        const width = 140 - i * 10;
        const color = isCritical ? '#7f1d1d' : isVuln ? '#78350f' : '#0f2044';
        const emissive = isCritical ? '#ef4444' : isVuln ? '#f59e0b' : '#3b82f6';

        return (
          <group key={i} position={[0, i * 7, 0]}>
            <Box args={[width, 5, 35]}>
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={isVuln ? 0.5 : 0.08}
                roughness={0.5}
                side={THREE.DoubleSide}
              />
            </Box>
            <Text
              position={[0, 0, 18.5]}
              fontSize={2.2}
              color={isVuln ? '#fca5a5' : '#93c5fd'}
              anchorX="center"
              anchorY="middle"
            >
              {i === 0 ? baseImage.substring(0, 20) : `layer ${i}${isVuln ? ' ⚠' : ''}`}
            </Text>
          </group>
        );
      })}
    </group>
  );
}