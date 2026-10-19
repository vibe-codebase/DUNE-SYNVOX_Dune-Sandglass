/**
 * Sandglass art, painted with Canvas 2D: a glass case with brass corners on a table in late light; sand drawn
 * grain by grain with its own speckle; glass walls frosted and catching the light; brass sieves; vials with
 * their wanted layers ghosted inside, and a cork when they are done.
 */
import { FINE, N, type Level, type Vial, type World } from './sim';

export type Mood = { name: string; room: [string, string, string]; back: [string, string]; metal: [string, string, string]; glow: string };
export const MOODS: Mood[] = [
  { name: 'desert', room: ['#f3d9b1', '#d9a877', '#8a5a3a'], back: ['#2a1c2e', '#160f1a'], metal: ['#f6dc94', '#c9963e', '#6e4a1a'], glow: 'rgba(255,214,150,' },
  { name: 'oasis', room: ['#cfe3d8', '#86b7a7', '#3e6a62'], back: ['#152427', '#0b1517'], metal: ['#f1d2b0', '#c07f52', '#6a3a1e'], glow: 'rgba(220,255,240,' },
  { name: 'dusk', room: ['#e7b8b0', '#9a6a8a', '#3c2848'], back: ['#1c1730', '#0e0b1a'], metal: ['#eef0f4', '#a8aeb8', '#545a66'], glow: 'rgba(255,200,220,' },
];
/** Sand colours: terracotta, saffron, turquoise, indigo, rose, and the fine white. */
export const SAND: [number, number, number][] = [[0, 0, 0], [200, 85, 61], [242, 165, 65], [42, 157, 143], [72, 66, 160], [231, 161, 176], [244, 239, 230]];
export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
  return { c, g: c.getContext('2d')! };
}
const hash = (a: number, b: number) => { let h = Math.imul(a + 0x9e3779b9, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const TAU = Math.PI * 2;
const rgb = ([r, g, b]: [number, number, number], a = 1) => `rgba(${r},${g},${b},${a})`;

/** The room: a warm wall in low sun, a table, and the case's long shadow. */
export function room(m: Mood, W: number, H: number, cx: number, cy: number, S: number, r: number) {
  const { c, g } = canvas(W * r, H * r);
  g.scale(r, r);
  const wall = g.createLinearGradient(0, 0, W * 0.4, H); wall.addColorStop(0, m.room[0]); wall.addColorStop(0.6, m.room[1]); wall.addColorStop(1, m.room[2]);
  g.fillStyle = wall; g.fillRect(0, 0, W, H);
  // a window's light across the wall
  g.save(); g.globalAlpha = 0.18; g.fillStyle = '#fff6e0';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(W * (0.05 + i * 0.22), 0); g.lineTo(W * (0.18 + i * 0.22), 0); g.lineTo(W * (0.55 + i * 0.22), H); g.lineTo(W * (0.42 + i * 0.22), H); g.closePath(); g.fill(); }
  g.restore();
  // plaster texture
  for (let i = 0; i < W * H / 60; i++) { g.fillStyle = hash(i, 1) < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'; g.fillRect(hash(i, 2) * W, hash(i, 3) * H, 1.5, 1.5); }
  // the case's shadow
  g.fillStyle = 'rgba(40,20,10,0.28)'; g.filter = 'blur(18px)'; g.fillRect(cx - S / 2 + 18, cy - S / 2 + 26, S, S); g.filter = 'none';
  return c;
}

/** The case: a dark backing, a brass frame with corner caps, and a pane of glass over it all. Drawn S×S. */
export function caseBack(m: Mood, S: number, r: number) {
  const pad = 14, T = S + pad * 2, { c, g } = canvas(T * r, T * r);
  g.scale(r, r); g.translate(pad, pad);
  const br = g.createLinearGradient(0, 0, S, S); br.addColorStop(0, m.metal[0]); br.addColorStop(0.5, m.metal[1]); br.addColorStop(1, m.metal[2]);
  g.fillStyle = br; g.beginPath(); g.roundRect(-10, -10, S + 20, S + 20, 8); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.beginPath(); g.roundRect(-9.5, -9.5, S + 19, S + 19, 7.5); g.stroke();
  const bk = g.createRadialGradient(S * 0.35, S * 0.3, S * 0.05, S / 2, S / 2, S * 0.8); bk.addColorStop(0, m.back[0]); bk.addColorStop(1, m.back[1]);
  g.fillStyle = bk; g.fillRect(0, 0, S, S);
  // a faint grid scratched in the backing, like a sand-art board
  g.strokeStyle = 'rgba(255,255,255,0.025)'; g.lineWidth = 1; const cs = S / N;
  for (let i = 1; i < N; i += 4) { g.beginPath(); g.moveTo(i * cs, 0); g.lineTo(i * cs, S); g.stroke(); g.beginPath(); g.moveTo(0, i * cs); g.lineTo(S, i * cs); g.stroke(); }
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S);
  // corner caps
  for (const [x, y] of [[-10, -10], [S - 8, -10], [-10, S - 8], [S - 8, S - 8]]) { const cp = g.createLinearGradient(x, y, x + 18, y + 18); cp.addColorStop(0, m.metal[0]); cp.addColorStop(1, m.metal[2]); g.fillStyle = cp; g.beginPath(); g.roundRect(x, y, 18, 18, 4); g.fill(); g.fillStyle = m.metal[2]; g.beginPath(); g.arc(x + 9, y + 9, 2.2, 0, TAU); g.fill(); }
  return c;
}
/** The glass reflections over the case. */
export function caseGlass(S: number, r: number) {
  const { c, g } = canvas(S * r, S * r);
  g.scale(r, r);
  const sh = g.createLinearGradient(0, 0, S, S); sh.addColorStop(0, 'rgba(255,255,255,0.09)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.62, 'rgba(255,255,255,0)'); sh.addColorStop(0.66, 'rgba(255,255,255,0.06)'); sh.addColorStop(0.72, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.fillRect(0, 0, S, S);
  return c;
}

/** Glass walls, sieves and vials, drawn at cs px a cell. Vials ghost their wanted layers. */
export function fixtures(m: Mood, l: Level, w: World, cs: number, r: number) {
  const S = N * cs, { c, g } = canvas(S * r, S * r);
  g.scale(r, r);
  const vialCells = new Set<number>();
  l.vials.forEach((v) => { for (let y = v.y - 1; y <= v.y + v.h; y++) for (let x = v.x - 1; x <= v.x + v.w; x++) vialCells.add(y * N + x); });
  // the wanted layers, ghosted inside each vial
  l.vials.forEach((v) => ghost(g, v, cs));
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, s = w.solid[i];
    if (!s) continue;
    const X = x * cs, Y = y * cs;
    if (s === 2) {
      // a brass sieve: a fine mesh
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(X, Y, cs, cs);
      g.strokeStyle = m.metal[1]; g.lineWidth = 0.6;
      for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(X + (k * cs) / 2, Y); g.lineTo(X + (k * cs) / 2, Y + cs); g.stroke(); g.beginPath(); g.moveTo(X, Y + (k * cs) / 2); g.lineTo(X + cs, Y + (k * cs) / 2); g.stroke(); }
      continue;
    }
    const vial = vialCells.has(i);
    const edge = (dx: number, dy: number) => { const xx = x + dx, yy = y + dy; return xx < 0 || yy < 0 || xx >= N || yy >= N || !w.solid[yy * N + xx]; };
    if (vial) {
      // a vial is clear glass, bright at its edges
      g.fillStyle = 'rgba(225,240,255,0.42)'; g.fillRect(X, Y, cs, cs);
      g.fillStyle = 'rgba(255,255,255,0.85)';
      if (edge(0, -1)) g.fillRect(X, Y, cs, 1.2);
      if (edge(-1, 0)) g.fillRect(X, Y, 1.2, cs);
      g.fillStyle = 'rgba(160,190,220,0.6)';
      if (edge(0, 1)) g.fillRect(X, Y + cs - 1, cs, 1);
      if (edge(1, 0)) g.fillRect(X + cs - 1, Y, 1, cs);
    } else {
      // hoppers and baffles are brass-bound wood
      g.fillStyle = m.metal[2]; g.fillRect(X, Y, cs, cs);
      g.fillStyle = m.metal[1];
      if (edge(0, -1)) g.fillRect(X, Y, cs, Math.max(1, cs * 0.35));
      if (edge(-1, 0)) g.fillRect(X, Y, Math.max(1, cs * 0.35), cs);
      g.fillStyle = 'rgba(255,240,200,0.5)';
      if (edge(0, -1)) g.fillRect(X, Y, cs, 0.8);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      if (edge(0, 1)) g.fillRect(X, Y + cs - 1, cs, 1);
      if (edge(1, 0)) g.fillRect(X + cs - 1, Y, 1, cs);
    }
  }
  return c;
}
/** A vial's wanted layers, as faint bands from its base. */
export function ghost(g: CanvasRenderingContext2D, v: Vial, cs: number, alpha = 0.34) {
  let r = 0;
  for (const [col, n] of v.target) {
    for (let k = 0; k < n; k++, r++) {
      let x: number, y: number, w: number, h: number;
      if (v.mouth === 2) { x = v.x; y = v.y + v.h - 1 - r; w = v.w; h = 1; } else if (v.mouth === 0) { x = v.x; y = v.y + r; w = v.w; h = 1; } else if (v.mouth === 1) { x = v.x + v.w - 1 - r; y = v.y; w = 1; h = v.h; } else { x = v.x + r; y = v.y; w = 1; h = v.h; }
      g.fillStyle = rgb(SAND[col], alpha); g.fillRect(x * cs, y * cs, w * cs, h * cs);
    }
  }
  // the fill line
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.beginPath();
  const R = r;
  if (v.mouth === 2) { g.moveTo(v.x * cs, (v.y + v.h - R) * cs); g.lineTo((v.x + v.w) * cs, (v.y + v.h - R) * cs); }
  else if (v.mouth === 0) { g.moveTo(v.x * cs, (v.y + R) * cs); g.lineTo((v.x + v.w) * cs, (v.y + R) * cs); }
  else if (v.mouth === 1) { g.moveTo((v.x + v.w - R) * cs, v.y * cs); g.lineTo((v.x + v.w - R) * cs, (v.y + v.h) * cs); }
  else { g.moveTo((v.x + R) * cs, v.y * cs); g.lineTo((v.x + R) * cs, (v.y + v.h) * cs); }
  g.stroke(); g.setLineDash([]);
}

