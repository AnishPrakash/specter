'use client';
import { useMemo } from 'react';
import { Sphere, Line, Text, Billboard } from '@react-three/drei';
import type { ApiEndpoint } from '@/types';

interface Props { endpoints: ApiEndpoint[]; }

export default function ApiSpokes({ endpoints }: Props) {
  const displayed = useMemo(() => endpoints.slice(0, 18), [endpoints]);

  return (
    <group>
      {displayed.map((ep, i) => {
        const angle = (i / Math.max(displayed.length, 1)) * Math.PI * 2;
        const radius = 185;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(angle * 2.5) * 30;

        const isCritical = ep.severity === 'critical';
        const isHigh = ep.severity === 'high';
        const color = isCritical ? '#ef4444' : isHigh ? '#f59e0b' : ep.hasAuth ? '#22c55e' : '#f59e0b';

        return (
          <group key={i}>
            <Line
              points={[[0, 0, 0], [x, y, z]]}
              color={color}
              lineWidth={0.5}
              transparent
              opacity={0.25}
              dashed
              dashScale={3}
            />
            <group position={[x, y, z]}>
              <Sphere args={[3.5, 12, 12]}>
                <meshStandardMaterial
                  color={color}
                  emissive={color}
                  emissiveIntensity={isCritical ? 0.8 : 0.4}
                  roughness={0.4}
                  metalness={0.6}
                />
              </Sphere>
              <Billboard follow>
                <Text position={[0, 7, 0]} fontSize={2} color={color} anchorX="center" maxWidth={30}>
                  {`${ep.method} ${ep.path.substring(0, 14)}`}
                </Text>
              </Billboard>
            </group>
          </group>
        );
      })}
    </group>
  );
}