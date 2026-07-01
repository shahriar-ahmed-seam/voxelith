// ============================================================================
// VoxelMesh – Renders the voxel world using greedy meshing
// ============================================================================
//
// Instead of rendering one cube mesh per voxel (catastrophic for perf),
// this component runs the greedy meshing algorithm and builds a single
// BufferGeometry with vertex colors. The geometry is rebuilt only when
// the store's version counter changes.
// ============================================================================

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useVoxelStore } from '../engine/store';
import { greedyMesh, quadsToBuffers } from '../engine/greedyMesh';

export default function VoxelMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const voxels = useVoxelStore((s) => s.voxels);
  const version = useVoxelStore((s) => s.version);
  const gridSize = useVoxelStore((s) => s.gridSize);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    if (voxels.size === 0) return geo;

    const quads = greedyMesh(voxels, gridSize);
    if (quads.length === 0) return geo;

    const buffers = quadsToBuffers(quads);

    geo.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(buffers.normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 3));
    geo.setIndex(new THREE.BufferAttribute(buffers.indices, 1));
    geo.computeBoundingSphere();

    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, gridSize]);

  // Dispose old geometry
  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial
        vertexColors
        roughness={0.75}
        metalness={0.0}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}
