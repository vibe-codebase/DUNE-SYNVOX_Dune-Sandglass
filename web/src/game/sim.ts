/**
 * Sandglass: a square glass frame of N×N cells holding coloured sand, glass walls, fine sieves and vials.
 * The player turns the frame a quarter turn left or right; gravity then points another way through the frame
 * and the sand pours until it settles. A vial is a glass cup with its mouth on one side; what matters is the
 * layers of colour inside it, counted from its base. Everything is a deterministic cellular automaton, so a
 * level plays the same every time and a breadth-first search can find the fewest turns.
 */
export const N = 48;
export const FINE = 6; // the fine white sand, the only sand a sieve lets through
export type Dir = 0 | 1 | 2 | 3; // where gravity points in the frame: down, left, up, right
export const G: [number, number][] = [[0, 1], [-1, 0], [0, -1], [1, 0]];
export type Vial = { x: number; y: number; w: number; h: number; mouth: Dir; target: [number, number][]; seal?: boolean };
export type Level = { solid: string; sand: string; vials: Vial[]; start: Dir };
export type World = { solid: Uint8Array; sand: Uint8Array; grav: Dir; tick: number; sealed: boolean[] };

/** solid and sand are N*N characters: '.' empty, '#' glass, ':' sieve; '0'..'6' sand colours (0 none). */
export function load(l: Level): World {
  const solid = new Uint8Array(N * N), sand = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) { const s = l.solid[i]; solid[i] = s === '#' ? 1 : s === ':' ? 2 : 0; const c = l.sand.charCodeAt(i) - 48; sand[i] = c > 0 && c <= 9 ? c : 0; }
  const w: World = { solid, sand, grav: l.start, tick: 0, sealed: l.vials.map(() => false) };
  addVials(w, l);
  return w;
}
/** The vials' glass: walls round three sides of each, the mouth open. */
export function addVials(w: World, l: Level) {
  l.vials.forEach((v) => {
    for (let y = v.y - 1; y <= v.y + v.h; y++) for (let x = v.x - 1; x <= v.x + v.w; x++) {
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const inside = x >= v.x && x < v.x + v.w && y >= v.y && y < v.y + v.h;
      if (inside) continue;
      const inX = x >= v.x && x < v.x + v.w, inY = y >= v.y && y < v.y + v.h;
      const open = (v.mouth === 0 && y === v.y + v.h && inX) || (v.mouth === 2 && y === v.y - 1 && inX) || (v.mouth === 1 && x === v.x - 1 && inY) || (v.mouth === 3 && x === v.x + v.w && inY);
      if (open) continue;
      w.solid[y * N + x] = 1;
    }
  });
}
export const clone = (w: World): World => ({ solid: w.solid.slice(), sand: w.sand.slice(), grav: w.grav, tick: w.tick, sealed: w.sealed.slice() });
export const turnLeft = (d: Dir): Dir => ((d + 1) % 4) as Dir; // the frame turns left (anticlockwise): gravity swings round
export const turnRight = (d: Dir): Dir => ((d + 3) % 4) as Dir;

const free = (w: World, i: number, c: number) => w.sand[i] === 0 && (w.solid[i] === 0 || (w.solid[i] === 2 && c === FINE));
/** One step of the sand. Returns how many grains moved. */
export function step(w: World, moved = new Uint8Array(N * N)): number {
  const [gx, gy] = G[w.grav], lx = -gy, ly = gx;
  moved.fill(0);
  let n = 0;
  // scan from the bottom (in gravity's sense) up, so a falling column moves together
  for (let a = N - 1; a >= 0; a--) for (let b = 0; b < N; b++) {
    const bb = (w.tick + a) & 1 ? b : N - 1 - b;
    let x: number, y: number;
    if (w.grav === 0) { x = bb; y = a; } else if (w.grav === 2) { x = bb; y = N - 1 - a; } else if (w.grav === 3) { x = a; y = bb; } else { x = N - 1 - a; y = bb; }
    const i = y * N + x, c = w.sand[i];
    if (!c || moved[i]) continue;
    const tx = x + gx, ty = y + gy;
    if (tx < 0 || ty < 0 || tx >= N || ty >= N) continue;
    const t = ty * N + tx;
    if (free(w, t, c)) { w.sand[t] = c; w.sand[i] = 0; moved[t] = 1; n++; continue; }
    // slide down a slope, either side, alternating which side is tried first
    const s = ((x + y + w.tick) & 1) ? 1 : -1;
    for (const side of [s, -s]) {
      const sx = x + lx * side, sy = y + ly * side, dx = tx + lx * side, dy = ty + ly * side;
      if (dx < 0 || dy < 0 || dx >= N || dy >= N) continue;
      const si = sy * N + sx, di = dy * N + dx;
      if (free(w, di, c) && free(w, si, c)) { w.sand[di] = c; w.sand[i] = 0; moved[di] = 1; n++; break; }
    }
  }
  w.tick++;
  return n;
}
/** Seal any vial that is full, if its level seals vials: a cork drops into its mouth. */
export function seal(w: World, l: Level) {
  l.vials.forEach((v, k) => {
    if (!v.seal || w.sealed[k]) return;
    for (let y = v.y; y < v.y + v.h; y++) for (let x = v.x; x < v.x + v.w; x++) if (!w.sand[y * N + x]) return;
    w.sealed[k] = true;
    // the cork: the mouth row becomes glass
    for (let i = 0; i < (v.mouth === 0 || v.mouth === 2 ? v.w : v.h); i++) {
      const x = v.mouth === 1 ? v.x - 1 : v.mouth === 3 ? v.x + v.w : v.x + i, y = v.mouth === 0 ? v.y + v.h : v.mouth === 2 ? v.y - 1 : v.y + i;
      w.solid[y * N + x] = 1;
    }
  });
}
/** Let the sand pour until it settles. */
export function settle(w: World, l: Level, limit = 4000) {
  const moved = new Uint8Array(N * N);
  for (let k = 0; k < limit; k++) { const n = step(w, moved); seal(w, l); if (!n) return k; }
  return limit;
}
/** A quarter turn and the pour that follows. */
export function turn(w: World, l: Level, dir: 'L' | 'R') { w.grav = dir === 'L' ? turnLeft(w.grav) : turnRight(w.grav); settle(w, l); }

