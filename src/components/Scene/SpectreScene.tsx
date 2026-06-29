'use client';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Suspense } from 'react';
import { useScanStore } from '@/store/scanStore';
import RepoNode from './RepoNode';
import DepGraph from './DepGraph';
import CommitTimeline from './CommitTimeline';
import DockerLayers from './DockerLayers';
import ApiSpokes from './ApiSpokes';
import AttackPaths from './AttackPaths';
import GroundGrid from './GroundGrid';

export default function SpectreScene() {
  const { scanResult } = useScanStore();

  const hasCritical = (scanResult?.threatScore ?? 0) > 70;
  const hasFindings = (scanResult?.threatScore ?? 0) > 0;

  return (
    <Canvas
      camera={{ position: [0, 55, 270], fov: 52 }}
      style={{ background: '#030712', width: '100%', height: '100vh' }}
      dpr={[1, 2]}
    >
      {/* Lighting — DELIBERATE, not defaults */}
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

      {/* Threat light — red, only when critical findings exist */}
      {hasCritical && (
        <pointLight
          position={[90, 30, 90]}
          intensity={2.0}
          color="#ef4444"
          distance={220}
        />
      )}

      {/* Rim light — slight blue from behind */}
      <pointLight position={[0, -80, -200]} intensity={0.3} color="#2563eb" />

      <Stars radius={400} depth={60} count={4000} factor={4} saturation={0} fade speed={0.5} />

      {/* Ground Grid added here */}
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
        autoRotate={!scanResult}
        autoRotateSpeed={0.5}
        maxDistance={700}
        minDistance={20}
        dampingFactor={0.05}
        enableDamping
      />
    </Canvas>
  );
}