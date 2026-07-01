/**
 * Voxelith landing interactions:
 *  - nav backdrop, reveal-on-scroll, animated counters
 *  - a decorative hero of floating isometric voxel cubes
 */

const nav = document.getElementById('nav');
const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 40);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

const year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  (el as HTMLElement).style.transitionDelay = `${Math.min(i * 60, 300)}ms`;
  io.observe(el);
});

const countIO = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const el = e.target as HTMLElement;
    const target = Number(el.dataset.count || '0');
    const start = performance.now();
    const dur = 1400;
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countIO.unobserve(el);
  }
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach((c) => countIO.observe(c));

// ── Hero: floating isometric voxel cubes ────────────────────────────
const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement | null;
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const ctx = canvas.getContext('2d')!;
  let W = 0, H = 0, dpr = 1;

  const palette = [
    ['#5599ff', '#3a72d8', '#2a56a8'],
    ['#22d3ee', '#12a9c4', '#0d7f93'],
    ['#a855f7', '#8a3fd0', '#6b2ea8'],
    ['#f59e0b', '#d17f06', '#a06104'],
    ['#f43f5e', '#d02644', '#a01a33'],
  ];

  interface Cube { x: number; y: number; s: number; vy: number; rot: number; vr: number; c: string[]; }
  let cubes: Cube[] = [];

  const spawn = () => {
    const count = Math.max(6, Math.min(16, Math.floor(W / 130)));
    cubes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      s: 16 + Math.random() * 34,
      vy: 6 + Math.random() * 16,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.4,
      c: palette[(Math.random() * palette.length) | 0],
    }));
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    spawn();
  };
  resize();
  window.addEventListener('resize', resize);

  // draw an isometric cube centred at (0,0) with edge size s
  const drawCube = (s: number, c: string[]) => {
    const w = s * 0.866; // cos30
    const h = s * 0.5;   // sin30
    // top face
    ctx.beginPath();
    ctx.moveTo(0, -h * 2);
    ctx.lineTo(w, -h);
    ctx.lineTo(0, 0);
    ctx.lineTo(-w, -h);
    ctx.closePath();
    ctx.fillStyle = c[0];
    ctx.fill();
    // left face
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-w, s - h);
    ctx.closePath();
    ctx.fillStyle = c[2];
    ctx.fill();
    // right face
    ctx.beginPath();
    ctx.moveTo(w, -h);
    ctx.lineTo(0, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(w, s - h);
    ctx.closePath();
    ctx.fillStyle = c[1];
    ctx.fill();
  };

  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (const cube of cubes) {
      cube.y -= cube.vy * dt;
      cube.rot += cube.vr * dt;
      if (cube.y < -60) { cube.y = H + 60; cube.x = Math.random() * W; }
      ctx.save();
      ctx.translate(cube.x, cube.y);
      ctx.globalAlpha = 0.85;
      drawCube(cube.s, cube.c);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
