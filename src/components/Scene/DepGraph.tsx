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
      map.set(node.id, [Math.cos(angle) * r, (Math.random() - 0.5) * 35, Math.sin(angle) * r]);
    });

    transitiveNodes.forEach((node, i) => {
      const angle = (i / Math.max(transitiveNodes.length, 1)) * Math.PI * 2 + 0.3;
      const r = 115 + (i % 4) * 15;
      map.set(node.id, [Math.cos(angle) * r, (Math.random() - 0.5) * 50, Math.sin(angle) * r]);
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
            color={isAttack ? '#ef4444' : '#3b82f6'}
            lineWidth={isAttack ? 3 : 1.5} // Thickened lines
            transparent
            opacity={isAttack ? 0.9 : 0.4}
          />
        );
      })}

      {nodes.map((node) => {
        if (node.isRoot) return null;
        const pos = positions.get(node.id);
        if (!pos) return null;
        const isVuln = (node.cves?.length ?? 0) > 0;
        const isCritical = node.cves?.some((c) => c.severity === 'critical');
        const color = isCritical ? '#ef4444' : isVuln ? '#f59e0b' : node.isDirect ? '#60a5fa' : '#1d4ed8';
        const size = node.isDirect ? 4 : 2.5;

        return (
          <group key={node.id} position={pos} onClick={(e) => { e.stopPropagation(); setSelectedNode(node.id); }}>
            {/* Smoothed Spheres (32 segments) */}
            <Sphere args={[size, 32, 32]}>
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isVuln ? 0.9 : 0.3} roughness={0.3} />
            </Sphere>
            
            {isVuln && (
              <Sphere args={[size + 3.5, 16, 16]}>
                <meshStandardMaterial color={color} transparent opacity={0.12} wireframe />
              </Sphere>
            )}
            
            {node.isDirect && (
              <Billboard follow lockX={false} lockY={false} lockZ={false}>
                {/* Readable Text with Outlines */}
                <Text
                  position={[0, size + 4.5, 0]}
                  fontSize={4}
                  color="#ffffff"
                  outlineWidth={0.25}
                  outlineColor="#000000"
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