// ============================================================================
// VoxelWireframes – Shows thin outlines around each voxel for clarity
// ============================================================================

import { useMemo } from 'react';
import * as THREE from 'three';
import { useVoxelStore } from '../engine/store';
import { parseKey } from '../engine/types';

export default function VoxelWireframes() {
  const voxels = useVoxelStore((s) => s.voxels);
  const version = useVoxelStore((s) => s.version);

  const geometry = useMemo(() => {
    if (voxels.size === 0) return null;

    // For performance, only show wireframes when < 2000 voxels
    if (voxels.size > 2000) return null;

    const edgeGeo = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(edgeGeo);
    const positions = edges.attributes.position.array as Float32Array;
    const segCount = positions.length / 3; // number of vertices in the edge lines

    const totalVerts = voxels.size * segCount;
    const allPositions = new Float32Array(totalVerts * 3);

    let voxelIdx = 0;
    for (const key of voxels.keys()) {
      const [x, y, z] = parseKey(key);
      const offset = voxelIdx * segCount * 3;
      for (let i = 0; i < segCount; i++) {
        allPositions[offset + i * 3] = positions[i * 3] + x + 0.5;
        allPositions[offset + i * 3 + 1] = positions[i * 3 + 1] + y + 0.5;
        allPositions[offset + i * 3 + 2] = positions[i * 3 + 2] + z + 0.5;
      }
      voxelIdx++;
    }

    const bufGeo = new THREE.BufferGeometry();
    bufGeo.setAttribute('position', new THREE.BufferAttribute(allPositions, 3));

    edgeGeo.dispose();
    edges.dispose();

    return bufGeo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  if (!geometry) return null;

  return (
    <lineSegments geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#000000" opacity={0.15} transparent linewidth={1} />
    </lineSegments>
  );
}
