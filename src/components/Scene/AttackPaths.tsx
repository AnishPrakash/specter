'use client';
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DepNode } from '@/types';

interface Props { nodes: DepNode[]; }

export default function AttackPaths({ nodes }: Props) {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);

  const vulnNodes = useMemo(
    () => nodes.filter((n) => !n.isRoot && (n.cves?.length ?? 0) > 0),
    [nodes]
  );

  const nodePositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    const directNodes = nodes.filter((n) => n.isDirect && !n.isRoot);
    const transitiveNodes = nodes.filter((n) => !n.isDirect && !n.isRoot);
    nodes.forEach((node) => {
      if (node.isRoot) { map.set(node.id, new THREE.Vector3(0, 0, 0)); return; }
    });
    directNodes.forEach((node, i) => {
      const angle = (i / Math.max(directNodes.length, 1)) * Math.PI * 2;
      const r = 65;
      map.set(node.id, new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
    });
    transitiveNodes.forEach((node, i) => {
      const angle = (i / Math.max(transitiveNodes.length, 1)) * Math.PI * 2 + 0.3;
      const r = 120;
      map.set(node.id, new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
    });
    return map;
  }, [nodes]);

  const PARTICLES_PER_NODE = 25;

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const count = Math.max(vulnNodes.length, 1) * PARTICLES_PER_NODE;
    const pos = new Float32Array(count * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return geom;
  }, [vulnNodes.length]);

  useFrame(() => {
    timeRef.current += 0.018;
    if (!pointsRef.current || vulnNodes.length === 0) return;
    const attr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const root = new THREE.Vector3(0, 0, 0);

    vulnNodes.forEach((node, ni) => {
      const nodePos = nodePositions.get(node.id);
      if (!nodePos) return;
      for (let p = 0; p < PARTICLES_PER_NODE; p++) {
        const t = ((timeRef.current * 0.6 + ni * 0.4 + p * (1 / PARTICLES_PER_NODE)) % 1);
        const idx = (ni * PARTICLES_PER_NODE + p) * 3;
        arr[idx]     = nodePos.x + (root.x - nodePos.x) * t;
        arr[idx + 1] = nodePos.y + (root.y - nodePos.y) * t + Math.sin(t * Math.PI) * 8;
        arr[idx + 2] = nodePos.z + (root.z - nodePos.z) * t;
      }
    });
    attr.needsUpdate = true;
  });

  if (vulnNodes.length === 0) return null;

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#ef4444"
        size={2}
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
}