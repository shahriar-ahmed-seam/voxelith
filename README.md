<div align="center">

<img src="public/favicon.svg" width="76" alt="Voxelith logo" />

# ◆ Voxelith

### A real-time 3D voxel sculptor for the browser.

Place, paint and carve cubes on an infinite grid — with mirror symmetry, full undo
history, a fast greedy-meshed renderer, and OBJ / glTF export. Inspired by MagicaVoxel.

[**Open the Editor →**](https://voxelith-blush.vercel.app/editor) · [Landing page](https://voxelith-blush.vercel.app)

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![Three.js](https://img.shields.io/badge/Three.js-r183-000?logo=three.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## Overview

Voxelith is a browser-native voxel editor built with **React**, **Three.js** and
**react-three-fiber**. It renders your model with a hand-written **greedy mesher** for
clean, efficient geometry, and lets you export your creation to standard 3D formats.

Two surfaces ship in the project:

- **A cinematic landing page** (`/`) — the marketing front door.
- **The Editor** (`/editor`) — the full voxel studio.

## Features

- **Four tools** — Place, Erase, Paint and Eyedrop, each with a keyboard shortcut.
- **Mirror symmetry** — model on the X and/or Z axis and get a symmetric result.
- **Unlimited undo/redo** — snapshot-based history for fearless experimentation.
- **Rich palette** — curated colors plus a custom color picker.
- **Greedy meshing** — merges coplanar faces for minimal, clean geometry.
- **OBJ & glTF export** — bring your model into Blender, engines or 3D printing.
- **Orbit camera** — inspect your build from any angle, with pan and zoom.

## Controls

| Input | Action | Key | Tool |
|-------|--------|-----|------|
| Left-click | Use current tool | `V` | Place |
| Right-drag | Orbit | `E` | Erase |
| Middle-drag | Pan | `B` | Paint |
| Scroll | Zoom | `I` | Eyedropper |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo | `G` | Toggle grid |

## Tech stack

- **React 19** + **react-three-fiber** + **@react-three/drei**
- **Three.js** (WebGL) with a custom greedy mesher and OBJ/glTF exporters
- **Zustand** for reactive editor state
- **Vite** + **TypeScript** (strict)

## Getting started

```bash
npm install

# (optional) refresh landing imagery from Unsplash
cp .env.example .env.local        # add your UNSPLASH_ACCESS_KEY
npm run fetch:images

npm run dev            # develop
npm run build          # production build
npm run preview
```

> Images are committed under `public/media/`, so builds work with **no** API key.

## Project structure

```
voxelith/
├── index.html            # cinematic landing page
├── editor.html           # the React/R3F voxel editor
├── scripts/
│   └── fetch-images.mjs  # build-time Unsplash pipeline
├── public/
│   ├── favicon.svg
│   └── media/            # committed landing imagery
└── src/
    ├── landing/          # landing page (ts + css)
    ├── components/       # Scene3D, Toolbar, ColorPalette, voxel meshes
    └── engine/           # store, greedy mesher, exporters, types
```

## Deployment

Deployed on [Vercel](https://vercel.com) as a static Vite build. Any push to `main`
triggers an automatic production deploy.

## Credits

- Voxel engine, editor UI and design — hand-built.
- Landing imagery — [Unsplash](https://unsplash.com) (see `public/media/credits.json`).

## License

[MIT](LICENSE) © Shahriar Ahmed
