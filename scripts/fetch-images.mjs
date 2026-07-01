/**
 * Build-time image pipeline for Voxelith.
 *
 * Downloads cinematic, license-friendly imagery from the Unsplash API into
 * `public/media/`. The Unsplash Access Key is read from UNSPLASH_ACCESS_KEY and
 * is never shipped to the browser. Downloaded assets are committed, so
 * production hosting needs no secret.
 *
 * Usage:  UNSPLASH_ACCESS_KEY=xxx node scripts/fetch-images.mjs
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'media');
const ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

const ASSETS = [
  { name: 'hero', query: 'colorful cubes 3d abstract dark render', w: 3840, orientation: 'landscape' },
  { name: 'feature-build', query: 'isometric geometric blocks colorful', w: 1600, orientation: 'landscape' },
  { name: 'feature-color', query: 'color palette swatches vibrant', w: 1600, orientation: 'landscape' },
  { name: 'feature-export', query: 'low poly 3d model render', w: 1600, orientation: 'landscape' },
  { name: 'showcase', query: 'voxel pixel art cubes abstract', w: 2560, orientation: 'landscape' },
];

async function api(path) {
  const res = await fetch(`https://api.unsplash.com${path}`, {
    headers: { Authorization: `Client-ID ${ACCESS_KEY}` },
  });
  if (!res.ok) throw new Error(`Unsplash API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

async function main() {
  if (!ACCESS_KEY) {
    console.log('\n  UNSPLASH_ACCESS_KEY not set — using committed images in public/media/.\n');
    return;
  }
  await mkdir(OUT_DIR, { recursive: true });
  const credits = [];

  for (const asset of ASSETS) {
    process.stdout.write(`  → ${asset.name} … `);
    const data = await api(
      `/search/photos?query=${encodeURIComponent(asset.query)}` +
      `&per_page=1&orientation=${asset.orientation}&content_filter=high`,
    );
    const photo = data.results?.[0];
    if (!photo) { console.log('no result, skipped'); continue; }
    const url = `${photo.urls.raw}&w=${asset.w}&fm=jpg&q=82&fit=crop`;
    const bytes = await download(url, join(OUT_DIR, `${asset.name}.jpg`));
    if (photo.links?.download_location) {
      await api(photo.links.download_location.replace('https://api.unsplash.com', ''));
    }
    credits.push({
      file: `${asset.name}.jpg`,
      author: photo.user.name,
      authorUrl: `${photo.user.links.html}?utm_source=voxelith&utm_medium=referral`,
      source: `${photo.links.html}?utm_source=voxelith&utm_medium=referral`,
    });
    console.log(`${(bytes / 1024).toFixed(0)} KB`);
  }

  await writeFile(join(OUT_DIR, 'credits.json'),
    JSON.stringify({ provider: 'Unsplash', assets: credits }, null, 2));
  console.log(`\n  Saved ${credits.length} images + credits.json to public/media/\n`);
}

main().catch((err) => {
  console.error('\n  Image fetch failed:', err.message, '\n');
  process.exit(existsSync(OUT_DIR) ? 0 : 1);
});
