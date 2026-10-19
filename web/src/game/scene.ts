import Phaser from 'phaser';
import * as A from './art';
import { LEVELS, type Level } from './levels';
import { clone, layers, load, matches, N, seal, settle, solve, solvedBy, starsFor, step, turnLeft, turnRight, type World } from './sim';
import { sound } from '../audio/sound';

export type Result = { turns: number; par: number; stars: number; hinted: boolean };
export type Finish = { level: Level; result: Result };
type Hooks = { onFinish?: (f: Finish) => void; onFirstAction?: () => void; onHaptic?: (s: 'light' | 'medium' | 'success' | 'warning') => void };
export type HudState = { phase: 'idle' | 'busy' | 'done'; turns: number; par: number; done: number; total: number; canUndo: boolean; hints: number; stuck: boolean; hintDir: 'L' | 'R' | null; msg: string; msgId: number };

/** Bridge between React and the Phaser scene. */
export const tray = {
  hooks: {} as Hooks,
  scene: null as SandScene | null,
  reducedMotion: false,
  show(mode: 'menu' | 'play', level: Level) { this.scene?.show(mode, level); },
  setPaused(p: boolean) { this.scene?.setPaused(p); },
  state(): HudState | null { return this.scene?.hudState() ?? null; },
  turn(d: 'L' | 'R') { this.scene?.turn(d, true); },
  undo() { this.scene?.undo(); },
  hint() { this.scene?.hint(); },
  restart() { this.scene?.restart(); },
  debug() { return this.scene?.debugState(); },
  /** QA only: the board's centre and size in CSS pixels. */
  qaBoard() { return this.scene?.qaBoard(); },
};
(window as unknown as { __sand: typeof tray }).__sand = tray;

const VIEW_W = 360;
const SHOWCASE = ['c6', 's7', 'd8', 's5', 'c8', 'd7'];
const STEPS_PER_FRAME = 3;

export class SandScene extends Phaser.Scene {
  level: Level = LEVELS[0];
  private mode: 'menu' | 'play' = 'menu';
  private phase: 'idle' | 'turning' | 'pouring' | 'done' = 'idle';
  private paused = false;
  private acted = false;
  private texSeq = 0;
  private r = 2;
  private viewW = VIEW_W; private viewH = 700;
  private B = 320; private cs = 6; private cx = 180; private cy = 320;
  private world!: World;
  private history: { w: World; turns: number; angle: number }[] = [];
  private turns = 0;
  private hints = 0;
  private angle = 0;
  private queued: 'L' | 'R' | null = null;
  private msg = ''; private msgId = 0;
  private clock = 0;
  private box!: Phaser.GameObjects.Container;
  private sandTex!: Phaser.Textures.CanvasTexture;
  private sandImg!: ImageData;
  private grain!: Float32Array;
  private fixImg!: Phaser.GameObjects.Image;
  private fx!: Phaser.GameObjects.Graphics;
  private moved = new Uint8Array(N * N);
  private still = 0;
  private dirty = true;
  private vialOk: boolean[] = [];
  private stuck = false;
  private hintDir: 'L' | 'R' | null = null; private hintT = -9;
  private demo: { k: number; wait: number } | null = null;
  private down: { x: number; y: number } | null = null;
  private sealedSeen = 0;
  private sparkles: { x: number; y: number; t: number }[] = [];

  constructor() { super('sand'); }

