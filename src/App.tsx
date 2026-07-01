// ============================================================================
// App – Main Application Layout
// ============================================================================

import React from 'react';
import Scene3D from './components/Scene3D';
import Toolbar from './components/Toolbar';
import ColorPalette from './components/ColorPalette';

export default function App() {
  return (
    <div className="app">
      {/* Top toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="main-content">
        {/* Left sidebar: Color palette */}
        <ColorPalette />

        {/* 3D Viewport */}
        <div className="viewport">
          <Scene3D />
          <div className="viewport-hint">
            Left-click: Use Tool | Right-click + drag: Orbit | Middle-click + drag: Pan | Scroll: Zoom
          </div>
        </div>
      </div>
    </div>
  );
}
