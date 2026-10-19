/**
 * Level generator. A level is a glass frame with hoppers of coloured sand, a few glass baffles, sometimes
 * sieves, and the vials. The generator lays one out, plays a random sequence of quarter turns, and takes what
 * ends up in the vials as the target. It keeps a level only if every vial ends with a clean pattern (a few thick
 * layers), at least one vial is layered where the template asks, and a breadth-first search finds no shorter
 * way than the par it asks for.
 * Run: npx esbuild tools/gen.ts --bundle --platform=node --format=esm --outfile=tools/.gen.mjs && node tools/.gen.mjs
 */
import fs from 'node:fs';
import { clone, FINE, hash, layers, load, N, settle, solvedBy, turn, type Dir, type Level, type Vial } from '../src/game/sim';

type T = { id: string; hoppers: number; vials: number; baffles: number; sieves: number; seal: boolean; minPar: number; maxPar: number; layered: number; fine: boolean; seed: number };
const t = (id: string, hoppers: number, vials: number, baffles: number, sieves: number, seal: boolean, minPar: number, maxPar: number, layered: number, fine: boolean, seed: number): T => ({ id, hoppers, vials, baffles, sieves, seal, minPar, maxPar, layered, fine, seed });
const TEMPLATES: T[] = [
  t('d1', 1, 1, 0, 0, false, 1, 2, 0, false, 1), t('d2', 2, 1, 1, 0, false, 2, 3, 1, false, 2), t('d3', 2, 1, 1, 0, false, 2, 3, 1, false, 3), t('d4', 2, 2, 2, 0, false, 3, 4, 1, false, 4),
  t('d5', 3, 1, 2, 0, false, 3, 5, 1, false, 5), t('d6', 3, 2, 2, 0, false, 3, 5, 1, false, 6), t('d7', 3, 2, 2, 0, false, 4, 6, 1, false, 7), t('d8', 3, 2, 3, 0, false, 4, 6, 1, false, 8),
  t('s1', 2, 1, 1, 1, false, 2, 4, 1, true, 11), t('s2', 2, 2, 1, 1, false, 3, 4, 1, true, 12), t('s3', 3, 1, 2, 1, false, 3, 5, 1, true, 13), t('s4', 3, 2, 2, 1, false, 3, 5, 1, true, 14),
  t('s5', 3, 2, 2, 2, false, 4, 6, 1, true, 15), t('s6', 3, 2, 3, 1, false, 4, 6, 2, true, 16), t('s7', 3, 2, 2, 2, false, 4, 6, 1, true, 57), t('s8', 3, 2, 3, 1, false, 4, 6, 1, true, 58),
  t('c1', 2, 2, 1, 0, true, 3, 4, 1, false, 21), t('c2', 3, 2, 2, 0, true, 3, 5, 1, false, 22), t('c3', 3, 2, 2, 1, true, 4, 5, 1, true, 23), t('c4', 3, 3, 2, 0, true, 4, 6, 2, false, 24),
  t('c5', 4, 2, 3, 1, true, 4, 6, 2, true, 25), t('c6', 3, 2, 2, 1, true, 4, 5, 1, true, 66), t('c7', 3, 2, 3, 0, true, 4, 6, 1, false, 67), t('c8', 3, 2, 3, 1, true, 4, 6, 1, true, 68),
];
export const STAT: Record<number, number> = {};
function rng(seed: number) { let s = Math.imul(seed + 0x9e3779b9, 2654435761) >>> 0 || 1; for (let i = 0; i < 8; i++) { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; } return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

function attempt(T: T, rnd: () => number): (Level & { par: number; answer: string }) | null {
  const solid = Array(N * N).fill('.'), sand = Array(N * N).fill('0');
  const taken = new Uint8Array(N * N);
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const box = (x: number, y: number, w: number, h: number, m = 2) => { for (let yy = y - m; yy < y + h + m; yy++) for (let xx = x - m; xx < x + w + m; xx++) { if (xx < 0 || yy < 0 || xx >= N || yy >= N) return false; if (taken[yy * N + xx]) return false; } return true; };
  const take = (x: number, y: number, w: number, h: number) => { for (let yy = y - 1; yy < y + h + 1; yy++) for (let xx = x - 1; xx < x + w + 1; xx++) if (xx >= 0 && yy >= 0 && xx < N && yy < N) taken[yy * N + xx] = 1; };
  // colours: four earth and sea colours, and the fine white sand where sieves are in play
  const palette = [1, 2, 3, 4, 5].sort(() => rnd() - 0.5);
  const cols: number[] = [];
  for (let k = 0; k < T.hoppers; k++) cols.push(T.fine && k === 0 ? FINE : palette[k % palette.length]);
  // hoppers: glass pockets of sand, open on one side
  const hoppers: { x: number; y: number; w: number; h: number; mouth: Dir }[] = [];
  for (let k = 0; k < T.hoppers; k++) {
    let ok = false;
    for (let a = 0; a < 60 && !ok; a++) {
      const q = (k + Math.floor(rnd() * 4)) % 4, qx = q % 2, qy = q >> 1;
      // a hopper in a corner of the frame, open at the top or toward the middle
      const mouth = (rnd() < 0.5 ? (qx ? 1 : 3) : 2) as Dir, horiz = mouth === 2, w = horiz ? ri(8, 12) : ri(6, 9), h = horiz ? ri(6, 9) : ri(8, 12);
      const x = qx ? ri(N - 3 - w - 5, N - 3 - w) : ri(2, 7), y = qy ? ri(N - 3 - h - 5, N - 3 - h) : ri(2, 7);
      if (!box(x, y, w, h)) continue;
      hoppers.push({ x, y, w, h, mouth }); take(x, y, w, h); ok = true;
      for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) sand[yy * N + xx] = String(cols[k]);
    }
    if (!ok) return (STAT[1] = (STAT[1] ?? 0) + 1, null);
  }
  // vials: smaller glass cups
  const vials: Vial[] = [];
  for (let k = 0; k < T.vials; k++) {
    let ok = false;
    for (let a = 0; a < 80 && !ok; a++) {
      const mouth = ri(0, 3) as Dir, horiz = mouth === 0 || mouth === 2, w = horiz ? ri(4, 6) : ri(8, 11), h = horiz ? ri(8, 11) : ri(4, 6), x = ri(10, N - 10 - w), y = ri(10, N - 10 - h);
      if (!box(x, y, w, h, 2)) continue;
      vials.push({ x, y, w, h, mouth, target: [], ...(T.seal ? { seal: true } : {}) }); take(x, y, w, h); ok = true;
    }
    if (!ok) return (STAT[2] = (STAT[2] ?? 0) + 1, null);
  }
  // the hoppers' glass
  for (const hp of hoppers) for (let y = hp.y - 1; y <= hp.y + hp.h; y++) for (let x = hp.x - 1; x <= hp.x + hp.w; x++) {
    if (x < 0 || y < 0 || x >= N || y >= N) continue;
    if (x >= hp.x && x < hp.x + hp.w && y >= hp.y && y < hp.y + hp.h) continue;
    const inX = x >= hp.x && x < hp.x + hp.w, inY = y >= hp.y && y < hp.y + hp.h;
    // a sideways hopper is open only in the upper half of its side, like a jug's lip, so it holds its sand at rest
    const lip = inY && y >= hp.y + Math.floor(hp.h / 2);
    const open = (hp.mouth === 0 && y === hp.y + hp.h && inX) || (hp.mouth === 2 && y === hp.y - 1 && inX) || (hp.mouth === 1 && x === hp.x - 1 && inY && !lip) || (hp.mouth === 3 && x === hp.x + hp.w && inY && !lip);
    solid[y * N + x] = open ? '.' : '#';
  }
  // sieves across some hoppers' mouths: only fine sand gets out that way
  const sieveable = hoppers.map((h, i) => i).filter((i) => cols[i] !== FINE).sort(() => rnd() - 0.5).slice(0, T.sieves);
  for (const i of sieveable) { const hp = hoppers[i]; const L = hp.mouth === 0 || hp.mouth === 2 ? hp.w : hp.h; for (let a = 0; a < L; a++) { const x = hp.mouth === 1 ? hp.x - 1 : hp.mouth === 3 ? hp.x + hp.w : hp.x + a, y = hp.mouth === 0 ? hp.y + hp.h : hp.mouth === 2 ? hp.y - 1 : hp.y + a; solid[y * N + x] = ':'; } }
  // a sieve hopper still needs a way out for its own coarse sand: a gap high on a side, so it holds its sand at rest
  for (const i of sieveable) {
    const hp = hoppers[i];
    if (hp.mouth === 2) { const side = rnd() < 0.5 ? hp.x - 1 : hp.x + hp.w; for (let y = hp.y; y < hp.y + 3; y++) solid[y * N + side] = '.'; }
    else { const a0 = ri(0, Math.max(0, hp.w - 3)); for (let x = hp.x + a0; x < hp.x + a0 + 3 && x < hp.x + hp.w; x++) solid[(hp.y - 1) * N + x] = '.'; }
  }
  // baffles: short glass shelves and slopes in the open
  for (let k = 0; k < T.baffles; k++) {
    for (let a = 0; a < 40; a++) {
      const kind = ri(0, 2), L = ri(6, 12), x = ri(3, N - 4), y = ri(3, N - 4);
      const cells: [number, number][] = [];
      for (let s = 0; s < L; s++) cells.push(kind === 0 ? [x + s, y] : kind === 1 ? [x, y + s] : [x + s, y + s * (rnd() < 0.5 ? 1 : 1)]);
      if (cells.some(([cx, cy]) => cx < 1 || cy < 1 || cx >= N - 1 || cy >= N - 1 || taken[cy * N + cx])) continue;
      for (const [cx, cy] of cells) { solid[cy * N + cx] = '#'; if (kind === 2 && cx + 1 < N) solid[cy * N + cx + 1] = '#'; taken[cy * N + cx] = 1; }
      break;
    }
  }
  const lv: Level = { solid: solid.join(''), sand: sand.join(''), vials, start: 0 };
  // play a random sequence of turns, and take what lands in the vials as the target
  const L = ri(T.minPar, T.maxPar), seq: ('L' | 'R')[] = [];
  const w = load(lv); settle(w, lv);
  // the sand that would spill at rest never left the shop: keep only what stays in each hopper
  const inHopper = (x: number, y: number) => hoppers.some((hp) => x >= hp.x && x < hp.x + hp.w && y >= hp.y && y < hp.y + hp.h);
  for (let it = 0; it < 6; it++) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inHopper(x, y)) w.sand[y * N + x] = 0; if (!settle(w, lv)) break; }
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inHopper(x, y)) w.sand[y * N + x] = 0;
  for (const hp of hoppers) { let k = 0; for (let y = hp.y; y < hp.y + hp.h; y++) for (let x = hp.x; x < hp.x + hp.w; x++) if (w.sand[y * N + x]) k++; if (k < hp.w * hp.h * 0.4) { if (process.env.DBG) console.log("drop", hp.mouth, k, hp.w * hp.h, hp.x, hp.y, hp.w, hp.h); return (STAT[4] = (STAT[4] ?? 0) + 1, null); } }
  lv.sand = Array.from(w.sand, (c) => String(c)).join('');
  { const again = load(lv); if (settle(again, lv) > 0) return (STAT[3] = (STAT[3] ?? 0) + 1, null); }
  // explore every sequence of turns up to maxPar (breadth first, merging equal states), and choose as the target
  // the cleanest vial pattern that first appears at a depth in the template's range
  void L; void seq;
  type Node = { w: typeof w; path: string };
  const levels: Node[][] = [[{ w, path: '' }]];
  const seen = new Set([hash(w)]);
  for (let d = 1; d <= T.maxPar; d++) {
    const next: Node[] = [];
    for (const nd of levels[d - 1]) for (const m of ['L', 'R'] as const) { const c = clone(nd.w); turn(c, lv, m); const h = hash(c); if (seen.has(h)) continue; seen.add(h); next.push({ w: c, path: nd.path + m }); }
    levels.push(next);
  }
  const quality = (nw: typeof w) => {
    let layeredCount = 0, score = 0;
    const targets: [number, number][][] = [];
    for (const v of vials) {
      const ly = layers(nw, v), cap = v.mouth === 0 || v.mouth === 2 ? v.h : v.w;
      if (!ly.length || ly.length > 3 || ly.some(([, n]) => n < 2)) return null;
      const pu = purity(nw, v); if (pu < 0.65) return null;
      const fill = ly.reduce((a, [, n]) => a + n, 0); if (fill < Math.ceil(cap * 0.4)) return null;
      if (ly.length >= 2) layeredCount++;
      score += pu + fill / cap + (ly.length - 1) * 0.6;
      targets.push(ly);
    }
    if (layeredCount < Math.min(T.layered, vials.length)) return null;
    return { score, targets };
  };
  const cands: { path: string; targets: [number, number][][]; score: number }[] = [];
  for (let d = T.minPar; d <= T.maxPar; d++) for (const nd of levels[d]) {
    const q = quality(nd.w); if (!q) continue;
    if (T.minPar >= 3 && T.id !== 'd2' && T.id !== 'd3' && (!nd.path.includes('L') || !nd.path.includes('R'))) continue;
    cands.push({ path: nd.path, targets: q.targets, score: q.score + d * 0.8 });
  }
  if (!cands.length) return (STAT[5] = (STAT[5] ?? 0) + 1, null);
  cands.sort((a, b) => b.score - a.score);
  for (const cd of cands.slice(0, 6)) {
    vials.forEach((v, i) => (v.target = cd.targets[i]));
    // no shallower state may already match this target
    let shallower = false;
    for (let d = 0; d < cd.path.length && !shallower; d++) for (const nd of levels[d]) if (solvedBy(nd.w, lv)) { shallower = true; break; }
    if (shallower) continue;
    return { ...lv, par: cd.path.length, answer: cd.path };
  }
  return (STAT[9] = (STAT[9] ?? 0) + 1, null);
}


