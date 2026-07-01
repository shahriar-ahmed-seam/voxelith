// ============================================================================
// Zustand Store – Central Voxel State Management
// ============================================================================

import { create } from 'zustand';
import {
  type VoxelMap,
  type VoxelKey,
  type Voxel,
  type Tool,
  type Snapshot,
  makeKey,
  cloneVoxelMap,
  DEFAULT_PALETTE,
  GRID_SIZE,
} from './types';

const MAX_UNDO = 100;

export interface VoxelStore {
  // Voxel data
  voxels: VoxelMap;
  version: number; // bumped on every mutation to trigger re-renders

  // Tools & options
  tool: Tool;
  currentColor: string;
  palette: string[];
  gridSize: number;
  showGrid: boolean;
  symmetryX: boolean;
  symmetryZ: boolean;

  // Undo/Redo
  undoStack: Snapshot[];
  redoStack: Snapshot[];

  // Actions
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setPaletteColor: (index: number, color: string) => void;
  toggleGrid: () => void;
  toggleSymmetryX: () => void;
  toggleSymmetryZ: () => void;

  // Voxel mutations (push undo snapshot automatically)
  placeVoxel: (x: number, y: number, z: number, color?: string) => void;
  deleteVoxel: (x: number, y: number, z: number) => void;
  paintVoxel: (x: number, y: number, z: number, color?: string) => void;
  fillFloor: (y: number, color?: string) => void;
  clearAll: () => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Bulk helpers
  getVoxel: (x: number, y: number, z: number) => Voxel | undefined;
  getVoxelByKey: (key: VoxelKey) => Voxel | undefined;
  getAllVoxelEntries: () => [VoxelKey, Voxel][];
}

function pushUndo(state: { voxels: VoxelMap; undoStack: Snapshot[]; redoStack: Snapshot[] }) {
  const snapshot: Snapshot = { voxels: cloneVoxelMap(state.voxels) };
  const stack = [...state.undoStack, snapshot];
  if (stack.length > MAX_UNDO) stack.shift();
  return { undoStack: stack, redoStack: [] as Snapshot[] };
}

export const useVoxelStore = create<VoxelStore>((set, get) => ({
  // Initial state
  voxels: new Map(),
  version: 0,
  tool: 'place',
  currentColor: '#4488FF',
  palette: [...DEFAULT_PALETTE],
  gridSize: GRID_SIZE,
  showGrid: true,
  symmetryX: false,
  symmetryZ: false,
  undoStack: [],
  redoStack: [],

  // Tool setters
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ currentColor: color }),
  setPaletteColor: (index, color) =>
    set((s) => {
      const palette = [...s.palette];
      palette[index] = color;
      return { palette };
    }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSymmetryX: () => set((s) => ({ symmetryX: !s.symmetryX })),
  toggleSymmetryZ: () => set((s) => ({ symmetryZ: !s.symmetryZ })),

  // Place a voxel
  placeVoxel: (x, y, z, color) =>
    set((s) => {
      // Bounds check
      if (x < 0 || y < 0 || z < 0 || x >= s.gridSize || y >= s.gridSize || z >= s.gridSize) return s;
      const undoData = pushUndo(s);
      const voxels = cloneVoxelMap(s.voxels);
      const c = color ?? s.currentColor;

      voxels.set(makeKey(x, y, z), { color: c });

      // Mirror symmetry
      if (s.symmetryX) {
        const mx = s.gridSize - 1 - x;
        if (mx >= 0 && mx < s.gridSize) voxels.set(makeKey(mx, y, z), { color: c });
      }
      if (s.symmetryZ) {
        const mz = s.gridSize - 1 - z;
        if (mz >= 0 && mz < s.gridSize) voxels.set(makeKey(x, y, mz), { color: c });
      }
      if (s.symmetryX && s.symmetryZ) {
        const mx = s.gridSize - 1 - x;
        const mz = s.gridSize - 1 - z;
        voxels.set(makeKey(mx, y, mz), { color: c });
      }

      return { ...undoData, voxels, version: s.version + 1 };
    }),

  // Delete a voxel
  deleteVoxel: (x, y, z) =>
    set((s) => {
      const key = makeKey(x, y, z);
      if (!s.voxels.has(key)) return s;
      const undoData = pushUndo(s);
      const voxels = cloneVoxelMap(s.voxels);
      voxels.delete(key);

      if (s.symmetryX) {
        voxels.delete(makeKey(s.gridSize - 1 - x, y, z));
      }
      if (s.symmetryZ) {
        voxels.delete(makeKey(x, y, s.gridSize - 1 - z));
      }
      if (s.symmetryX && s.symmetryZ) {
        voxels.delete(makeKey(s.gridSize - 1 - x, y, s.gridSize - 1 - z));
      }

      return { ...undoData, voxels, version: s.version + 1 };
    }),

  // Paint an existing voxel
  paintVoxel: (x, y, z, color) =>
    set((s) => {
      const key = makeKey(x, y, z);
      if (!s.voxels.has(key)) return s;
      const undoData = pushUndo(s);
      const voxels = cloneVoxelMap(s.voxels);
      const c = color ?? s.currentColor;
      voxels.set(key, { color: c });

      if (s.symmetryX) {
        const mk = makeKey(s.gridSize - 1 - x, y, z);
        if (voxels.has(mk)) voxels.set(mk, { color: c });
      }
      if (s.symmetryZ) {
        const mk = makeKey(x, y, s.gridSize - 1 - z);
        if (voxels.has(mk)) voxels.set(mk, { color: c });
      }

      return { ...undoData, voxels, version: s.version + 1 };
    }),

  // Fill an entire Y-layer
  fillFloor: (y, color) =>
    set((s) => {
      const undoData = pushUndo(s);
      const voxels = cloneVoxelMap(s.voxels);
      const c = color ?? s.currentColor;
      for (let x = 0; x < s.gridSize; x++) {
        for (let z = 0; z < s.gridSize; z++) {
          voxels.set(makeKey(x, y, z), { color: c });
        }
      }
      return { ...undoData, voxels, version: s.version + 1 };
    }),

  // Clear everything
  clearAll: () =>
    set((s) => {
      const undoData = pushUndo(s);
      return { ...undoData, voxels: new Map(), version: s.version + 1 };
    }),

  // Undo
  undo: () =>
    set((s) => {
      if (s.undoStack.length === 0) return s;
      const stack = [...s.undoStack];
      const snapshot = stack.pop()!;
      return {
        undoStack: stack,
        redoStack: [...s.redoStack, { voxels: cloneVoxelMap(s.voxels) }],
        voxels: snapshot.voxels,
        version: s.version + 1,
      };
    }),

  // Redo
  redo: () =>
    set((s) => {
      if (s.redoStack.length === 0) return s;
      const stack = [...s.redoStack];
      const snapshot = stack.pop()!;
      return {
        redoStack: stack,
        undoStack: [...s.undoStack, { voxels: cloneVoxelMap(s.voxels) }],
        voxels: snapshot.voxels,
        version: s.version + 1,
      };
    }),

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  getVoxel: (x, y, z) => get().voxels.get(makeKey(x, y, z)),
  getVoxelByKey: (key) => get().voxels.get(key),
  getAllVoxelEntries: () => [...get().voxels.entries()],
}));
