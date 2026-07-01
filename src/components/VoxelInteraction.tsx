// ============================================================================
// VoxelInteraction – Raycasting, ghost cursor, click-to-place/delete/paint
// ============================================================================
//
// This component handles:
// 1. Custom raycasting against the greedy-meshed voxel geometry + ground plane
// 2. Determining which face of which voxel the cursor is over
// 3. Showing a transparent "ghost" cube at the placement position
// 4. Handling click events for place/delete/paint/eyedropper tools
//
// Performance approach: Instead of creating one invisible mesh per voxel
// (which would be O(n) allocation), we raycast against the single merged
// greedy mesh geometry and the ground plane, then back-calculate voxel
// positions from the hit point + normal.
// ============================================================================

import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useVoxelStore } from '../engine/store';
import { makeKey } from '../engine/types';

/** Given a world hit point and face normal, determine the voxel that was hit
 *  and the adjacent empty cell where a new voxel would be placed. */
function resolveVoxelHit(
  point: THREE.Vector3,
  normal: THREE.Vector3,
  voxels: Map<string, any>,
  gridSize: number
): { voxelPos: [number, number, number] | null; placePos: [number, number, number] | null } {
  // Step slightly back into the voxel from the hit surface
  const inside = point
    .clone()
    .addScaledVector(normal, -0.01);

  const vx = Math.floor(inside.x);
  const vy = Math.floor(inside.y);
  const vz = Math.floor(inside.z);

  // Bounds check
  if (vx < 0 || vy < 0 || vz < 0 || vx >= gridSize || vy >= gridSize || vz >= gridSize) {
    return { voxelPos: null, placePos: null };
  }

  const key = makeKey(vx, vy, vz);
  if (!voxels.has(key)) {
    return { voxelPos: null, placePos: null };
  }

  // The placement position is the neighboring cell along the normal
  const nx = Math.round(normal.x);
  const ny = Math.round(normal.y);
  const nz = Math.round(normal.z);
  const px = vx + nx;
  const py = vy + ny;
  const pz = vz + nz;

  const placePos: [number, number, number] | null =
    px >= 0 && py >= 0 && pz >= 0 && px < gridSize && py < gridSize && pz < gridSize
      ? [px, py, pz]
      : null;

  return { voxelPos: [vx, vy, vz], placePos };
}

