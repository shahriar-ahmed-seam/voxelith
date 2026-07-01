import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Multi-page: static cinematic landing (index.html) + the React/R3F
// voxel editor (editor.html).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html'),
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