/** The layers in a vial, base first: [colour, rows]. A row's colour is the commonest in it; empty rows end the count. */
export function layers(w: World, v: Vial): [number, number][] {
  const out: [number, number][] = [];
  const rows = v.mouth === 0 || v.mouth === 2 ? v.h : v.w, across = v.mouth === 0 || v.mouth === 2 ? v.w : v.h;
  for (let r = 0; r < rows; r++) {
    // row r from the base (the side opposite the mouth)
    const counts = new Map<number, number>(); let filled = 0;
    for (let a = 0; a < across; a++) {
      let x: number, y: number;
      if (v.mouth === 0) { x = v.x + a; y = v.y + r; } else if (v.mouth === 2) { x = v.x + a; y = v.y + v.h - 1 - r; } else if (v.mouth === 1) { x = v.x + v.w - 1 - r; y = v.y + a; } else { x = v.x + r; y = v.y + a; }
      const c = w.sand[y * N + x]; if (c) { filled++; counts.set(c, (counts.get(c) ?? 0) + 1); }
    }
    if (filled * 2 < across) break;
    let best = 0, bc = 0; for (const [c, k] of counts) if (k > bc) { bc = k; best = c; }
    if (out.length && out[out.length - 1][0] === best) out[out.length - 1][1]++; else out.push([best, 1]);
  }
  return out;
}
/** A vial matches its target when the colours come in the same order, each layer within a row or two of its depth. */
export function matches(got: [number, number][], want: [number, number][]) {
  if (got.length !== want.length) return false;
  return got.every(([c, n], i) => c === want[i][0] && Math.abs(n - want[i][1]) <= Math.max(1, Math.round(want[i][1] * 0.25)));
}
export const solvedBy = (w: World, l: Level) => l.vials.every((v) => matches(layers(w, v), v.target));

export function hash(w: World) { let h = 2166136261 ^ w.grav; for (let i = 0; i < w.sand.length; i++) { h ^= w.sand[i]; h = Math.imul(h, 16777619); } return h >>> 0; }
/** The fewest quarter turns to fill every vial right (breadth first, up to `depth`). */
export function solve(l: Level, from?: World, depth = 9): ('L' | 'R')[] | null {
  const w0 = from ? clone(from) : load(l);
  if (!from) settle(w0, l);
  if (solvedBy(w0, l)) return [];
  let frontier: { w: World; path: ('L' | 'R')[] }[] = [{ w: w0, path: [] }];
  const seen = new Set([hash(w0)]);
  for (let d = 0; d < depth; d++) {
    const next: typeof frontier = [];
    for (const f of frontier) for (const m of ['L', 'R'] as const) {
      const w = clone(f.w); turn(w, l, m);
      const h = hash(w); if (seen.has(h)) continue; seen.add(h);
      const path = [...f.path, m];
      if (solvedBy(w, l)) return path;
      next.push({ w, path });
    }
    frontier = next;
    if (!frontier.length) break;
  }
  return null;
}
export function starsFor(turns: number, par: number) { return turns <= par ? 3 : turns <= par + 2 ? 2 : 1; }