export default function VoxelInteraction() {
  const { camera, raycaster, pointer, scene } = useThree();
  const ghostRef = useRef<THREE.Mesh>(null);
  const highlightRef = useRef<THREE.Mesh>(null);

  const store = useVoxelStore;
  const voxels = useVoxelStore((s) => s.voxels);
  const version = useVoxelStore((s) => s.version);
  const gridSize = useVoxelStore((s) => s.gridSize);
  const tool = useVoxelStore((s) => s.tool);
  const currentColor = useVoxelStore((s) => s.currentColor);

  // Keep track of current hover state in a ref (avoid re-renders per frame)
  const hoverRef = useRef<{
    placePos: [number, number, number] | null;
    voxelPos: [number, number, number] | null;
  }>({ placePos: null, voxelPos: null });

  // Raycast every frame
  useFrame(() => {
    raycaster.setFromCamera(pointer, camera);

    // Collect raycast targets: all meshes in the scene
    const targets: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        targets.push(obj);
      }
    });

    const intersections = raycaster.intersectObjects(targets, false);

    let foundHit = false;

    for (const hit of intersections) {
      // Skip the ghost cursor and highlight
      if (hit.object === ghostRef.current || hit.object === highlightRef.current) continue;
      // Skip the invisible click catcher
      if (hit.object.userData.isClickCatcher) continue;

      // Check if this is the ground plane
      if (hit.object.name === 'ground-plane' || hit.object.userData.isGround) {
        if (hit.point) {
          const gx = Math.floor(hit.point.x);
          const gz = Math.floor(hit.point.z);
          if (gx >= 0 && gx < gridSize && gz >= 0 && gz < gridSize) {
            hoverRef.current = { placePos: [gx, 0, gz], voxelPos: null };
            foundHit = true;
            break;
          }
        }
        continue;
      }

      // Check if this hit a voxel mesh (the greedy-meshed geometry)
      if (hit.face && hit.point) {
        const normal = hit.face.normal.clone();
        normal.transformDirection(hit.object.matrixWorld).normalize();

        // Round normal to axis-aligned
        const absX = Math.abs(normal.x);
        const absY = Math.abs(normal.y);
        const absZ = Math.abs(normal.z);

        if (absX >= absY && absX >= absZ) {
          normal.set(Math.sign(normal.x), 0, 0);
        } else if (absY >= absX && absY >= absZ) {
          normal.set(0, Math.sign(normal.y), 0);
        } else {
          normal.set(0, 0, Math.sign(normal.z));
        }

        const result = resolveVoxelHit(hit.point, normal, voxels, gridSize);

        if (result.voxelPos || result.placePos) {
          hoverRef.current = result;
          foundHit = true;
          break;
        }
      }
    }

    if (!foundHit) {
      hoverRef.current = { placePos: null, voxelPos: null };
    }

    // Update ghost cursor
    const ghost = ghostRef.current;
    const highlight = highlightRef.current;
    const hover = hoverRef.current;
    const currentTool = store.getState().tool;

    if (ghost) {
      if (currentTool === 'place' && hover.placePos) {
        ghost.visible = true;
        ghost.position.set(
          hover.placePos[0] + 0.5,
          hover.placePos[1] + 0.5,
          hover.placePos[2] + 0.5
        );
      } else {
        ghost.visible = false;
      }
    }

    if (highlight) {
      if (
        (currentTool === 'delete' || currentTool === 'paint' || currentTool === 'eyedropper') &&
        hover.voxelPos
      ) {
        highlight.visible = true;
        highlight.position.set(
          hover.voxelPos[0] + 0.5,
          hover.voxelPos[1] + 0.5,
          hover.voxelPos[2] + 0.5
        );
      } else {
        highlight.visible = false;
      }
    }
  });

  // Handle pointer down for voxel operations
  const handlePointerDown = useCallback(
    (e: any) => {
      // Only handle left click (button 0)
      if (e.button !== undefined && e.button !== 0) return;

      const state = store.getState();
      const hover = hoverRef.current;

      if (state.tool === 'place' && hover.placePos) {
        const [x, y, z] = hover.placePos;
        state.placeVoxel(x, y, z);
      } else if (state.tool === 'delete' && hover.voxelPos) {
        const [x, y, z] = hover.voxelPos;
        state.deleteVoxel(x, y, z);
      } else if (state.tool === 'paint' && hover.voxelPos) {
        const [x, y, z] = hover.voxelPos;
        state.paintVoxel(x, y, z);
      } else if (state.tool === 'eyedropper' && hover.voxelPos) {
        const [x, y, z] = hover.voxelPos;
        const voxel = state.getVoxel(x, y, z);
        if (voxel) {
          state.setColor(voxel.color);
          state.setTool('place');
        }
      }
    },
    [store]
  );

  // Ghost cursor visuals
  const ghostColor = tool === 'delete' ? '#ff0000' : tool === 'paint' ? '#ffff00' : currentColor;

  return (
    <group onPointerDown={handlePointerDown}>
      {/* Large transparent click catcher */}
      <mesh
        position={[gridSize / 2, gridSize / 2, gridSize / 2]}
        userData={{ isClickCatcher: true }}
      >
        <boxGeometry args={[gridSize * 3, gridSize * 3, gridSize * 3]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Ghost cursor – shows where new voxel will be placed */}
      <mesh ref={ghostRef} visible={false} renderOrder={999}>
        <boxGeometry args={[1.01, 1.01, 1.01]} />
        <meshStandardMaterial
          color={ghostColor}
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>

      {/* Highlight cursor – shows which existing voxel is targeted */}
      <mesh ref={highlightRef} visible={false} renderOrder={999}>
        <boxGeometry args={[1.03, 1.03, 1.03]} />
        <meshStandardMaterial
          color={tool === 'delete' ? '#ff2222' : tool === 'eyedropper' ? '#ffffff' : '#ffff44'}
          transparent
          opacity={0.35}
          depthWrite={false}
          wireframe={tool === 'delete'}
        />
      </mesh>
    </group>
  );
}
