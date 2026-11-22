const clamp = (v, lo, hi) => Math.max(lo, Math.min(v, hi));
const tau = Math.PI * 2;
const tint = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
function hueAt(stops, p) {
  const f = clamp(p, 0, .99999) * (stops.length - 1), i = Math.floor(f);
  const delta = ((stops[i + 1] - stops[i] + 540) % 360) - 180;
  return stops[i] + delta * (f - i);
}
function path(ctx, points, color) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export class Stage {
  constructor(canvas, world, reduced) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.reduced = reduced;
    this.particles = [];
    this.rings = [];
    this.motion = new Map();
    this.dust = Array.from({length: 92}, () => ({
      x: Math.random(), y: Math.random(), seed: Math.random(), size: .45 + Math.random() * 1.05
    }));
    this.setWorld(world);
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
  }
  setWorld(world) {
    this.world = world;
    // Bake the vertical glass faces once for every colour, then scale them per value.
    this.atlas = document.createElement('canvas');
    this.atlas.width = 48 * 24; this.atlas.height = 192;
    const ctx = this.atlas.getContext('2d');
    for (let i = 0; i < 48; i++) {
      const h = hueAt(world.hues, i / 47), x = i * 24;
      const g = ctx.createLinearGradient(0, 0, 0, 192);
      g.addColorStop(0, tint(h, 100, 72, .98));
      g.addColorStop(.12, tint(h, 92, 63, .9));
      g.addColorStop(.65, tint(h, 80, 45, .64));
      g.addColorStop(1, tint(h, 86, 27, .58));
      ctx.fillStyle = g; ctx.fillRect(x, 0, 24, 192);
      const facet = ctx.createLinearGradient(x, 0, x + 24, 0);
      facet.addColorStop(0, '#ffffff5e'); facet.addColorStop(.08, '#ffffff16');
      facet.addColorStop(.76, '#ffffff00'); facet.addColorStop(.77, '#150c412e');
      facet.addColorStop(1, '#0c073a6e');
      ctx.fillStyle = facet; ctx.fillRect(x, 0, 24, 192);
    }
    this.clear();
  }
  clear() {
    this.particles.length = 0; this.rings.length = 0; this.motion.clear();
    this.finale = -1e5; this.kick = -1e5; this.surgeTime = -1e5; this.arc = null;
  }
  resize() {
    const box = this.canvas.getBoundingClientRect();
    this.w = box.width; this.h = box.height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(this.w * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.h * this.dpr));
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.dirty = true;
  }
  geometry(n) {
    const margin = this.w * (this.w < 550 ? .045 : .072);
    const pitch = (this.w - 2 * margin) / n;
    return { margin, pitch, bar: Math.min(54, pitch * (n > 150 ? .86 : .72)),
      base: this.h - (this.w < 550 ? 48 : 54), height: this.h * (this.w < 550 ? .40 : .48) };
  }
  react(event, values, max, time, animate = true) {
    if (!event || this.reduced || !animate) return;
    const { margin, pitch, base, height } = this.geometry(values.length);
    const strong = event.kind !== 'compare';
    const indices = event.i === event.j ? [event.i] : [event.i, event.j];
    for (const i of indices) {
      const x = margin + (i + .5) * pitch, y = base - height * (.055 + .945 * values[i] / max);
      const hue = hueAt(this.world.hues, i / Math.max(1, values.length - 1));
      if (strong) {
        const from = event.kind === 'swap' ? values[i === event.i ? event.j : event.i] : event.previous;
        this.motion.set(i, { time, from });
      }
      const count = strong ? 6 : 2;
      for (let j = 0; j < count; j++) {
        this.particles.push({ x, y, vx: (Math.random() - .5) * (strong ? 120 : 45),
          vy: -22 - Math.random() * (strong ? 110 : 32), birth: time, life: .3 + Math.random() * .65,
          hue, size: .7 + Math.random() * 1.6 });
      }
      if (strong && this.rings.length < 18) this.rings.push({ x, y: base, time, hue });
    }
    if (strong && event.i !== event.j) {
      this.arc = { a: event.i, b: event.j, time };
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }
  downbeat(time) { this.kick = time; }
  surge(time) { this.surgeTime = time; }
  finish(time, values, max) {
    this.finale = time; this.kick = time; this.surge(time);
    if (this.reduced) return;
    const { margin, pitch, base, height } = this.geometry(values.length);
    const groups = Math.min(15, values.length);
    for (let k = 0; k < groups; k++) {
      const fraction = k / Math.max(1, groups - 1), i = Math.round(fraction * (values.length - 1));
      const x = margin + (i + .5) * pitch, y = base - height * (.055 + .945 * values[i] / max);
      for (let j = 0; j < 15; j++) {
        const angle = -Math.PI * (j + .5) / 15, velocity = 27 + Math.random() * 105;
        this.particles.push({ x, y, birth: time + 125 + fraction * 1050, life: .55 + Math.random() * .88,
          vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity - 14,
          size: .85 + Math.random() * 1.55, hue: hueAt(this.world.hues, fraction) });
      }
    }
  }
  resonance(time, values, max, layout) {
    const ctx = this.ctx, w = this.w, h = this.h;
    const { pitch, margin, height, base } = layout;
    const age = (time - this.surgeTime) / 1000;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (age >= 0 && age < 2) {
      const envelope = Math.sin(Math.PI * age / 2);
      const color = this.world.hues[2];
      const style = this.world.id;
      const count = style === 'aurora' ? 20 : 14;
      for (let k = 0; k < count; k++) {
        const u = k / count;
        ctx.strokeStyle = tint(color + 42 * u, 90, 70, envelope * (1 - u * .4) * .28);
        ctx.lineWidth = 1 + u;
        ctx.beginPath();
        if (style === 'aurora') {
          const y = h * (.1 + .3 * u) - age * 33;
          ctx.moveTo(-20, base - age * 16);
          ctx.bezierCurveTo(w * .33, y + h * .55, w * (.56 + u * .1), y - h * .22, w + 22, y);
        } else if (style === 'abyss') {
          ctx.ellipse(w * .72, h * .4, 4 + age * w * .30 + u * 65, 2 + age * h * .42 + u * 27, -.18, 0, tau);
        } else {
          const a = -Math.PI * (.13 + u * .76), r = w * (.06 + age * .34);
          const cx = w * .76, cy = h * .86;
          ctx.moveTo(cx + Math.cos(a) * r * .6, cy + Math.sin(a) * r * .6);
          ctx.quadraticCurveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a + .16) * r * 1.34, cy + Math.sin(a + .16) * r * 1.34);
        }
        ctx.stroke();
      }
    }
    if (this.arc && time - this.arc.time < 320) {
      const { a, b } = this.arc, phase = (time - this.arc.time) / 320;
      const x1 = margin + (a + .5) * pitch, x2 = margin + (b + .5) * pitch;
      const y1 = base - height * (.055 + .945 * values[a] / max);
      const y2 = base - height * (.055 + .945 * values[b] / max);
      const top = Math.min(y1, y2) - Math.min(42, 7 + Math.abs(x2-x1) * .10);
      ctx.strokeStyle = tint(this.world.hues[1], 90, 83, .65 * (1 - phase));
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1+x2)/2, top, x2, y2); ctx.stroke();
      ctx.fillStyle = tint(this.world.hues[0], 90, 94, 1 - phase);
      ctx.beginPath(); ctx.arc(x1 + (x2-x1)*phase, (1-phase)**2*y1+2*(1-phase)*phase*top+phase**2*y2, 2, 0, tau); ctx.fill();
    }
    ctx.restore();
  }
  atmosphere(t, beat) {
    const ctx = this.ctx, w = this.w, h = this.h, id = this.world.id;
    const motion = this.reduced ? 0 : t;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const d of this.dust) {
      let x = d.x, y = d.y;
      let alpha = .20 + .34 * (.5 + .5 * Math.sin(motion * (.45 + d.seed) + d.seed * 100));
      if (id === 'abyss') {
        x += .012 * Math.sin(motion * .38 + d.seed * 30);
        y = (y - motion * (.008 + .02 * d.seed)) % 1;
        if (y < 0) y++;
        ctx.strokeStyle = tint(175 + d.seed * 26, 82, 77, alpha * .8);
        ctx.beginPath(); ctx.arc(x * w, y * h, d.size * 1.8, 0, tau); ctx.stroke();
      } else {
        x = (x + motion * (id === 'solar' ? .012 : .002) * d.seed) % 1;
        y = (y - motion * (id === 'solar' ? .035 : .004) * d.seed) % 1;
        if (y < 0) y++;
        ctx.fillStyle = id === 'solar' ? tint(25 + d.seed * 20, 100, 70, alpha) : tint(210 + 70 * d.seed, 80, 88, alpha);
        ctx.fillRect(x * w, y * h, d.size, d.size * (id === 'solar' ? 2.4 : 1));
        if (d.seed > .966) {
          ctx.fillStyle = tint(id === 'solar' ? 32 : 240, 75, 86, alpha * .64);
          ctx.fillRect(x * w - 2.2, y * h + .4, 6, .6);
          ctx.fillRect(x * w + .5, y * h - 2, .6, 6);
        }
      }
    }
    if (beat > .01) {
      const g = ctx.createRadialGradient(w * .64, h * .72, 1, w * .64, h * .72, w * .52);
      g.addColorStop(0, tint(this.world.hues[2], 90, 70, beat * .13)); g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }
  render(state, max, time) {
    if (!this.w || !this.h) return;
    this.dirty = false;
    const ctx = this.ctx, values = state.data, n = values.length;
    const { margin, pitch, bar, base, height } = this.geometry(n);
    const t = time / 1000;
    const beat = this.reduced ? 0 : Math.max(0, 1 - (time - this.kick) / 420) ** 2;
    ctx.clearRect(0, 0, this.w, this.h);
    this.atmosphere(t, beat);
    const line = ctx.createLinearGradient(0, 0, this.w, 0);
    line.addColorStop(0, 'transparent');
    this.world.hues.forEach((h, i) => line.addColorStop(.08 + .84 * i / 4, tint(h, 98, 69, .82)));
    line.addColorStop(1, 'transparent');
    // A low pool of light anchors the reflections to the stage floor.
    ctx.save(); ctx.translate(this.w / 2, base + 2); ctx.scale(this.w * .49, 22 + beat * 6);
    const pool = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    pool.addColorStop(0, tint(this.world.hues[2], 100, 75, .32)); pool.addColorStop(1, 'transparent');
    ctx.fillStyle = pool; ctx.fillRect(-1,-1,2,2); ctx.restore();
    const event = state.event;
    const finaleAge = (time - this.finale) / 1000;
    for (let i = 0; i < n; i++) {
      const p = i / Math.max(1, n - 1), h = hueAt(this.world.hues, p);
      const x = margin + (i + .5) * pitch - bar / 2;
      const movement = this.motion.get(i);
      const elapsed = movement ? clamp((time - movement.time) / 115, 0, 1) : 1;
      const eased = 1 - (1 - elapsed) ** 3;
      const visualValue = movement ? movement.from + (values[i] - movement.from) * eased : values[i];
      const bh = Math.max(2, height * (.055 + .945 * visualValue / max)), y = base - bh;
      const active = event && (i === event.i || i === event.j);
      const fade = movement ? Math.max(0, 1 - (time - movement.time) / 390) : 0;
      if (movement && !fade) this.motion.delete(i);
      const cap = Math.min(3.4, bar * .23), sx = Math.round(p * 47) * 24;
      const sweep = !this.reduced && finaleAge >= 0 && finaleAge < 2 ? Math.max(0, 1 - Math.abs(p - (finaleAge * .92 - .15)) * 5) : 0;
      ctx.drawImage(this.atlas, sx, 0, 24, 192, x, y, bar, bh);
      if (active || fade || sweep) {
        ctx.fillStyle = tint(h, 82, 88, Math.max(active ? .48 : 0, fade * .32, sweep * .72));
        ctx.fillRect(x, y, bar, bh);
      }
      if (bar > 4) {
        path(ctx, [x, y, x + cap, y - cap, x + bar + cap, y - cap, x + bar, y], tint(h, 100, active ? 94 : 80, .96));
        path(ctx, [x + bar, y, x + bar + cap, y - cap, x + bar + cap, base - cap, x + bar, base], tint(h, 75, 45, .62));
      }
      ctx.fillStyle = tint(h, 100, 88, .9); ctx.fillRect(x, y, bar, Math.min(1.25, bar));
      if ((active || sweep > .18) && !this.reduced) {
        const glow = ctx.createRadialGradient(x + bar / 2, y, 0, x + bar / 2, y, Math.max(10, Math.min(48, pitch * 2)));
        glow.addColorStop(0, tint(h, 100, 87, .76)); glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(x - 50, y - 50, bar + 100, 100);
      }
      const reflection = Math.min(23, bh * .21);
      ctx.globalAlpha = .21;
      ctx.drawImage(this.atlas, sx, 0, 24, 192, x, base + 1.5, bar, reflection);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = line; ctx.fillRect(0, base, this.w, 1.3);
    if (!this.reduced) { this.resonance(time, values, max, { margin, pitch, height, base }); this.effects(time); }
  }
  effects(time) {
    const ctx = this.ctx, world = this.world.id;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    this.particles = this.particles.filter(p => {
      const age = (time - p.birth) / 1000;
      if (age < 0) return true;
      if (age >= p.life) return false;
      const alpha = (1 - age / p.life) ** 1.6;
      const x = p.x + p.vx * age, y = p.y + p.vy * age + (world === 'abyss' ? -12 : 70) * age * age;
      ctx.fillStyle = ctx.strokeStyle = tint(p.hue, 95, 79, alpha);
      if (world === 'abyss') {
        ctx.beginPath(); ctx.arc(x, y, p.size + age * 2.1, 0, tau); ctx.stroke();
      } else if (world === 'solar') {
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x - p.vx * .043, y - p.vy * .043); ctx.stroke();
      } else { ctx.fillRect(x, y, p.size, p.size); }
      return true;
    });
    this.rings = this.rings.filter(r => {
      const age = (time - r.time) / 1000;
      if (age > .64) return false;
      ctx.strokeStyle = tint(r.hue, 100, 75, .48 * (1 - age / .64));
      ctx.beginPath(); ctx.ellipse(r.x, r.y + 1, 3 + age * 84, 1 + age * 9, 0, 0, tau); ctx.stroke();
      return true;
    });
    ctx.restore();
  }
}
