// Each event plays a short phrase in the same pentatonic scale as the other events.
const notes = [0, 2, 4, 7, 9];
function pitch(value, max) {
  const degree = Math.round(((value - 1) * 10) / Math.max(1, max - 1));
  return 220 * 2 ** ((notes[degree % 5] + Math.floor(degree / 5) * 12) / 12);
}

export class StepSound {
  enabled = false;
  async toggle() {
    if (this.enabled) {
      this.enabled = false;
      this.quiet();
      return;
    }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      this.ctx ??= new Audio();
      await this.ctx.resume();
      this.enabled = this.ctx.state === 'running';
    } catch {
      this.enabled = false;
    }
  }
  quiet() {
    if (!this.bus) return;
    const bus = this.bus,
      now = this.ctx.currentTime;
    bus.gain.setTargetAtTime(0, now, 0.005);
    setTimeout(() => bus.disconnect(), 40);
    this.bus = null;
  }
  play(action, values, max) {
    this.quiet();
    if (!action || !this.enabled || document.hidden) return;
    const ctx = this.ctx,
      now = ctx.currentTime;
    const bus = (this.bus = ctx.createGain());
    bus.connect(ctx.destination);
    const tone = (frequency, at, length, volume, wave = 'sine', end = frequency) => {
      const osc = ctx.createOscillator(),
        env = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(frequency, at);
      osc.frequency.exponentialRampToValueAtTime(end, at + length * 0.7);
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(volume, at + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(env).connect(bus);
      osc.onended = () => {
        osc.disconnect();
        env.disconnect();
      };
      osc.start(at);
      osc.stop(at + length + 0.01);
    };
    const seconds = action.duration / 1000;
    if (action.kind === 'compare') {
      tone(pitch(values[action.i], max), now, 0.14, 0.085);
      tone(pitch(values[action.j], max), now + seconds * 0.43, 0.18, 0.085);
    } else if (action.kind === 'swap') {
      const a = pitch(values[action.i], max),
        b = pitch(values[action.j], max);
      tone(a, now, seconds * 0.56, 0.065, 'triangle', b);
      tone(b, now, seconds * 0.56, 0.065, 'sine', a);
      tone(108, now + seconds * 0.58, 0.16, 0.18, 'sine', 48);
    } else if (action.kind === 'write') {
      const f = pitch(values[action.i], max);
      tone(f * 2, now, seconds * 0.43, 0.075, 'sine', f);
      tone(f, now + seconds * 0.42, 0.28, 0.1, 'triangle');
    }
    if (action.finale || action.kind === 'finish') {
      const start = now + (action.finale ? seconds : 0);
      for (let k = 0; k < 6; k++) {
        const index = Math.round((k * (values.length - 1)) / 5);
        tone(pitch(values[index], max), start + k * 0.1, 0.34, 0.085);
      }
    }
  }
}
