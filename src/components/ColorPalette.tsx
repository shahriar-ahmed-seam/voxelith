// ============================================================================
// ColorPalette – Color selection panel with editable swatches
// ============================================================================

import React, { useCallback, useRef } from 'react';
import { useVoxelStore } from '../engine/store';

export default function ColorPalette() {
  const palette = useVoxelStore((s) => s.palette);
  const currentColor = useVoxelStore((s) => s.currentColor);
  const setColor = useVoxelStore((s) => s.setColor);
  const setPaletteColor = useVoxelStore((s) => s.setPaletteColor);

  const colorInputRef = useRef<HTMLInputElement>(null);
  const editingIndex = useRef<number | null>(null);

  const handleSwatchClick = useCallback(
    (color: string) => {
      setColor(color);
    },
    [setColor]
  );

  const handleSwatchDoubleClick = useCallback(
    (index: number) => {
      editingIndex.current = index;
      if (colorInputRef.current) {
        colorInputRef.current.value = palette[index];
        colorInputRef.current.click();
      }
    },
    [palette]
  );

  const handleColorInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value;
      if (editingIndex.current !== null) {
        setPaletteColor(editingIndex.current, newColor);
        setColor(newColor);
      } else {
        setColor(newColor);
      }
    },
    [setColor, setPaletteColor]
  );

  const handleCustomColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setColor(e.target.value);
    },
    [setColor]
  );

  return (
    <div className="color-palette">
      <div className="palette-header">
        <span className="palette-title">Color Palette</span>
      </div>

      {/* Current color preview */}
      <div className="current-color-row">
        <div
          className="current-color-preview"
          style={{ backgroundColor: currentColor }}
        />
        <input
          type="color"
          value={currentColor}
          onChange={handleCustomColorChange}
          className="current-color-input"
          title="Click to choose custom color"
        />
        <span className="current-color-hex">{currentColor.toUpperCase()}</span>
      </div>

      {/* Swatch grid */}
      <div className="swatch-grid">
        {palette.map((color, i) => (
          <button
            key={i}
            className={`swatch ${color === currentColor ? 'active' : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => handleSwatchClick(color)}
            onDoubleClick={() => handleSwatchDoubleClick(i)}
            title={`${color} (double-click to edit)`}
          />
        ))}
      </div>

      {/* Hidden color picker for editing swatches */}
      <input
        ref={colorInputRef}
        type="color"
        className="hidden-color-input"
        onChange={handleColorInputChange}
      />

      <div className="palette-hint">
        Double-click swatch to edit color
      </div>
    </div>
  );
}