  create() {
    tray.scene = this;
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { this.down = { x: p.x, y: p.y }; });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.swipe(p));
    this.scale.on('resize', () => this.rebuild());
    this.show('menu', LEVELS.find((l) => l.id === SHOWCASE[0]) ?? LEVELS[LEVELS.length - 1]);
  }
  isMenu() { return this.mode === 'menu'; }
  setPaused(p: boolean) { this.paused = p; }
  hudState(): HudState {
    const busy = this.phase === 'turning' || this.phase === 'pouring';
    return { phase: this.phase === 'done' ? 'done' : busy ? 'busy' : 'idle', turns: this.turns, par: this.level.par, done: this.vialOk.filter(Boolean).length, total: this.level.vials.length, canUndo: this.history.length > 0 && this.phase !== 'done', hints: this.hints, stuck: this.stuck, hintDir: this.clock - this.hintT < 4 ? this.hintDir : null, msg: this.msg, msgId: this.msgId };
  }
  debugState() { return { ...this.hudState(), mode: this.mode, grav: this.world.grav, angle: this.angle, layers: this.level.vials.map((v) => layers(this.world, v)) }; }
  qaBoard() { const z = this.cameras.main.zoom, kk = (this.game.canvas.clientWidth || VIEW_W) / this.scale.width; return { x: this.cx * z * kk, y: this.cy * z * kk, size: this.B * z * kk }; }
  private say(m: string) { this.msg = m; this.msgId++; }

  show(mode: 'menu' | 'play', level: Level) {
    this.mode = mode; this.level = level;
    this.paused = false; this.acted = false; this.phase = 'idle';
    this.world = load(level); settle(this.world, level);
    this.history = []; this.turns = 0; this.hints = 0; this.angle = 0; this.queued = null; this.msg = '';
    this.stuck = false; this.hintDir = null; this.sealedSeen = 0; this.sparkles = [];
    this.vialOk = level.vials.map(() => false);
    this.demo = mode === 'menu' ? { k: 0, wait: 1.6 } : null;
    this.rebuild();
  }
  restart() { if (this.mode === 'play') this.show('play', this.level); }

  // ── layout ────────────────────────────────────────────────────────────
  private tex(prefix: string, c: HTMLCanvasElement) { const key = `${prefix}-${++this.texSeq}`; this.textures.addCanvas(key, c); return key; }
  private rebuild() {
    const stale = this.textures.getTextureKeys().filter((k) => /-\d+$/.test(k));
    this.tweens.killAll();
    this.children.removeAll(true);
    if (stale.length) this.events.once('postrender', () => stale.forEach((k) => this.textures.exists(k) && this.textures.remove(k)));
    const pw = this.scale.width, ph = this.scale.height, dpr = Math.min(2, window.devicePixelRatio || 1);
    const zoom = Math.min(pw / VIEW_W, ph / 640);
    this.r = Math.min(2, Math.max(1, zoom));
    this.viewW = pw / zoom; this.viewH = ph / zoom;
    this.cameras.main.setZoom(zoom).centerOn(this.viewW / 2, this.viewH / 2);
    const css = zoom / dpr, play = this.mode === 'play';
    const top = (play ? 72 : 236) / css, bottom = (play ? 150 : 196) / css;
    const W = this.viewW, H = this.viewH, m = A.MOODS[this.level.chapter], r = this.r;
    // the case is square; it has to fit turned any way, so its size is the smaller of the width and the height left
    this.B = Math.max(160, Math.min(W - 44, H - top - bottom - 24, 520));
    this.cx = W / 2; this.cy = top + 12 + (H - top - bottom - 24) / 2;
    this.cs = Math.max(3, Math.min(10, Math.round((this.B / N) * r)));
    this.add.image(0, 0, this.tex('room', A.room(m, W, H, this.cx, this.cy, this.B, Math.min(r, 1.25)))).setOrigin(0, 0).setScale(1 / Math.min(r, 1.25));
    // the turning case: backing, sand, fixtures, glass
    this.box = this.add.container(this.cx, this.cy).setRotation(this.angle);
    const back = A.caseBack(m, this.B, r);
    this.box.add(this.add.image(0, 0, this.tex('back', back)).setScale(1 / r));
    const key = `sand-${++this.texSeq}`, S = N * this.cs;
    this.sandTex = this.textures.createCanvas(key, S, S)!;
    this.sandImg = this.sandTex.getContext().createImageData(S, S);
    this.grain = A.grainTable(this.cs);
    this.box.add(this.add.image(0, 0, key).setScale(this.B / S));
    this.fixImg = this.add.image(0, 0, '__DEFAULT');
    this.box.add(this.fixImg);
    this.paintFixtures();
    this.box.add(this.add.image(0, 0, this.tex('glass', A.caseGlass(this.B, r))).setScale(1 / r));
    this.fx = this.add.graphics();
    this.box.add(this.fx);
    this.dirty = true;
  }
  private paintFixtures() {
    const k = this.tex('fix', A.fixtures(A.MOODS[this.level.chapter], this.level, this.world, this.B / N, this.r));
    this.fixImg.setTexture(k).setScale(1 / this.r);
    // corks on sealed vials
    this.level.vials.forEach((v, i) => {
      if (!this.world.sealed[i]) return;
      const c = this.B / N, len = v.mouth === 0 || v.mouth === 2 ? v.w : v.h;
      const img = this.add.image(0, 0, this.tex('cork', A.cork(len + 2, c, this.r))).setScale(1 / this.r);
      const mx = v.mouth === 1 ? v.x - 1 : v.mouth === 3 ? v.x + v.w : v.x + v.w / 2, my = v.mouth === 0 ? v.y + v.h : v.mouth === 2 ? v.y - 1 : v.y + v.h / 2;
      img.setPosition((mx + (v.mouth === 1 || v.mouth === 3 ? 0.5 : 0)) * c - this.B / 2, (my + (v.mouth === 0 || v.mouth === 2 ? 0.5 : 0)) * c - this.B / 2).setRotation(v.mouth === 1 || v.mouth === 3 ? Math.PI / 2 : 0);
      this.box.add(img);
    });
  }

  // ── turning ───────────────────────────────────────────────────────────
  private swipe(p: Phaser.Input.Pointer) {
    const d = this.down; this.down = null;
    if (!d || this.mode !== 'play') return;
    const z = this.cameras.main.zoom, dx = (p.x - d.x) / z, dy = (p.y - d.y) / z;
    if (Math.abs(dx) > 34 && Math.abs(dx) > Math.abs(dy) * 1.2) this.turn(dx > 0 ? 'R' : 'L', true);
  }
  turn(dir: 'L' | 'R', byPlayer = false) {
    if (this.paused || this.phase === 'done') return;
    if (byPlayer && this.mode !== 'play') return;
    if (this.phase !== 'idle') { if (byPlayer && !this.queued) this.queued = dir; return; }
    if (byPlayer && !this.acted) { this.acted = true; tray.hooks.onFirstAction?.(); }
    if (this.mode === 'play') this.history.push({ w: clone(this.world), turns: this.turns, angle: this.angle });
    this.turns++; this.stuck = false; this.hintDir = null;
    this.phase = 'turning';
    const to = this.angle + (dir === 'R' ? Math.PI / 2 : -Math.PI / 2), from = this.angle;
    this.angle = to;
    sound.turn(); tray.hooks.onHaptic?.('light');
    let switched = false;
    const o = { t: 0 };
    this.tweens.add({
      targets: o, t: 1, duration: this.reduced() ? 160 : 480, ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.box.setRotation(from + (to - from) * o.t);
        // the sand lets go as the case passes halfway
        if (!switched && o.t > 0.45) { switched = true; this.world.grav = dir === 'R' ? turnRight(this.world.grav) : turnLeft(this.world.grav); this.phase = 'pouring'; this.still = 0; }
      },
      onComplete: () => { this.box.setRotation(to); if (!switched) { this.world.grav = dir === 'R' ? turnRight(this.world.grav) : turnLeft(this.world.grav); this.phase = 'pouring'; } },
    });
  }
  undo() {
    if (this.mode !== 'play' || this.phase === 'done' || this.phase === 'turning' || !this.history.length) return;
    const h = this.history.pop()!;
    this.world = h.w; this.turns = h.turns; this.queued = null; this.stuck = false; this.hintDir = null;
    const from = this.angle; this.angle = h.angle;
    this.tweens.add({ targets: this.box, rotation: { from, to: h.angle }, duration: this.reduced() ? 120 : 300, ease: 'Sine.easeInOut' });
    this.phase = 'idle'; this.dirty = true;
    this.sealedSeen = this.world.sealed.filter(Boolean).length;
    this.paintFixtures(); this.checkVials(false);
    sound.undo();
  }
  hint() {
    if (this.mode !== 'play' || this.phase !== 'idle') return;
    const path = solve(this.level, this.world, Math.min(8, Math.max(4, this.level.par - this.turns + 3)));
    if (!path) { this.stuck = true; this.say('There is no way to the pattern from here. Undo, or start again.'); sound.stuck(); return; }
    if (!path.length) return;
    this.hints++; this.hintDir = path[0]; this.hintT = this.clock;
    this.say(path.length === 1 ? `One turn ${path[0] === 'L' ? 'left' : 'right'} to finish.` : `Turn ${path[0] === 'L' ? 'left' : 'right'} next. ${path.length} turns to go.`);
    sound.hint();
  }
  private reduced() { return tray.reducedMotion; }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.clock += dt;
    if (this.mode === 'menu') this.runDemo(dt);
    if (!this.paused && (this.phase === 'pouring' || this.phase === 'turning')) {
      let n = 0;
      for (let k = 0; k < (this.reduced() ? 8 : STEPS_PER_FRAME); k++) { n += step(this.world, this.moved); seal(this.world, this.level); }
      const sealed = this.world.sealed.filter(Boolean).length;
      if (sealed > this.sealedSeen) { this.sealedSeen = sealed; this.paintFixtures(); sound.cork(); tray.hooks.onHaptic?.('medium'); }
      sound.setPour(Math.min(1, n / 120));
      if (n) this.dirty = true;
      if (this.phase === 'pouring') { this.still = n ? 0 : this.still + 1; if (this.still > 1) this.settled(); }
    } else sound.setPour(0);
    if (this.dirty) { A.paintSand(this.sandImg, this.world, this.cs, this.grain, 0); this.sandTex.getContext().putImageData(this.sandImg, 0, 0); this.sandTex.refresh(); this.dirty = false; }
    this.draw(dt);
  }
  private settled() {
    this.phase = 'idle';
    this.checkVials(true);
    if (solvedBy(this.world, this.level)) { this.win(); return; }
    if (this.queued) { const q = this.queued; this.queued = null; this.turn(q, true); return; }
    // a quiet look ahead: is the pattern still reachable from here?
    if (this.mode === 'play') {
      const at = this.turns;
      this.time.delayedCall(60, () => {
        if (this.phase !== 'idle' || this.turns !== at) return;
        const p = solve(this.level, this.world, 6);
        if (!p && this.turns === at) { this.stuck = true; this.say('The sand can no longer make the pattern. Undo, or start again.'); sound.stuck(); tray.hooks.onHaptic?.('warning'); }
      });
    }
  }
  private checkVials(sounds: boolean) {
    this.level.vials.forEach((v, i) => {
      const ok = matches(layers(this.world, v), v.target);
      if (ok && !this.vialOk[i] && sounds) { sound.vial(i); for (let k = 0; k < 8; k++) this.sparkles.push({ x: v.x + Math.random() * v.w, y: v.y + Math.random() * v.h, t: -k * 0.05 }); }
      this.vialOk[i] = ok;
    });
  }
  private win() {
    this.phase = 'done';
    const st = Math.min(starsFor(this.turns, this.level.par), this.hints ? 2 : 3);
    sound.win(st); tray.hooks.onHaptic?.('success');
    this.level.vials.forEach((v) => { for (let k = 0; k < 14; k++) this.sparkles.push({ x: v.x + Math.random() * v.w, y: v.y + Math.random() * v.h, t: -Math.random() * 0.6 }); });
    if (this.mode === 'play') this.time.delayedCall(1700, () => tray.hooks.onFinish?.({ level: this.level, result: { turns: this.turns, par: this.level.par, stars: st, hinted: this.hints > 0 } }));
  }
  private draw(dt: number) {
    const fx = this.fx, c = this.B / N, o = -this.B / 2;
    fx.clear();
    // a vial that is right glows at its rim
    this.level.vials.forEach((v, i) => {
      if (!this.vialOk[i]) return;
      const a = 0.45 + 0.25 * Math.sin(this.clock * 3 + i);
      fx.lineStyle(1.6, 0xfff0c0, a); fx.strokeRoundedRect(o + (v.x - 1) * c, o + (v.y - 1) * c, (v.w + 2) * c, (v.h + 2) * c, 2);
    });
    this.sparkles = this.sparkles.filter((s) => (s.t += dt) < 0.9);
    for (const s of this.sparkles) { if (s.t < 0) continue; const e = s.t / 0.9, a = Math.sin(e * Math.PI); fx.fillStyle(0xffffff, a); fx.fillCircle(o + s.x * c, o + s.y * c, 1 + a * 1.2); fx.lineStyle(0.8, 0xffffff, a * 0.6); fx.lineBetween(o + s.x * c - 4 * a, o + s.y * c, o + s.x * c + 4 * a, o + s.y * c); fx.lineBetween(o + s.x * c, o + s.y * c - 4 * a, o + s.x * c, o + s.y * c + 4 * a); }
  }

  // ── attract mode: the answer, turn by turn ────────────────────────────
  private runDemo(dt: number) {
    const d = this.demo; if (!d || this.phase !== 'idle') return;
    d.wait -= dt; if (d.wait > 0) return;
    const ans = this.level.answer;
    if (d.k < ans.length) { this.turn(ans[d.k++] as 'L' | 'R'); d.wait = 0.7; return; }
    const i = (SHOWCASE.indexOf(this.level.id) + 1) % SHOWCASE.length;
    this.show('menu', LEVELS.find((x) => x.id === SHOWCASE[i]) ?? LEVELS[0]);
  }
}

export function startGame(parent: HTMLElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#2a1d16',
    scale: { mode: Phaser.Scale.NONE, width: parent.clientWidth * dpr, height: parent.clientHeight * dpr, zoom: 1 / dpr },
    render: { antialias: true, pixelArt: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    fps: { target: 60, smoothStep: false },
    input: { activePointers: 1 },
    scene: [SandScene],
    banner: false,
  });
  const onResize = () => {
    const d = Math.min(window.devicePixelRatio || 1, 2);
    game.scale.setZoom(1 / d);
    game.scale.resize(parent.clientWidth * d, parent.clientHeight * d);
  };
  window.addEventListener('resize', onResize);
  return () => { window.removeEventListener('resize', onResize); game.destroy(true); };
}
