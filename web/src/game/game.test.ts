import { describe, expect, it } from 'vitest';
import { clone, FINE, hash, layers, load, matches, N, settle, solve, solvedBy, starsFor, step, turn, type Level } from './sim';
import { CHAPTERS, LEVELS, levelIndex } from './levels';
import { freshSave, isUnlocked, parseSave, recordResult, totalStars } from '../state/save';

const row = (s: string) => s.padEnd(N, '.');
/** A tiny level: one hopper of saffron above an upright vial. */
function tiny(): Level {
  const solid = Array(N * N).fill('.'), sand = Array(N * N).fill('0');
  for (let y = 5; y < 9; y++) for (let x = 20; x < 26; x++) sand[y * N + x] = '2';
  return { solid: solid.join(''), sand: sand.join(''), vials: [{ x: 20, y: 30, w: 6, h: 8, mouth: 2, target: [[2, 4]] }], start: 0 };
}

describe('levels', () => {
  it('has 24 levels in three chapters of eight, with unique ids and names', () => {
    expect(LEVELS).toHaveLength(24);
    expect(CHAPTERS).toHaveLength(3);
    for (let c = 0; c < 3; c++) expect(LEVELS.filter((l) => l.chapter === c)).toHaveLength(8);
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(24);
    expect(new Set(LEVELS.map((l) => l.name)).size).toBe(24);
    expect(levelIndex('s1')).toBe(8);
  });
  it('chapters bring sieves, then corks', () => {
    expect(LEVELS.filter((l) => l.chapter === 0).every((l) => !l.solid.includes(':') && l.vials.every((v) => !v.seal))).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 1).every((l) => l.solid.includes(':') && l.sand.includes(String(FINE)))).toBe(true);
    expect(LEVELS.filter((l) => l.chapter === 2).every((l) => l.vials.every((v) => v.seal))).toBe(true);
  });
});

describe('solutions', () => {
  for (const l of LEVELS) {
    it(`${l.id} ${l.name}: the answer fills every vial, in par turns, and nothing shorter does`, () => {
      const w = load(l); settle(w, l);
      expect(solvedBy(w, l)).toBe(false);
      for (const m of l.answer) turn(w, l, m as 'L' | 'R');
      expect(solvedBy(w, l)).toBe(true);
      expect(l.answer.length).toBe(l.par);
      if (l.par > 1) expect(solve(l, undefined, l.par - 1)).toBeNull();
    });
  }
  it('the sand at rest stays in its hoppers: nothing moves before the first turn', () => {
    for (const l of LEVELS) { const w = load(l); expect(settle(w, l), l.id).toBe(0); }
  });
});

describe('sand', () => {
  it('falls, piles, and keeps every grain', () => {
    const l = tiny(), w = load(l), before = w.sand.filter(Boolean).length;
    settle(w, l);
    expect(w.sand.filter(Boolean).length).toBe(before);
    expect(layers(w, l.vials[0])[0][0]).toBe(2);
  });
  it('is deterministic', () => {
    const l = LEVELS[5], a = load(l), b = load(l);
    for (const m of 'LRLR') { turn(a, l, m as 'L'); turn(b, l, m as 'L'); }
    expect(hash(a)).toBe(hash(b));
  });
  it('a sieve lets only fine sand through', () => {
    const solid = Array(N * N).fill('.'), sand = Array(N * N).fill('0');
    for (let x = 0; x < N; x++) solid[20 * N + x] = ':';
    sand[10 * N + 5] = '2'; sand[10 * N + 9] = String(FINE);
    const l: Level = { solid: solid.join(''), sand: sand.join(''), vials: [], start: 0 }, w = load(l);
    settle(w, l);
    expect(w.sand[19 * N + 5]).toBe(2);
    expect(w.sand[(N - 1) * N + 9]).toBe(FINE);
  });
  it('turning swings gravity round: four quarter turns come back', () => {
    const l = tiny(), w = load(l); const g0 = w.grav;
    for (let k = 0; k < 4; k++) turn(w, l, 'L');
    expect(w.grav).toBe(g0);
    const c = clone(w); step(c); expect(c.grav).toBe(w.grav);
  });
  it('layers match within a row either way', () => {
    expect(matches([[2, 4], [3, 3]], [[2, 4], [3, 3]])).toBe(true);
    expect(matches([[2, 5], [3, 3]], [[2, 4], [3, 3]])).toBe(true);
    expect(matches([[3, 3], [2, 4]], [[2, 4], [3, 3]])).toBe(false);
    expect(matches([[2, 4]], [[2, 4], [3, 3]])).toBe(false);
    void row;
  });
});

describe('stars and save', () => {
  it('stars follow par', () => { expect(starsFor(3, 3)).toBe(3); expect(starsFor(5, 3)).toBe(2); expect(starsFor(6, 3)).toBe(1); });
  it('records the fewest turns and unlocks the next case', () => {
    let s = freshSave();
    expect(isUnlocked(s, 1)).toBe(false);
    s = recordResult(s, 'd1', 2, 4); s = recordResult(s, 'd1', 1, 6);
    expect(s.stars.d1).toBe(2); expect(s.best.d1).toBe(4); expect(isUnlocked(s, 1)).toBe(true); expect(totalStars(s)).toBe(2);
  });
  it('parses corrupt saves safely', () => { expect(parseSave('x')).toEqual(freshSave()); });
});
