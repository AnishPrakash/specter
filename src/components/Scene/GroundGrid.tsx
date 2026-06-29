// src/components/Scene/GroundGrid.tsx
'use client';
import { Grid } from '@react-three/drei';

export default function GroundGrid() {
  return (
    <Grid
      position={[0, -200, 0]}
      args={[600, 600]}
      cellSize={25}
      cellThickness={0.3}
      cellColor="#132035"
      sectionSize={100}
      sectionThickness={0.5}
      sectionColor="#1e3355"
      fadeDistance={500}
      fadeStrength={2}
      infiniteGrid
    />
  );
}