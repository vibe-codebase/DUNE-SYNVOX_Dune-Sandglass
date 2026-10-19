// Store icon, adaptive-icon layers, splash and feature graphic: glass vials of layered sand, a stream pouring in.
import * as A from '../src/game/art';

const hash = (a: number, b: number) => { let h = Math.imul(a + 0x9e3779b9, 374761393) ^ Math.imul(b + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const col = (c: number, k = 0) => { const [r, g, b] = A.SAND[c]; return `rgb(${Math.min(255, r * (1 + k))},${Math.min(255, g * (1 + k))},${Math.min(255, b * (1 + k))})`; };
/** Warm late light. */
function wall(g: CanvasRenderingContext2D, W: number, H: number) {
  const m = A.MOODS[0], bg = g.createLinearGradient(0, 0, W * 0.5, H); bg.addColorStop(0, m.room[0]); bg.addColorStop(0.6, m.room[1]); bg.addColorStop(1, m.room[2]);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.save(); g.globalAlpha = 0.16; g.fillStyle = '#fff6e0';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(W * (0.05 + i * 0.24), 0); g.lineTo(W * (0.17 + i * 0.24), 0); g.lineTo(W * (0.6 + i * 0.24), H); g.lineTo(W * (0.48 + i * 0.24), H); g.closePath(); g.fill(); }
  g.restore();
}
/** A sand layer between two wavy lines, speckled grain by grain. */
function layer(g: CanvasRenderingContext2D, x0: number, x1: number, yTop: (x: number) => number, yBot: (x: number) => number, c: number, grain: number, seed: number) {
  g.fillStyle = col(c); g.beginPath();
  for (let x = x0; x <= x1; x += 2) g.lineTo(x, yTop(x));
  for (let x = x1; x >= x0; x -= 2) g.lineTo(x, yBot(x));
  g.closePath(); g.fill();
  g.save(); g.clip();
  for (let i = 0; i < ((x1 - x0) * 240) / grain; i++) { const x = x0 + hash(i, seed) * (x1 - x0), y = Math.min(yTop(x), yBot(x)) + hash(i, seed + 1) * Math.abs(yBot(x) - yTop(x)), h = hash(i, seed + 2); g.fillStyle = h < 0.5 ? col(c, -0.2) : col(c, 0.18); g.fillRect(x, y, grain, grain); }
  g.restore();
}
/** A vial of layered sand at (cx, base), w wide and h tall, its layers given as [colour, fraction] from the base. */
function vial(g: CanvasRenderingContext2D, cx: number, base: number, w: number, h: number, layers: [number, number][], seed: number, fillTo = 0.86, cork = false) {
  const x0 = cx - w / 2, x1 = cx + w / 2, top = base - h, R = w / 2;
  const shape = () => { g.beginPath(); g.moveTo(x0, top); g.lineTo(x0, base - R); g.arc(cx, base - R, R, Math.PI, 0, true); g.lineTo(x1, top); };
  // shadow
  g.save(); g.fillStyle = 'rgba(40,20,10,0.28)'; g.filter = `blur(${w * 0.12}px)`; g.beginPath(); g.ellipse(cx + w * 0.25, base + w * 0.05, w * 0.7, w * 0.12, 0, 0, Math.PI * 2); g.fill(); g.restore();
  g.save(); shape(); g.closePath(); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x0, top, w, h);
  let y = base, k = 0;
  const wave = (yy: number, n: number) => (x: number) => yy + Math.sin((x - x0) / w * Math.PI * 2 * (1 + (n % 2)) + n) * w * 0.05;
  for (const [c, f] of layers) {
    const ny = y - h * fillTo * f;
    layer(g, x0 - 2, x1 + 2, k === layers.length - 1 ? (x) => ny + Math.sin((x - x0) / w * 3) * w * 0.03 : wave(ny, k + seed), k === 0 ? () => base + 2 : wave(y, k - 1 + seed), c, Math.max(1.2, w / 70), seed * 10 + k);
    y = ny; k++;
  }
  // glass: a highlight down one side, shade down the other
  const gl = g.createLinearGradient(x0, 0, x1, 0); gl.addColorStop(0, 'rgba(255,255,255,0.0)'); gl.addColorStop(0.12, 'rgba(255,255,255,0.45)'); gl.addColorStop(0.22, 'rgba(255,255,255,0.05)'); gl.addColorStop(0.85, 'rgba(0,0,0,0.0)'); gl.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = gl; g.fillRect(x0, top, w, h);
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = Math.max(1.5, w * 0.035); shape(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.ellipse(cx, top, w / 2 + w * 0.06, w * 0.08, 0, 0, Math.PI * 2); g.fill();
  if (cork) { const cg = g.createLinearGradient(0, top - w * 0.42, 0, top + w * 0.05); cg.addColorStop(0, '#e2bb84'); cg.addColorStop(1, '#8a5a2e'); g.fillStyle = cg; g.beginPath(); g.roundRect(cx - w * 0.36, top - w * 0.4, w * 0.72, w * 0.46, w * 0.08); g.fill(); }
}
/** A stream of sand falling from above into (cx, y). */
function stream(g: CanvasRenderingContext2D, cx: number, y0: number, y1: number, c: number, w: number, seed: number) {
  for (let i = 0; i < (y1 - y0) * 1.6; i++) { const t = hash(i, seed), y = y0 + t * (y1 - y0), spread = w * (0.3 + t * 0.7), x = cx + (hash(i, seed + 1) - 0.5) * spread; g.fillStyle = hash(i, seed + 2) < 0.5 ? col(c, -0.15) : col(c, 0.15); g.fillRect(x, y, w * 0.09, w * 0.09); }
  // the little heap where it lands
  g.fillStyle = col(c); g.beginPath(); g.ellipse(cx, y1, w * 0.9, w * 0.25, 0, Math.PI, 0); g.fill();
}
const ICON: [number, number][] = [[1, 0.26], [2, 0.22], [3, 0.2], [4, 0.17], [5, 0.15]];
export function icon() { const { c, g } = A.canvas(1024, 1024); wall(g, 1024, 1024); stream(g, 512, 40, 228, 2, 60, 3); vial(g, 512, 900, 300, 680, ICON, 1, 0.88); return c; }
export function adaptive() { const { c, g } = A.canvas(1024, 1024); stream(g, 512, 150, 290, 2, 44, 3); vial(g, 512, 820, 220, 520, ICON, 1, 0.88); return c; }
export function adaptiveBg() { const { c, g } = A.canvas(1024, 1024); wall(g, 1024, 1024); return c; }
export function splash() {
  const W = 1284, H = 2778, { c, g } = A.canvas(W, H);
  wall(g, W, H);
  stream(g, W / 2, 900, 1150, 2, 70, 3);
  vial(g, W / 2, 2050, 360, 880, ICON, 1, 0.88);
  g.textAlign = 'center'; g.font = 'italic 600 210px Fraunces, serif'; g.fillStyle = '#3a2012'; g.fillText('Sandglass', W / 2, 640);
  g.save(); g.shadowBlur = 0; g.textAlign = g.textAlign; g.font = '600 58px Outfit, sans-serif'; g.fillStyle = '#b8442c'; try { g.letterSpacing = '34px'; } catch { /* */ } g.fillText('DUNE', W / 2 + 17, 450); g.restore();
  return c;
}
export function feature() {
  const W = 1024, H = 500, { c, g } = A.canvas(W, H);
  wall(g, W, H);
  // three vials on the right, each its own pattern, one still filling
  vial(g, 640, 440, 96, 300, [[4, 0.3], [6, 0.2], [1, 0.32], [2, 0.18]], 2, 0.9, true);
  vial(g, 770, 452, 110, 340, [[3, 0.25], [2, 0.3], [5, 0.25]], 5, 0.78);
  stream(g, 770, 0, 240, 5, 30, 7);
  vial(g, 900, 440, 96, 300, [[1, 0.35], [4, 0.25], [6, 0.4]], 8, 0.9, true);
  g.textAlign = 'left';
  g.save(); g.shadowBlur = 0; g.textAlign = g.textAlign; g.font = '600 22px Outfit, sans-serif'; g.fillStyle = '#b8442c'; try { g.letterSpacing = '13px'; } catch { /* */ } g.fillText('DUNE', 68, 128); g.restore();
  g.fillStyle = '#3a2012'; g.font = 'italic 600 96px Fraunces, serif'; g.fillText('Sandglass', 64, 214);
  g.fillStyle = '#5a3420'; g.font = '500 30px Outfit, sans-serif'; g.fillText('Pour every layer in its place.', 68, 266);
  g.fillStyle = '#c8553d'; g.fillRect(70, 296, 54, 3);
  g.fillStyle = 'rgba(58,32,18,0.85)'; g.font = '400 19px Outfit, sans-serif';
  g.fillText('Turn a glass case of coloured sand and watch it flow.', 70, 338);
  g.fillText('24 puzzles of sieves, corks and patient pouring.', 70, 366);
  return c;
}
(window as unknown as { brand: unknown }).brand = { icon, adaptive, adaptiveBg, splash, feature };
