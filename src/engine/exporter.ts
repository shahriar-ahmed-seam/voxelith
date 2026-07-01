// ============================================================================
// OBJ & GLTF Exporter
// ============================================================================

import * as THREE from 'three';
import { type VoxelMap, parseKey } from './types';

/**
 * Build a merged Three.js geometry from the voxel map.
 * Each visible voxel face is added; same-color faces via instancing.
 */
function buildExportMesh(voxels: VoxelMap): THREE.Mesh {
  const tempGeo = new THREE.BoxGeometry(1, 1, 1);
  const merged = new THREE.BufferGeometry();
  const matrices: THREE.Matrix4[] = [];
  const colorArrays: number[][] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const colorCache = new Map<string, THREE.Color>();

  for (const [key, voxel] of voxels) {
    const [x, y, z] = parseKey(key);

    let col = colorCache.get(voxel.color);
    if (!col) {
      col = new THREE.Color(voxel.color);
      colorCache.set(voxel.color, col);
    }

    const boxGeo = tempGeo.clone();
    boxGeo.translate(x + 0.5, y + 0.5, z + 0.5);

    // Apply vertex colors
    const count = boxGeo.attributes.position.count;
    const colorsArr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colorsArr[i * 3] = col.r;
      colorsArr[i * 3 + 1] = col.g;
      colorsArr[i * 3 + 2] = col.b;
    }
    boxGeo.setAttribute('color', new THREE.BufferAttribute(colorsArr, 3));

    geometries.push(boxGeo);
  }

  if (geometries.length === 0) {
    return new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
  }

  // Merge all geometries using mergeGeometries from three
  const mergedGeo = mergeBufferGeometries(geometries);
  if (!mergedGeo) {
    return new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
  }

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.7,
    metalness: 0.0,
  });

  return new THREE.Mesh(mergedGeo, mat);
}

/** Simple geometry merger (handles position, normal, color, and index) */
function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geometries.length === 0) return null;

  let totalVerts = 0;
  let totalIndices = 0;

  for (const geo of geometries) {
    totalVerts += geo.attributes.position.count;
    totalIndices += geo.index ? geo.index.count : 0;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIndices);

  let vertOffset = 0;
  let idxOffset = 0;

  for (const geo of geometries) {
    const pos = geo.attributes.position;
    const norm = geo.attributes.normal;
    const col = geo.attributes.color;
    const idx = geo.index;

    for (let i = 0; i < pos.count * 3; i++) {
      positions[vertOffset * 3 + i] = (pos.array as Float32Array)[i];
    }
    if (norm) {
      for (let i = 0; i < norm.count * 3; i++) {
        normals[vertOffset * 3 + i] = (norm.array as Float32Array)[i];
      }
    }
    if (col) {
      for (let i = 0; i < col.count * 3; i++) {
        colors[vertOffset * 3 + i] = (col.array as Float32Array)[i];
      }
    }
    if (idx) {
      for (let i = 0; i < idx.count; i++) {
        indices[idxOffset + i] = (idx.array as Uint16Array | Uint32Array)[i] + vertOffset;
      }
      idxOffset += idx.count;
    }

    vertOffset += pos.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));

  return merged;
}

/** Trigger a file download */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  downloadBlob(blob, filename);
}

// ============================================================================
// OBJ Export
// ============================================================================

export function exportOBJ(voxels: VoxelMap) {
  if (voxels.size === 0) {
    alert('No voxels to export!');
    return;
  }

  const mesh = buildExportMesh(voxels);
  const geo = mesh.geometry;

  const posAttr = geo.attributes.position;
  const normAttr = geo.attributes.normal;
  const colorAttr = geo.attributes.color;
  const index = geo.index;

  let obj = '# MagicaVoxel Clone - OBJ Export\n';
  obj += `# Vertices: ${posAttr.count}\n\n`;

  // Vertices
  for (let i = 0; i < posAttr.count; i++) {
    obj += `v ${posAttr.getX(i)} ${posAttr.getY(i)} ${posAttr.getZ(i)}`;
    if (colorAttr) {
      obj += ` ${colorAttr.getX(i).toFixed(4)} ${colorAttr.getY(i).toFixed(4)} ${colorAttr.getZ(i).toFixed(4)}`;
    }
    obj += '\n';
  }

  // Normals
  if (normAttr) {
    obj += '\n';
    for (let i = 0; i < normAttr.count; i++) {
      obj += `vn ${normAttr.getX(i)} ${normAttr.getY(i)} ${normAttr.getZ(i)}\n`;
    }
  }

  // Faces
  obj += '\n';
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i) + 1;
      const b = index.getX(i + 1) + 1;
      const c = index.getX(i + 2) + 1;
      if (normAttr) {
        obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`;
      } else {
        obj += `f ${a} ${b} ${c}\n`;
      }
    }
  }

  downloadText(obj, 'voxel-model.obj');
}

// ============================================================================
// GLTF Export
// ============================================================================

export async function exportGLTF(voxels: VoxelMap) {
  if (voxels.size === 0) {
    alert('No voxels to export!');
    return;
  }

  const mesh = buildExportMesh(voxels);

  // Use Three.js GLTFExporter
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter();

  const scene = new THREE.Scene();
  scene.add(mesh);

  exporter.parse(
    scene,
    (result) => {
      if (result instanceof ArrayBuffer) {
        const blob = new Blob([result], { type: 'application/octet-stream' });
        downloadBlob(blob, 'voxel-model.glb');
      } else {
        const output = JSON.stringify(result, null, 2);
        downloadText(output, 'voxel-model.gltf');
      }
    },
    (error) => {
      console.error('GLTF export error:', error);
      alert('Export failed! See console.');
    },
    { binary: true }
  );
}
