'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useScanStore } from '@/store/scanStore';
import RepoNode from './RepoNode';
import DepGraph from './DepGraph';
import CommitTimeline from './CommitTimeline';
import DockerLayers from './DockerLayers';
import ApiSpokes from './ApiSpokes';
import AttackPaths from './AttackPaths';
import GroundGrid from './GroundGrid';

// ── CAMERA RIG: Keeps the 3D scene from being hidden by the UI ──
function CameraRig({ isReady }: { isReady: boolean }) {
  const { camera, size } = useThree();
  
  useEffect(() => {
    if (!isReady) {
      camera.clearViewOffset();
      return;
    }
    
    const isMobile = size.width < 768;
    if (isMobile) {
      // Mobile: Bottom sheet takes up ~65% of the screen. Shift the camera's center UP.
      camera.setViewOffset(size.width, size.height, 0, size.height * 0.22, size.width, size.height);
    } else {
      // Desktop: Sidebar takes up 380px on the right. Shift the camera's center LEFT.
      camera.setViewOffset(size.width, size.height, 190, 0, size.width, size.height);
    }
  }, [size.width, size.height, isReady, camera]);

  return null;
}

// ── DYNAMIC THREAT LIGHT: Throbs aggressively on critical findings ──
function DynamicThreatLight({ score }: { score: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame(({ clock }) => {
    if (lightRef.current && score > 70) {
      // Pulsing math: sine wave based on elapsed time
      const pulse = Math.sin(clock.elapsedTime * 5) * 0.5 + 0.5; // Outputs 0 to 1
      lightRef.current.intensity = 1.0 + pulse * 2.0; // Throbs between 1.0 and 3.0
    }
  });

  if (score <= 40) return null; // No threat light for safe repos

  const color = score > 70 ? '#ef4444' : '#f97316'; // Critical Red or High Orange
  
  return (
    <pointLight
      ref={lightRef}
      position={[90, 30, 90]}
      intensity={2.0}
      color={color}
      distance={250}
    />
  );
}

export default function SpectreScene() {
  const { scanResult } = useScanStore();
  const isReady = !!scanResult;
  const score = scanResult?.threatScore ?? 0;

  return (
    <Canvas
      camera={{ position: [0, 55, 270], fov: 52 }}
      style={{ background: 'var(--void)', width: '100%', height: '100vh' }}
      dpr={[1, 2]}
    >
      <CameraRig isReady={isReady} />

      {/* Lighting — DELIBERATE, cold industrial mood */}
      <ambientLight intensity={0.04} color="#0a1428" />

      {/* Core blue light — always on, anchors the scene */}
      <pointLight
        position={[0, 0, 0]}
        intensity={2.8}
        color="#1e3a5f"
        distance={280}
      />

      {/* Fill light — subtle purple from above */}
      <pointLight position={[0, 180, 60]} intensity={0.6} color="#0d1a40" />
      
      {/* Rim light — slight blue from behind */}
      <pointLight position={[0, -80, -200]} intensity={0.3} color="#2563eb" />

      {/* Throbbing alarm light based on score */}
      <DynamicThreatLight score={score} />

      <Stars radius={400} depth={60} count={4000} factor={4} saturation={0} fade speed={0.5} />

      <GroundGrid />

      <Suspense fallback={null}>
        <RepoNode />
        {scanResult?.depchain && (
          <DepGraph nodes={scanResult.depchain.nodes} edges={scanResult.depchain.edges} />
        )}
        {scanResult?.ghostcommit && (
          <CommitTimeline findings={scanResult.ghostcommit.findings} />
        )}
        {scanResult?.layerscan && (
          <DockerLayers findings={scanResult.layerscan.findings} baseImage={scanResult.layerscan.baseImage} />
        )}
        {scanResult?.apibleed && (
          <ApiSpokes endpoints={scanResult.apibleed.endpoints} />
        )}
        {scanResult?.depchain && (
          <AttackPaths nodes={scanResult.depchain.nodes} />
        )}
      </Suspense>

      <EffectComposer>
        <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.2} mipmapBlur />
      </EffectComposer>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        autoRotate={!isReady}
        autoRotateSpeed={0.5}
        maxDistance={700}
        minDistance={20}
        dampingFactor={0.05}
        enableDamping
      />
    </Canvas>
  );
}