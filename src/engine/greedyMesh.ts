// ============================================================================
// Greedy Meshing Algorithm for Voxel Data
// ============================================================================
//
// Takes a sparse 3D voxel map and combines adjacent coplanar faces of the
// same color into larger rectangular quads. This reduces the number of
// WebGL draw calls from potentially hundreds of thousands down to a fraction.
//
// Algorithm overview (per slice along each axis):
//   1. For each layer perpendicular to the current axis, build a 2D mask
//      of visible faces (faces not occluded by a neighboring voxel).
//   2. Greedily sweep the mask: for each unprocessed cell, expand rightward
//      as far as possible (same color), then expand downward as far as the
//      full width allows. Mark the covered region and emit one quad.
//   3. Repeat for all 6 face directions (±X, ±Y, ±Z).
//
// The output is an array of MeshedQuad objects, each describing a single
// rectangular face with position, size, orientation, and color.
// ============================================================================

import { type VoxelMap, type VoxelKey, makeKey, parseKey } from './types';

/** A single merged rectangular face */
export interface MeshedQuad {
  /** Starting corner of the quad in world coordinates */
  x: number;
  y: number;
  z: number;
  /** Width of the quad (along the first tangent axis) */
  w: number;
  /** Height of the quad (along the second tangent axis) */
  h: number;
  /** Face normal direction: 0=+X, 1=-X, 2=+Y, 3=-Y, 4=+Z, 5=-Z */
  face: number;
  /** Hex color string */
  color: string;
}

/** Direction vectors for the 6 faces */
const FACE_NORMALS: [number, number, number][] = [
  [1, 0, 0],   // 0: +X (right)
  [-1, 0, 0],  // 1: -X (left)
  [0, 1, 0],   // 2: +Y (top)
  [0, -1, 0],  // 3: -Y (bottom)
  [0, 0, 1],   // 4: +Z (front)
  [0, 0, -1],  // 5: -Z (back)
];

/**
 * Axis configurations for each face direction.
 * [sliceAxis, uAxis, vAxis] — the slice axis is the normal direction,
 * and u/v are the two tangent axes we sweep across.
 */
const AXIS_MAP: [number, number, number][] = [
  [0, 2, 1], // +X: slice along X, sweep Z (u) and Y (v)
  [0, 2, 1], // -X: same axes
  [1, 0, 2], // +Y: slice along Y, sweep X (u) and Z (v)
  [1, 0, 2], // -Y: same axes
  [2, 0, 1], // +Z: slice along Z, sweep X (u) and Y (v)
  [2, 0, 1], // -Z: same axes
];

/**
 * Greedy meshing entry point.
 *
 * @param voxels  The sparse voxel map (key = "x,y,z")
 * @param gridSize  Maximum grid dimension (e.g. 64)
 * @returns Array of optimally merged quads
 */
