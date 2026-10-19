import type { Level as Spec } from './sim';
import DATA from './levels.json';

export type Level = Spec & { id: string; name: string; chapter: number; hint?: string; par: number; answer: string };
export const CHAPTERS = [
  { name: 'Dunes', short: 'Dunes', blurb: 'Hoppers of coloured sand and glass vials. Turn the case and let the sand find its way.' },
  { name: 'Sieves', short: 'Sieves', blurb: 'Brass sieves let only the fine white sand through. The coarse sand must go another way.' },
  { name: 'Corks', short: 'Corks', blurb: 'A full vial is corked at once, and keeps what it has. Fill each one with care.' },
];
const NAMES: [string, string, string?][] = [
  ['d1', 'First Pour', 'Swipe left or right, or use the arrows, to turn the case a quarter turn. The sand falls the new way down.'],
  ['d2', 'Two Sands', 'Fill each vial to its dotted line, with the layers shown faintly inside it.'],
  ['d3', 'Saffron'], ['d4', 'Caravan'], ['d5', 'Mirage'], ['d6', 'Erg'], ['d7', 'Wadi'], ['d8', 'Sandstorm'],
  ['s1', 'Fine Sand', 'Only the fine white sand passes a brass sieve.'],
  ['s2', 'Flour'], ['s3', 'Winnow'], ['s4', 'Riddle'], ['s5', 'Chaff'], ['s6', 'Silt'], ['s7', 'Strata'], ['s8', 'Alluvium'],
  ['c1', 'Stopper', 'A vial is corked the moment it is full. After that, nothing gets in or out.'],
  ['c2', 'Keepsake'], ['c3', 'Apothecary'], ['c4', 'Spice Market'], ['c5', 'Hourglass'], ['c6', 'Souvenir'], ['c7', 'Cabinet'], ['c8', 'Collection'],
];
const D = DATA as unknown as Record<string, Spec & { par: number; answer: string }>;
/** Within each chapter the levels come in order of par; names and first hints follow their place. */
const ORDER = [0, 1, 2].flatMap((c) => NAMES.slice(c * 8, c * 8 + 8).map(([id]) => id).filter((id) => D[id]).sort((a, b) => D[a].par - D[b].par || a.localeCompare(b)));
export const LEVELS: Level[] = ORDER.map((id) => { const i = NAMES.findIndex(([x]) => x[0] === id[0]) + ORDER.filter((x) => x[0] === id[0]).indexOf(id); const [, name, hint] = NAMES[i]; return { ...D[id], id, name, hint, chapter: id[0] === 'd' ? 0 : id[0] === 's' ? 1 : 2 }; });
export const levelIndex = (id: string) => LEVELS.findIndex((l) => l.id === id);
