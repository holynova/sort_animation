const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);

export class Soundtrack {
  constructor(world) {
    this.world = world;
    this.enabled = true;
    this.active = false;
    this.lastNote = -1;
  }
  unlock() {
    if (!this.enabled) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    if (!this.ctx) {
      this.ctx = new Audio();
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.55;
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -16;
      this.limiter.ratio.value = 5;
      this.master.connect(this.limiter).connect(ctx.destination);
      this.delay = ctx.createDelay(1);
      this.feedback = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.frequency.value = 2200;
      this.delay.connect(filter).connect(this.feedback).connect(this.delay);
      this.feedback.connect(this.master);
      const size = Math.floor(ctx.sampleRate * 0.3);
      this.noise = ctx.createBuffer(1, size, ctx.sampleRate);
      const samples = this.noise.getChannelData(0);
      for (let i = 0; i < size; i++) samples[i] = Math.random() * 2 - 1;
      this.setWorld(this.world);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }
  setWorld(world) {
    this.world = world;
    this.lastNote = -1;
    if (!this.ctx) return;
    this.delay.delayTime.setTargetAtTime(45 / world.bpm, this.ctx.currentTime, 0.015);
    this.feedback.gain.value = world.id === 'abyss' ? 0.37 : 0.23;
  }
  level(loud) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(loud && this.enabled ? 0.55 : 0, t, 0.017);
  }
  start() {
    this.active = true;
    this.unlock();
    this.level(true);
    this.lastNote = -1;
  }
  stop() { this.active = false; this.level(false); }
  tone(midi, wave, duration, volume, at, pan = 0, echo = false, attack = 0.009, glide = 0) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const stereo = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
    if (stereo.pan) stereo.pan.value = Math.min(1, Math.max(-1, pan));
    osc.type = wave;
    osc.frequency.setValueAtTime(hz(midi), at);
    if (glide) osc.frequency.exponentialRampToValueAtTime(hz(midi + glide), at + duration * 0.82);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(stereo).connect(this.master);
    if (echo) stereo.connect(this.delay);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); stereo.disconnect(); };
    osc.start(at);
    osc.stop(at + duration + 0.02);
  }
  hat(t, strength) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    src.buffer = this.noise;
    filter.type = 'highpass';
    filter.frequency.value = this.world.id === 'solar' ? 5300 : 7200;
    gain.gain.setValueAtTime(strength, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(filter).connect(gain).connect(this.master);
    src.onended = () => { src.disconnect(); gain.disconnect(); filter.disconnect(); };
    src.start(t);
    src.stop(t + 0.1);
  }
  beat(tick, progress) {
    if (!this.ctx || !this.enabled || !this.active) return;
    const t = this.ctx.currentTime + 0.008;
    const w = this.world, bar = Math.floor(tick / 16);
    const offset = [0, -5, -2, -7][bar % 4];
    const bass = w.root + offset - 12;
    const step = tick % 16;
    if (step === 0) {
      const length = 215 / w.bpm;
      [0, w.scale[2], 7].forEach((n, i) => this.tone(bass + 12 + n, 'sine', length, .046, t, (i - 1) * .58, true, .13));
    }
    const kick = w.id === 'abyss' ? step === 0 || step === 10 : step % 4 === 0;
    if (kick) this.tone(45, 'sine', .22, w.id === 'solar' ? .37 : .25, t, 0, false, .004, -16);
    if (step === 0 || step === 8 || (progress > .5 && step === 14)) {
      this.tone(bass + (step === 14 ? 7 : 0), w.id === 'solar' ? 'triangle' : 'sine', .46, .15, t);
    }
    if (step % 4 === 2 || (progress > .66 && step % 2 === 1)) this.hat(t, w.id === 'abyss' ? .025 : .055);
    if (w.id === 'solar' && (step === 4 || step === 12)) this.hat(t, .12);
  }
  note(value, position, kind, tick, single = false) {
    if (!this.ctx || !this.enabled || (!single && (!this.active || this.lastNote === tick))) return;
    this.lastNote = tick;
    if (single) this.level(true);
    const w = this.world, t = this.ctx.currentTime + 0.008;
    const degree = Math.min(13, Math.max(0, Math.floor(value * 14)));
    const midi = w.root + 7 + w.scale[degree % 5] + Math.floor(degree / 5) * 12;
    const strong = kind !== 'compare';
    const length = w.id === 'abyss' ? .85 : w.id === 'solar' ? .21 : .47;
    this.tone(midi, strong ? w.wave : 'sine', length, strong ? .13 : .065, t, position * 1.4 - .7, true);
    if (strong && w.id !== 'solar') this.tone(midi + (w.id === 'abyss' ? 19 : 12), 'sine', length * .48, .034, t);
  }
  finish() {
    if (!this.ctx || !this.enabled) return;
    this.level(true);
    const t = this.ctx.currentTime + .02;
    const w = this.world;
    [0, w.scale[2], 7, 12, 12 + w.scale[2], 19, 24].forEach((n, i) => {
      this.tone(w.root + n, w.wave, 1.12, .12, t + i * .075, i / 6 - .5, true);
    });
  }
}