export function greedyMesh(voxels: VoxelMap, gridSize: number): MeshedQuad[] {
  if (voxels.size === 0) return [];

  // Pre-compute bounding box to avoid iterating empty space
  let minX = gridSize, minY = gridSize, minZ = gridSize;
  let maxX = 0, maxY = 0, maxZ = 0;

  for (const key of voxels.keys()) {
    const [x, y, z] = parseKey(key);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  const bounds = [
    [minX, maxX],
    [minY, maxY],
    [minZ, maxZ],
  ];

  const quads: MeshedQuad[] = [];

  // Process each of the 6 face directions
  for (let faceIdx = 0; faceIdx < 6; faceIdx++) {
    const [sliceAxis, uAxis, vAxis] = AXIS_MAP[faceIdx];
    const normal = FACE_NORMALS[faceIdx];
    const isPositive = normal[sliceAxis] > 0;

    const sliceMin = bounds[sliceAxis][0];
    const sliceMax = bounds[sliceAxis][1];
    const uMin = bounds[uAxis][0];
    const uMax = bounds[uAxis][1];
    const vMin = bounds[vAxis][0];
    const vMax = bounds[vAxis][1];

    const uSize = uMax - uMin + 1;
    const vSize = vMax - vMin + 1;

    // For each slice along the normal axis
    for (let slice = sliceMin; slice <= sliceMax; slice++) {
      // Build a 2D mask of visible face colors (null = no face)
      const mask: (string | null)[] = new Array(uSize * vSize).fill(null);

      for (let v = vMin; v <= vMax; v++) {
        for (let u = uMin; u <= uMax; u++) {
          // Reconstruct 3D coordinates from axis mapping
          const pos: [number, number, number] = [0, 0, 0];
          pos[sliceAxis] = slice;
          pos[uAxis] = u;
          pos[vAxis] = v;

          const key = makeKey(pos[0], pos[1], pos[2]);
          const voxel = voxels.get(key);

          if (!voxel) continue;

          // Check if the face is visible (no neighbor in the normal direction)
          const neighborPos: [number, number, number] = [
            pos[0] + normal[0],
            pos[1] + normal[1],
            pos[2] + normal[2],
          ];
          const neighborKey = makeKey(neighborPos[0], neighborPos[1], neighborPos[2]);

          if (!voxels.has(neighborKey)) {
            const mi = (u - uMin) + (v - vMin) * uSize;
            mask[mi] = voxel.color;
          }
        }
      }

      // Greedy sweep: merge adjacent same-color cells into rectangles
      const visited = new Uint8Array(uSize * vSize);

      for (let v = 0; v < vSize; v++) {
        for (let u = 0; u < uSize; u++) {
          const idx = u + v * uSize;
          if (visited[idx] || mask[idx] === null) continue;

          const color = mask[idx]!;

          // Expand width (along u axis)
          let w = 1;
          while (u + w < uSize) {
            const ni = (u + w) + v * uSize;
            if (visited[ni] || mask[ni] !== color) break;
            w++;
          }

          // Expand height (along v axis), checking full width
          let h = 1;
          outer: while (v + h < vSize) {
            for (let du = 0; du < w; du++) {
              const ni = (u + du) + (v + h) * uSize;
              if (visited[ni] || mask[ni] !== color) break outer;
            }
            h++;
          }

          // Mark all cells in the rectangle as visited
          for (let dv = 0; dv < h; dv++) {
            for (let du = 0; du < w; du++) {
              visited[(u + du) + (v + dv) * uSize] = 1;
            }
          }

          // Emit the quad – convert back to world coordinates
          const quadPos: [number, number, number] = [0, 0, 0];
          quadPos[sliceAxis] = slice;
          quadPos[uAxis] = u + uMin;
          quadPos[vAxis] = v + vMin;

          // For positive-facing faces, offset the quad by 1 along the normal
          if (isPositive) {
            quadPos[sliceAxis] += 1;
          }

          quads.push({
            x: quadPos[0],
            y: quadPos[1],
            z: quadPos[2],
            w,
            h,
            face: faceIdx,
            color,
          });
        }
      }
    }
  }

  return quads;
}

// ============================================================================
// Convert greedy-meshed quads to Three.js BufferGeometry data
// ============================================================================

export interface MeshBuffers {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

/** Parse a hex color string to RGB floats [0..1] */
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

/**
 * Build raw geometry buffers from an array of merged quads.
 * Each quad becomes 4 vertices + 2 triangles (6 indices).
 */
export function quadsToBuffers(quads: MeshedQuad[]): MeshBuffers {
  const vertCount = quads.length * 4;
  const idxCount = quads.length * 6;

  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  const indices = new Uint32Array(idxCount);

  for (let qi = 0; qi < quads.length; qi++) {
    const q = quads[qi];
    const [sliceAxis, uAxis, vAxis] = AXIS_MAP[q.face];
    const normal = FACE_NORMALS[q.face];
    const [r, g, b] = hexToRgb(q.color);

    const baseVert = qi * 4;
    const baseIdx = qi * 6;

    // 4 corner vertices of the quad
    for (let corner = 0; corner < 4; corner++) {
      const du = (corner & 1) ? q.w : 0;
      const dv = (corner & 2) ? q.h : 0;

      const pos: [number, number, number] = [0, 0, 0];
      pos[sliceAxis] = q.x + (sliceAxis === 0 ? 0 : (sliceAxis === 1 ? 0 : 0));
      // Actually reconstruct from the quad's stored position
      pos[0] = q.x;
      pos[1] = q.y;
      pos[2] = q.z;

      // The quad was stored with x,y,z as the corner in world space.
      // We need to offset along u and v axes.
      pos[uAxis] += du;
      pos[vAxis] += dv;

      const vi = (baseVert + corner) * 3;
      positions[vi] = pos[0];
      positions[vi + 1] = pos[1];
      positions[vi + 2] = pos[2];

      normals[vi] = normal[0];
      normals[vi + 1] = normal[1];
      normals[vi + 2] = normal[2];

      colors[vi] = r;
      colors[vi + 1] = g;
      colors[vi + 2] = b;
    }

    // Two triangles (CCW winding for front-face, adjusted per normal direction)
    const isPositive = normal[sliceAxis] > 0;
    if (isPositive) {
      indices[baseIdx + 0] = baseVert + 0;
      indices[baseIdx + 1] = baseVert + 1;
      indices[baseIdx + 2] = baseVert + 3;
      indices[baseIdx + 3] = baseVert + 0;
      indices[baseIdx + 4] = baseVert + 3;
      indices[baseIdx + 5] = baseVert + 2;
    } else {
      indices[baseIdx + 0] = baseVert + 0;
      indices[baseIdx + 1] = baseVert + 3;
      indices[baseIdx + 2] = baseVert + 1;
      indices[baseIdx + 3] = baseVert + 0;
      indices[baseIdx + 4] = baseVert + 2;
      indices[baseIdx + 5] = baseVert + 3;
    }
  }

  return { positions, normals, colors, indices };
}