/** How cleanly each row of a vial is one colour (the worst row). */
function purity(w: ReturnType<typeof load>, v: Vial) {
  let worst = 1;
  const rows = v.mouth === 0 || v.mouth === 2 ? v.h : v.w, across = v.mouth === 0 || v.mouth === 2 ? v.w : v.h;
  for (let r = 0; r < rows; r++) {
    const counts = new Map<number, number>(); let f = 0;
    for (let a = 0; a < across; a++) { const x = v.mouth === 0 || v.mouth === 2 ? v.x + a : v.x + r, y = v.mouth === 0 || v.mouth === 2 ? v.y + r : v.y + a, c = w.sand[y * N + x]; if (c) { f++; counts.set(c, (counts.get(c) ?? 0) + 1); } }
    if (f) worst = Math.min(worst, Math.max(...counts.values()) / f);
  }
  return worst;
}
const only = process.argv[2] ? process.argv[2].split(',') : null;
const file = process.env.OUT ? new URL('file://' + process.env.OUT) : new URL('../src/game/levels.json', import.meta.url);
const out = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
for (const T of TEMPLATES) {
  if (only && !only.includes(T.id)) continue;
  const rnd = rng(T.seed * 7919);
  let got = null, tries = 0;
  while (!got && tries < 120000) { tries++; got = attempt(T, rnd); }
  if (!got) { console.log(T.id, 'NONE', JSON.stringify(STAT)); for (const k in STAT) delete STAT[k]; continue; }
  out[T.id] = got;
  console.log(T.id, 'tries', tries, 'par', got.par, got.answer, 'vials', got.vials.map((v) => JSON.stringify(v.target)).join(' '));
  fs.writeFileSync(file, JSON.stringify(out) + '\n');
}
