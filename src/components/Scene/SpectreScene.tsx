'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useScanStore } from '@/store/scanStore';
import RepoNode from './RepoNode';
import DepGraph from './DepGraph';
import CommitTimeline from './CommitTimeline';
import DockerLayers from './DockerLayers';
import ApiSpokes from './ApiSpokes';
import AttackPaths from './AttackPaths';
import GroundGrid from './GroundGrid';

// ── CINEMATIC CAMERA ANIMATOR ──
function SceneAnimator({ isReady, controlsRef }: { isReady: boolean; controlsRef: React.RefObject<OrbitControlsImpl | null> }) {
  const vecPos = new THREE.Vector3();
  const vecLook = new THREE.Vector3();

  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    // CRITICAL FIX: Prevent the camera from "snapping" if React drops 
    // frames while mounting the heavy 3D data. Max delta = 50ms.
    const safeDelta = Math.min(delta, 0.05);

    if (!isReady) {
      // Landing page: Camera is lower, looking down. 
      vecPos.set(0, 10, 160);
      vecLook.set(0, -45, 0);
    } else {
      // Scan page: Fly up and out into the tactical isometric view
      vecPos.set(0, 60, 270);
      vecLook.set(0, -30, 0);
    }

    // Smoothly interpolate position and target using the clamped delta
    state.camera.position.lerp(vecPos, safeDelta * 4);
    controlsRef.current.target.lerp(vecLook, safeDelta * 4);
    controlsRef.current.update();
  });

  return null;
}

// ── DYNAMIC THREAT LIGHT ──
function DynamicThreatLight({ score }: { score: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  
  useFrame(({ clock }) => {
    if (lightRef.current && score > 70) {
      const pulse = Math.sin(clock.elapsedTime * 5) * 0.5 + 0.5;
      lightRef.current.intensity = 1.0 + pulse * 2.0;
    }
  });

  if (score <= 40) return null;
  const color = score > 70 ? '#ef4444' : '#f97316';
  
  return <pointLight ref={lightRef} position={[90, 30, 90]} intensity={2.0} color={color} distance={250} />;
}

export default function SpectreScene() {
  const { scanResult } = useScanStore();
  const isReady = !!scanResult;
  const score = scanResult?.threatScore ?? 0;
  const controlsRef = useRef<OrbitControlsImpl>(null);

  return (
    <Canvas
      camera={{ position: [0, 10, 160], fov: 52 }}
      style={{ background: 'transparent', width: '100%', height: '100vh' }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <SceneAnimator isReady={isReady} controlsRef={controlsRef} />

      <ambientLight intensity={0.04} color="#0a1428" />
      <pointLight position={[0, 0, 0]} intensity={2.8} color="#1e3a5f" distance={280} />
      <pointLight position={[0, 180, 60]} intensity={0.6} color="#0d1a40" />
      <pointLight position={[0, -80, -200]} intensity={0.3} color="#2563eb" />
      <DynamicThreatLight score={score} />

      <Stars radius={400} depth={60} count={3000} factor={6} saturation={0} fade speed={3} />
      {isReady && <GroundGrid />}

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

      <EffectComposer multisampling={4}>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={1.0} />
      </EffectComposer>

      <OrbitControls
        ref={controlsRef}
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