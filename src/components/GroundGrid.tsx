// ============================================================================
// GroundGrid – The infinite-looking reference grid on the XZ plane
// ============================================================================

import { useMemo } from 'react';
import * as THREE from 'three';
import { useVoxelStore } from '../engine/store';

/** Create a line geometry from two points */
function makeLineGeo(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array([ax, ay, az, bx, by, bz]);
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  return geo;
}

export default function GroundGrid() {
  const showGrid = useVoxelStore((s) => s.showGrid);
  const gridSize = useVoxelStore((s) => s.gridSize);

  const xGeo = useMemo(() => makeLineGeo(0, 0, 0, gridSize, 0, 0), [gridSize]);
  const yGeo = useMemo(() => makeLineGeo(0, 0, 0, 0, gridSize, 0), [gridSize]);
  const zGeo = useMemo(() => makeLineGeo(0, 0, 0, 0, 0, gridSize), [gridSize]);

  if (!showGrid) return null;

  const halfSize = gridSize / 2;

  return (
    <group>
      {/* Main grid */}
      <gridHelper
        args={[gridSize, gridSize, '#555555', '#333333']}
        position={[halfSize, 0, halfSize]}
      />
      {/* Ground plane for raycasting (invisible) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[halfSize, 0, halfSize]}
        visible={false}
        name="ground-plane"
      >
        <planeGeometry args={[gridSize, gridSize]} />
        <meshBasicMaterial side={THREE.DoubleSide} />
      </mesh>
      {/* Axis indicators */}
      <group position={[0, 0.01, 0]}>
        <lineSegments geometry={xGeo}>
          <lineBasicMaterial color="#ff4444" linewidth={2} />
        </lineSegments>
        <lineSegments geometry={zGeo}>
          <lineBasicMaterial color="#4444ff" linewidth={2} />
        </lineSegments>
        <lineSegments geometry={yGeo}>
          <lineBasicMaterial color="#44ff44" linewidth={2} />
        </lineSegments>
      </group>
    </group>
  );
}
