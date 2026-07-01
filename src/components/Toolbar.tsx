// ============================================================================
// Toolbar – Tool selection, undo/redo, grid toggle, export
// ============================================================================

import React, { useCallback, useEffect } from 'react';
import { useVoxelStore } from '../engine/store';
import { exportOBJ, exportGLTF } from '../engine/exporter';
import type { Tool } from '../engine/types';

const TOOLS: { id: Tool; label: string; icon: string; shortcut: string }[] = [
  { id: 'place', label: 'Place', icon: '🧱', shortcut: 'V' },
  { id: 'delete', label: 'Erase', icon: '🗑️', shortcut: 'E' },
  { id: 'paint', label: 'Paint', icon: '🎨', shortcut: 'B' },
  { id: 'eyedropper', label: 'Pick', icon: '💉', shortcut: 'I' },
];

export default function Toolbar() {
  const tool = useVoxelStore((s) => s.tool);
  const setTool = useVoxelStore((s) => s.setTool);
  const undo = useVoxelStore((s) => s.undo);
  const redo = useVoxelStore((s) => s.redo);
  const undoStack = useVoxelStore((s) => s.undoStack);
  const redoStack = useVoxelStore((s) => s.redoStack);
  const showGrid = useVoxelStore((s) => s.showGrid);
  const toggleGrid = useVoxelStore((s) => s.toggleGrid);
  const symmetryX = useVoxelStore((s) => s.symmetryX);
  const symmetryZ = useVoxelStore((s) => s.symmetryZ);
  const toggleSymmetryX = useVoxelStore((s) => s.toggleSymmetryX);
  const toggleSymmetryZ = useVoxelStore((s) => s.toggleSymmetryZ);
  const clearAll = useVoxelStore((s) => s.clearAll);
  const voxels = useVoxelStore((s) => s.voxels);
  const fillFloor = useVoxelStore((s) => s.fillFloor);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const key = e.key.toLowerCase();

      if (e.ctrlKey && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (key === 'v' && !e.ctrlKey) {
        setTool('place');
      } else if (key === 'e') {
        setTool('delete');
      } else if (key === 'b') {
        setTool('paint');
      } else if (key === 'i') {
        setTool('eyedropper');
      } else if (key === 'g') {
        toggleGrid();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, setTool, toggleGrid]);

  const handleExportOBJ = useCallback(() => {
    exportOBJ(useVoxelStore.getState().voxels);
  }, []);

  const handleExportGLTF = useCallback(() => {
    exportGLTF(useVoxelStore.getState().voxels);
  }, []);

  return (
    <div className="toolbar">
      {/* Brand / home */}
      <a className="toolbar-brand" href="/" title="Back to home">
        <span className="toolbar-brand-mark">◆</span>
        <span className="toolbar-brand-name">Voxelith</span>
      </a>

      {/* Tool group */}
      <div className="toolbar-group">
        <div className="toolbar-label">Tools</div>
        <div className="toolbar-buttons">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`tool-btn ${tool === t.id ? 'active' : ''}`}
              onClick={() => setTool(t.id)}
              title={`${t.label} (${t.shortcut})`}
            >
              <span className="tool-icon">{t.icon}</span>
              <span className="tool-label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Actions group */}
      <div className="toolbar-group">
        <div className="toolbar-label">Actions</div>
        <div className="toolbar-buttons">
          <button
            className="tool-btn"
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Undo (Ctrl+Z)"
          >
            <span className="tool-icon">↩️</span>
            <span className="tool-label">Undo</span>
          </button>
          <button
            className="tool-btn"
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
          >
            <span className="tool-icon">↪️</span>
            <span className="tool-label">Redo</span>
          </button>
          <button
            className="tool-btn"
            onClick={() => fillFloor(0)}
            title="Fill floor layer"
          >
            <span className="tool-icon">🟫</span>
            <span className="tool-label">Floor</span>
          </button>
          <button
            className="tool-btn danger"
            onClick={() => {
              if (voxels.size === 0 || confirm('Clear all voxels?')) {
                clearAll();
              }
            }}
            title="Clear all"
          >
            <span className="tool-icon">💥</span>
            <span className="tool-label">Clear</span>
          </button>
        </div>
      </div>

      {/* Options group */}
      <div className="toolbar-group">
        <div className="toolbar-label">Options</div>
        <div className="toolbar-buttons">
          <button
            className={`tool-btn ${showGrid ? 'active' : ''}`}
            onClick={toggleGrid}
            title="Toggle Grid (G)"
          >
            <span className="tool-icon">📐</span>
            <span className="tool-label">Grid</span>
          </button>
          <button
            className={`tool-btn ${symmetryX ? 'active' : ''}`}
            onClick={toggleSymmetryX}
            title="Mirror X axis"
          >
            <span className="tool-icon">↔️</span>
            <span className="tool-label">Sym X</span>
          </button>
          <button
            className={`tool-btn ${symmetryZ ? 'active' : ''}`}
            onClick={toggleSymmetryZ}
            title="Mirror Z axis"
          >
            <span className="tool-icon">↕️</span>
            <span className="tool-label">Sym Z</span>
          </button>
        </div>
      </div>

      {/* Export group */}
      <div className="toolbar-group">
        <div className="toolbar-label">Export</div>
        <div className="toolbar-buttons">
          <button className="tool-btn export" onClick={handleExportOBJ} title="Export .obj">
            <span className="tool-icon">📦</span>
            <span className="tool-label">.OBJ</span>
          </button>
          <button className="tool-btn export" onClick={handleExportGLTF} title="Export .glb">
            <span className="tool-icon">📦</span>
            <span className="tool-label">.GLB</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="toolbar-group">
        <div className="toolbar-label">Info</div>
        <div className="toolbar-stats">
          <span>Voxels: {voxels.size.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
