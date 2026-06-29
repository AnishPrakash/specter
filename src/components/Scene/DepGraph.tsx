'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Line, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { DepNode, DepEdge } from '@/types';
import { useScanStore } from '@/store/scanStore';

interface Props { nodes: DepNode[]; edges: DepEdge[]; }

export default function DepGraph({ nodes, edges }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const { setSelectedNode } = useScanStore();

  const positions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    const directNodes = nodes.filter((n) => n.isDirect && !n.isRoot);
    const transitiveNodes = nodes.filter((n) => !n.isDirect && !n.isRoot);

    nodes.forEach((node) => {
      if (node.isRoot) { map.set(node.id, [0, 0, 0]); return; }
    });

    directNodes.forEach((node, i) => {
      const angle = (i / Math.max(directNodes.length, 1)) * Math.PI * 2;
      const r = 65 + (i % 3) * 12;
      map.set(node.id, [
        Math.cos(angle) * r,
        (Math.random() - 0.5) * 35,
        Math.sin(angle) * r,
      ]);
    });

    transitiveNodes.forEach((node, i) => {
      const angle = (i / Math.max(transitiveNodes.length, 1)) * Math.PI * 2 + 0.3;
      const r = 115 + (i % 4) * 15;
      map.set(node.id, [
        Math.cos(angle) * r,
        (Math.random() - 0.5) * 50,
        Math.sin(angle) * r,
      ]);
    });

    return map;
  }, [nodes]);

  useFrame(() => {
    if (groupRef.current && !useScanStore.getState().selectedNode) {
      groupRef.current.rotation.y += 0.0008;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Edges */}
      {edges.map((edge, i) => {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);
        if (!from || !to) return null;
        const toNode = nodes.find((n) => n.id === edge.to);
        const isAttack = (toNode?.cves?.length ?? 0) > 0;
        return (
          <Line
            key={`e-${i}`}
            points={[from, to]}
            color={isAttack ? '#ef4444' : '#1e3a5f'}
            lineWidth={isAttack ? 1.8 : 0.5}
            transparent
            opacity={isAttack ? 0.8 : 0.2}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        if (node.isRoot) return null;
        const pos = positions.get(node.id);
        if (!pos) return null;
        const isVuln = (node.cves?.length ?? 0) > 0;
        const isCritical = node.cves?.some((c) => c.severity === 'critical');
        const color = isCritical ? '#ef4444' : isVuln ? '#f59e0b' : node.isDirect ? '#60a5fa' : '#1d4ed8';
        const size = node.isDirect ? 3.5 : 2;

        return (
          <group
            key={node.id}
            position={pos}
            onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}
          >
            <Sphere args={[size, 20, 20]}>
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isVuln ? 0.9 : 0.3}
                roughness={0.3}
                metalness={0.7}
              />
            </Sphere>
            {/* Pulsing halo for vulnerable nodes */}
            {isVuln && (
              <Sphere args={[size + 3, 8, 8]}>
                <meshStandardMaterial color={color} transparent opacity={0.08} wireframe />
              </Sphere>
            )}
            {node.isDirect && (
              <Billboard follow lockX={false} lockY={false} lockZ={false}>
                <Text
                  position={[0, size + 3, 0]}
                  fontSize={2.5}
                  color={isVuln ? '#fca5a5' : '#93c5fd'}
                  anchorX="center"
                  maxWidth={40}
                >
                  {node.name}
                </Text>
              </Billboard>
            )}
          </group>
        );
      })}
    </group>
  );
}