// ============================================================================
// Voxel Engine Types
// ============================================================================

/** Unique key for a voxel position: "x,y,z" */
export type VoxelKey = string;

/** A single voxel: just a color hex string */
export interface Voxel {
  color: string;
}

/** The entire voxel world as a sparse map */
export type VoxelMap = Map<VoxelKey, Voxel>;

/** Available sculptor tools */
export type Tool = 'place' | 'delete' | 'paint' | 'eyedropper';

/** A snapshot for undo/redo */
export interface Snapshot {
  voxels: VoxelMap;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function makeKey(x: number, y: number, z: number): VoxelKey {
  return `${x},${y},${z}`;
}

export function parseKey(key: VoxelKey): [number, number, number] {
  const parts = key.split(',').map(Number);
  return [parts[0], parts[1], parts[2]];
}

export function cloneVoxelMap(map: VoxelMap): VoxelMap {
  const clone = new Map<VoxelKey, Voxel>();
  for (const [k, v] of map) {
    clone.set(k, { color: v.color });
  }
  return clone;
}

/** Grid bounds for the workspace */
export const GRID_SIZE = 64;
export const GRID_HALF = GRID_SIZE / 2;

/** Default color palette – 32 curated voxel art colors */
export const DEFAULT_PALETTE: string[] = [
  // Row 1: Grays & Whites
  '#FFFFFF', '#E0E0E0', '#B0B0B0', '#808080',
  '#505050', '#303030', '#181818', '#000000',
  // Row 2: Warm Colors
  '#FF0000', '#FF4400', '#FF8800', '#FFCC00',
  '#FFFF00', '#CCFF00', '#88FF00', '#44FF00',
  // Row 3: Cool Colors
  '#00FF00', '#00FF44', '#00FF88', '#00FFCC',
  '#00FFFF', '#00CCFF', '#0088FF', '#0044FF',
  // Row 4: Purples & Pinks
  '#0000FF', '#4400FF', '#8800FF', '#CC00FF',
  '#FF00FF', '#FF00CC', '#FF0088', '#FF0044',
];
