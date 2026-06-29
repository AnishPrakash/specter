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

export default function SpectreScene() {
  const { scanResult } = useScanStore();

  return (
    <Canvas
      camera={{ position: [0, 40, 280], fov: 60 }}
      style={{ background: '#030712', width: '100%', height: '100vh' }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.05} />
      <pointLight position={[0, 0, 0]} intensity={2.5} color="#3b82f6" distance={250} decay={1} />
      <pointLight position={[100, 100, 100]} intensity={0.4} color="#8b5cf6" />
      <Stars radius={400} depth={60} count={4000} factor={4} saturation={0} fade speed={0.5} />

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