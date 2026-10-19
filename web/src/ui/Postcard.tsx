import { useEffect, useRef } from 'react';
import { canvas, caseBack, fixtures, MOODS, paintSand, grainTable } from '../game/art';
import type { Level } from '../game/levels';
import { load, N, settle, turn } from '../game/sim';

const cache = new Map<string, HTMLCanvasElement>();
/** The case in miniature: as it starts, or once filled, as it ends with every vial right. */
function paintCard(level: Level, solved: boolean, w: number, h: number, dpr: number) {
  const m = MOODS[level.chapter], { c, g } = canvas(w * dpr, h * dpr);
  g.scale(dpr, dpr);
  g.save(); g.beginPath(); g.roundRect(0, 0, w, h, 8); g.clip();
  const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, m.room[0]); bg.addColorStop(1, m.room[1]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  const B = w - 14, ox = 7, oy = (h - B) / 2;
  const back = caseBack(m, B, dpr); g.drawImage(back, ox - 14, oy - 14, B + 28, B + 28);
  const world = load(level); settle(world, level);
  if (solved) for (const t of level.answer) turn(world, level, t as 'L' | 'R');
  const cs = 3, img = new ImageData(N * cs, N * cs); paintSand(img, world, cs, grainTable(cs), 0);
  const sc = canvas(N * cs, N * cs); sc.g.putImageData(img, 0, 0);
  // a solved case is shown turned the way it ended, as the player last saw it
  const turns = solved ? [...level.answer].reduce((a, t) => a + (t === 'R' ? 1 : -1), 0) : 0;
  g.save(); g.translate(ox + B / 2, oy + B / 2); g.rotate((turns * Math.PI) / 2); g.translate(-B / 2, -B / 2);
  g.imageSmoothingEnabled = true; g.drawImage(sc.c, 0, 0, B, B);
  const fx = fixtures(m, level, world, B / N, dpr); g.drawImage(fx, 0, 0, B, B);
  g.restore();
  g.restore();
  return c;
}

export function Postcard({ level, solved, locked, width }: { level: Level; solved: boolean; locked: boolean; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = Math.round(width * 1.12);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), key = `${level.id}|${solved}|${locked}|${width}|${dpr}`;
    let src = cache.get(key);
    if (!src) { src = paintCard(level, solved && !locked, width, height, dpr); cache.set(key, src); }
    el.width = src.width; el.height = src.height; el.getContext('2d')!.drawImage(src, 0, 0);
  }, [level, solved, locked, width, height]);
  return <canvas ref={ref} className="postcard" style={{ width, height }} aria-hidden />;
}
