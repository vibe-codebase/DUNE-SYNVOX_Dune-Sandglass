/**
 * Sandglass sound, synthesised with Web Audio: a plucked oud and a soft frame drum in the Hijaz mode, with a
 * breath of wind; the hiss of sand pouring, louder as more grains move; the clink of the glass case as it
 * turns; a glass note as each vial comes right, a cork's pop, and a cascade of plucks when every vial is done.
 */
const semis = (root: number, n: number) => root * Math.pow(2, n / 12);
/** Hijaz: the augmented second between the second and third gives its desert colour. */
const HIJAZ = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16, 17, 19];
const ROOTS = [146.83, 164.81, 130.81];

export class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private sfx!: GainNode;
  private verb!: ConvolverNode;
  private noise!: AudioBuffer;
  private pour: { g: GainNode; bp: BiquadFilterNode } | null = null;
  private timer: number | null = null;
  private next = 0;
  private beatN = 0;
  private chapter = 0;
  private seed = 9;
  private musicVol = 0.6;
  private sfxVol = 0.8;
  private ducked = false;
  private strings = new Map<number, AudioBuffer>();

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain(); this.master.gain.value = 0.9;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
      this.master.connect(comp).connect(ctx.destination);
      this.music = ctx.createGain(); this.sfx = ctx.createGain();
      this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.6);
      const wet = ctx.createGain(); wet.gain.value = 0.3;
      this.verb.connect(wet).connect(this.master);
      this.music.connect(this.master); this.music.connect(this.verb);
      this.sfx.connect(this.master); this.sfx.connect(this.verb);
      this.noise = this.makeNoise();
      // the pour: noise through a band that rises with the flow
      const src = ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 0.8;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(hp).connect(bp).connect(g).connect(this.sfx); src.start();
      this.pour = { g, bp };
      // a little wind in the room
      const w = ctx.createBufferSource(); w.buffer = this.noise; w.loop = true; w.playbackRate.value = 0.5;
      const wl = ctx.createBiquadFilter(); wl.type = 'lowpass'; wl.frequency.value = 600;
      const wg = ctx.createGain(); wg.gain.value = 0.008;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = 0.006; lfo.connect(lg).connect(wg.gain); lfo.start();
      w.connect(wl).connect(wg).connect(this.music); w.start();
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }
  setVolumes(music: number, sfx: number) { this.musicVol = music; this.sfxVol = sfx; this.applyVolumes(); }
  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.music.gain.setTargetAtTime(this.musicVol * 0.6 * (this.ducked ? 0.6 : 1), t, 0.3);
    this.sfx.gain.setTargetAtTime(this.sfxVol, t, 0.05);
  }
  duck(on: boolean) { this.ducked = on; this.applyVolumes(); }
  suspend() { void this.ctx?.suspend(); }
  resume() { if (this.ctx?.state === 'suspended') void this.ctx.resume(); }
  /** How much sand is moving, 0..1. */
  setPour(v: number) { if (this.ctx && this.pour) { const t = this.ctx.currentTime; this.pour.g.gain.setTargetAtTime(v > 0.005 ? 0.015 + v * 0.06 : 0, t, 0.06); this.pour.bp.frequency.setTargetAtTime(2200 + v * 3000, t, 0.1); } }

  startMusic(chapter: number) {
    if (!this.ctx) return;
    if (this.timer !== null && chapter === this.chapter) return;
    this.chapter = chapter;
    this.next = this.ctx.currentTime + 0.4;
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 150);
  }
  private rnd() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  /** A slow maqsum-like pulse on the frame drum, and the oud wandering the mode. */
  private schedule() {
    const ctx = this.ctx!;
    const step = 60 / 72 / 2;
    const root = ROOTS[this.chapter % 3];
    const drum = [1, 0, 0, 2, 0, 0, 1, 0, 2, 0, 0, 0, 1, 0, 2, 0];
    let deg = 4;
    while (this.next < ctx.currentTime + 0.8) {
      const t = this.next, pos = this.beatN % 16;
      if (drum[pos] === 1) this.doum(t); else if (drum[pos] === 2) this.tek(t);
      if (pos % 2 === 0 && this.rnd() < 0.5) { deg = Math.max(0, Math.min(HIJAZ.length - 1, deg + Math.floor(this.rnd() * 5) - 2)); this.pluck(t, semis(root * 2, HIJAZ[deg]), 0.035, this.music); }
      if (pos === 0 && Math.floor(this.beatN / 16) % 2 === 0) this.pluck(t, root, 0.05, this.music);
      this.next += step; this.beatN++;
    }
  }
  private doum(t: number) { const ctx = this.ctx!, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.18); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g).connect(this.music); o.start(t); o.stop(t + 0.4); }
  private tek(t: number) { this.hiss(t, 0.06, 0.02, 2600, 2, this.music); }
  private pluck(t: number, f: number, vol: number, bus: GainNode) {
    const ctx = this.ctx!;
    const key = Math.round(f * 10);
    let buf = this.strings.get(key);
    if (!buf) {
      const sr = ctx.sampleRate, n = Math.floor(sr * 1.6), period = Math.round(sr / f);
      buf = ctx.createBuffer(1, n, sr);
      const d = buf.getChannelData(0);
      for (let i = 0; i < period; i++) d[i] = (Math.random() * 2 - 1) * 0.7;
      for (let i = period; i < n; i++) d[i] = 0.496 * (d[i - period] + d[i - period + 1]);
      this.strings.set(key, buf);
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(lp).connect(g).connect(bus); src.start(t);
  }
  private hiss(t: number, dur: number, vol: number, freq: number, q = 1, bus?: GainNode) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource(); src.buffer = this.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q; bp.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.01, dur / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(bus ?? this.sfx); src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  private glassNote(t: number, f: number, vol: number, dur = 1.8) {
    const ctx = this.ctx!;
    [[1, 1], [2.32, 0.3], [4.25, 0.12]].forEach(([m, v]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / m);
      o.connect(g).connect(this.sfx); o.start(t); o.stop(t + dur + 0.05);
    });
  }
  /** The case turning: glass and brass knock softly. */
  turn() { if (this.ctx) { const t = this.ctx.currentTime; this.glassNote(t, 1760, 0.012, 0.5); this.hiss(t, 0.25, 0.015, 600, 0.7); } }
  /** A vial comes right. */
  vial(i: number) { if (this.ctx) { const root = ROOTS[this.chapter % 3] * 4; this.glassNote(this.ctx.currentTime, semis(root, HIJAZ[(i * 2 + 4) % HIJAZ.length]), 0.05); } }
  cork() { if (this.ctx) { const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.06); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.1); } }
  tap() { if (this.ctx) this.glassNote(this.ctx.currentTime, 2093, 0.01, 0.4); }
  undo() { if (this.ctx) { const t = this.ctx.currentTime; this.hiss(t, 0.3, 0.025, 3500, 1.5); } }
  hint() { if (this.ctx) { const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3] * 2; this.pluck(t, semis(root, 7), 0.05, this.sfx); this.pluck(t + 0.1, semis(root, 12), 0.04, this.sfx); } }
  stuck() { if (this.ctx) { const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3]; this.pluck(t, semis(root, 1), 0.05, this.sfx); this.pluck(t + 0.18, root, 0.05, this.sfx); } }
  win(stars: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, root = ROOTS[this.chapter % 3] * 2;
    [0, 4, 5, 7, 8, 12].forEach((d, i) => this.pluck(t + i * 0.09, semis(root, d), 0.05, this.sfx));
    [0, 7, 12, 16].slice(0, 1 + stars).forEach((d, i) => this.glassNote(t + 0.7 + i * 0.12, semis(root * 2, d), 0.04, 2.5));
  }
  star(i: number) { if (this.ctx) this.glassNote(this.ctx.currentTime, [1174.7, 1396.9, 1760][i] ?? 1760, 0.05, 1.6); }

  private makeNoise() {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  private impulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    return b;
  }
}
export const sound = new Sound();