/** Per-cell grain shading, fixed for the level so sand keeps its look as it moves: a light or dark tint and speckles. */
export function grainTable(cs: number) {
  const t = new Float32Array(N * N * cs * cs);
  for (let i = 0; i < N * N; i++) for (let p = 0; p < cs * cs; p++) { const h = hash(i, p); t[i * cs * cs + p] = h < 0.08 ? -0.22 : h > 0.94 ? 0.18 : (hash(i, p + 999) - 0.5) * 0.1; }
  return t;
}
/** Paint the sand into an ImageData of N*cs square. Slopes are smoothed: an empty cell nestled between two grains
 * of one colour takes a triangle of it, so the steps of a pile read as one smooth slope. */
export function paintSand(img: ImageData, w: World, cs: number, table: Float32Array, glint: number) {
  const d = img.data, S = N * cs, sand = w.sand, solid = w.solid;
  d.fill(0);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= N || y >= N ? -1 : sand[y * N + x]);
  const put = (x: number, y: number, px: number, py: number, c: number) => {
    const base = SAND[c], ti = ((x * 7 + y * 13 + c * 31) % (N * N)) * cs * cs, t = table[ti + py * cs + px];
    const k = t + (c === FINE ? glint * (t > 0.15 ? 0.25 : 0) : 0);
    const o = ((y * cs + py) * S + x * cs + px) * 4;
    d[o] = Math.max(0, Math.min(255, base[0] * (1 + k))); d[o + 1] = Math.max(0, Math.min(255, base[1] * (1 + k))); d[o + 2] = Math.max(0, Math.min(255, base[2] * (1 + k))); d[o + 3] = 255;
  };
  const m = cs - 1;
  const CORNERS: [number, number][] = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  // inside the triangle at corner (dx, dy) of a cell
  const inTri = (px: number, py: number, dx: number, dy: number) => { const u = dx > 0 ? px : m - px, v = dy > 0 ? py : m - py; return u + v >= m; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const c = sand[y * N + x];
    if (c) {
      for (let py = 0; py < cs; py++) for (let px = 0; px < cs; px++) put(x, y, px, py, c);
    } else if (!solid[y * N + x]) {
      // fill the hollow between two grains of one colour
      for (const [dx, dy] of CORNERS) {
        const a = at(x + dx, y), b = at(x, y + dy);
        if (a > 0 && a === b) for (let py = 0; py < cs; py++) for (let px = 0; px < cs; px++) if (inTri(px, py, dx, dy)) put(x, y, px, py, a);
      }
    }
  }
}
/** A cork for a sealed vial: along +x, cs*len long. */
export function cork(len: number, cs: number, r: number) {
  const w = len * cs + 4, h = cs * 1.6, { c, g } = canvas(w * r, h * r);
  g.scale(r, r);
  const cg = g.createLinearGradient(0, 0, 0, h); cg.addColorStop(0, '#d9b07a'); cg.addColorStop(1, '#8a5a2e');
  g.fillStyle = cg; g.beginPath(); g.roundRect(0, 0, w, h, 2); g.fill();
  for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(80,40,10,0.35)'; g.fillRect(hash(i, 4) * w, hash(i, 5) * h, 1.2, 1.2); }
  return c;
}
