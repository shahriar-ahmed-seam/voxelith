// ============================================================================
// Scene3D – The main Three.js canvas scene
// ============================================================================

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Stats } from '@react-three/drei';
import VoxelMesh from './VoxelMesh';
import VoxelWireframes from './VoxelWireframes';
import GroundGrid from './GroundGrid';
import VoxelInteraction from './VoxelInteraction';
import { useVoxelStore } from '../engine/store';

export default function Scene3D() {
  const gridSize = useVoxelStore((s) => s.gridSize);
  const half = gridSize / 2;

  return (
    <Canvas
      camera={{
        position: [half + 20, 25, half + 20],
        fov: 50,
        near: 0.1,
        far: 500,
      }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
      style={{ width: '100%', height: '100%' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#1a1a2e');
        gl.toneMapping = 0; // NoToneMapping
      }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[half + 30, 50, half + 30]}
        intensity={0.8}
        castShadow={false}
      />
      <directionalLight
        position={[-20, 30, -20]}
        intensity={0.3}
      />
      <hemisphereLight
        args={['#b1e1ff', '#2a2a3e', 0.4]}
      />

      {/* Scene elements */}
      <GroundGrid />
      <VoxelMesh />
      <VoxelWireframes />
      <VoxelInteraction />

      {/* Camera controls – right click to orbit, scroll to zoom */}
      <OrbitControls
        target={[half, 0, half]}
        enablePan={true}
        enableDamping={true}
        dampingFactor={0.1}
        minDistance={3}
        maxDistance={150}
        maxPolarAngle={Math.PI / 2 + 0.3}
        mouseButtons={{
          LEFT: undefined as any, // We handle left click ourselves
          MIDDLE: 2, // Pan
          RIGHT: 0, // Orbit
        } as any}
      />

      {/* Performance stats (dev) */}
      <Stats />
    </Canvas>
  );
}
