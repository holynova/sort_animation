const TAU = Math.PI * 2;
const unit = value => Math.min(1, Math.max(0, value));
const random = (lo, hi) => lo + Math.random() * (hi - lo);
const ink = (hue, light, alpha) => `hsla(${hue},100%,${light}%,${alpha})`;

// Scatter on the front of the wave, hang briefly, then pull the glass back into place.
export function scatterAt(age) {
  if (age <= 0 || age >= 1) return 0;
  if (age < .29) return 1 - (1 - age / .29) ** 3;
  const returnPhase = unit((age - .41) / .59);
  return 1 - returnPhase * returnPhase * (3 - 2 * returnPhase);
}

function glowAtlas(hues) {
  const atlas = document.createElement('canvas');
  const size = 64;
  atlas.width = hues.length * size; atlas.height = size;
  const ctx = atlas.getContext('2d');
  hues.forEach((hue, i) => {
    const x = i * size + 32;
    const g = ctx.createRadialGradient(x, 32, 0, x, 32, 32);
    g.addColorStop(0, '#fff');
    g.addColorStop(.075, ink(hue, 94, .99));
    g.addColorStop(.20, ink(hue, 73, .75));
    g.addColorStop(.48, ink(hue, 55, .23));
    g.addColorStop(1, ink(hue, 45, 0));
    ctx.fillStyle = g; ctx.fillRect(i * size, 0, size, size);
  });
  return atlas;
}

export class Impact {
  constructor(camera) { this.camera = camera; this.reset(); }
  reset() {
    this.motes = []; this.waves = []; this.bolts = []; this.fractures = new Map();
    this.kickAt = this.lastContact = -Infinity;
    this.force = 0;
    this.camera.style.transform = '';
  }
  setWorld(world) {
    this.reset(); this.world = world; this.glow = glowAtlas(world.hues);
  }
  kick(time, power) {
    const remaining = this.force * (1 - unit((time - this.kickAt) / 380)) ** 2;
    this.force = Math.max(remaining, power);
    this.kickAt = time;
  }
  move(time, w, h) {
    const age = time - this.kickAt;
    const force = this.force * (1 - unit(age / 380)) ** 2 * Math.min(1, w / 760 + .23);
    if (force < .06) {
      if (this.camera.style.transform) this.camera.style.transform = '';
      return;
    }
    const x = force * (.70 * Math.cos(age * .072) + .30 * Math.cos(age * .166));
    const y = force * .64 * Math.sin(age * .094 + .6);
    const scale = 1 + 2.3 * force / Math.max(1, Math.min(w, h));
    this.camera.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
  }
  spray(x, y, power, amount, time, w, h) {
    const limit = w < 600 ? 260 : 490;
    const speed = Math.min(w * .42, h * .9);
    for (let i = 0; i < amount; i++) {
      const angle = random(0, TAU);
      const v = random(.18, 1.18) * speed * power;
      this.motes.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - .18 * speed,
        life: random(.36, 1.16), time, size: random(1, 3.2),
        color: Math.floor(random(0, this.world.hues.length)), shape: i % 5 });
    }
    if (this.motes.length > limit) this.motes.splice(0, this.motes.length - limit);
  }
  bolt(x1, y1, x2, y2, power, time) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.max(1, Math.hypot(dx, dy));
    const count = Math.min(28, Math.max(6, Math.ceil(len / 21)));
    const amplitude = Math.min(32, len * .16) * power;
    const path = new Path2D(); path.moveTo(x1, y1);
    const forks = new Path2D();
    for (let k = 1; k <= count; k++) {
      const t = k / count, offset = random(-1, 1) * amplitude * Math.sin(Math.PI * t);
      const x = x1 + dx * t - dy / len * offset, y = y1 + dy * t + dx / len * offset;
      path.lineTo(x, y);
      if (k % 4 === 1 && k < count) {
        forks.moveTo(x, y);
        forks.lineTo(x + dx * .035 + offset * .5, y - Math.abs(offset) - 3);
        forks.lineTo(x + dx * .08 + offset, y - 14 - Math.abs(offset) * 1.7);
      }
    }
    this.bolts.push({ path, forks, power, time, hue: this.world.hues[this.bolts.length % 5] });
    if (this.bolts.length > 8) this.bolts.shift();
  }
  contact(x, y, x2, y2, strong, time, w, h) {
    // Keep a rhythmic gap at maximum playback speed. Heavy hits can replace a light hit.
    const since = time - this.lastContact;
    if (since < (strong ? 75 : 190)) return;
    this.lastContact = time;
    this.bolt(x, y, x2, y2, strong ? 1 : .45, time);
    this.spray(x, y, strong ? .82 : .37, strong ? 20 : 5, time, w, h);
    if (!strong) return;
    this.spray(x2, y2, .68, 12, time, w, h);
    this.kick(time, 3.3 + Math.min(2.5, Math.abs(x2 - x) / w * 4));
  }
  blast(x, y, time, w, h, power = 1) {
    this.kick(time, 9.5 * power);
    this.waves.push({ x, y, time, power });
    if (this.waves.length > 4) this.waves.shift();
    this.spray(x, y, 1.48 * power, Math.round((w < 600 ? 68 : 106) * power), time, w, h);
    for (let k = 0; k < 5; k++) {
      const angle = -Math.PI * (k + random(.15,.85)) / 5;
      this.bolt(x, y, x + Math.cos(angle) * w * random(.17,.38) * power,
        y + Math.sin(angle) * h * random(.28,.66) * power, 1.18 * power, time + k * 19);
    }
  }
  clearBand(first, last, time, spread, n, width) {
    const rows = n > 190 ? 4 : 7;
    const columns = width < 4 ? 1 : width < 13 ? 2 : 3;
    for (let i = first; i <= last; i++) {
      const start = time + spread * (i - first) / Math.max(1, last - first);
      const chips = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          chips.push({ u: col / columns, v: row / rows, dx: random(-1, 1),
            dy: random(.28, 1.12), spin: random(-1.8, 1.8) });
        }
      }
      this.fractures.set(i, { start, rows, columns, chips });
    }
  }
  fragments(ctx, fracture, scatter, x, y, bar, height, hue, reach) {
    const cw = bar / fracture.columns, ch = height / fracture.rows;
    const radius = Math.min(112, reach * .19);
    ctx.fillStyle = ink(hue, 79, .92);
    ctx.beginPath();
    for (const chip of fracture.chips) {
      const cx = x + bar * chip.u + cw / 2 + chip.dx * radius * scatter;
      const cy = y + height * chip.v + ch / 2 - chip.dy * radius * scatter;
      const a = chip.spin * scatter;
      const cosine = Math.cos(a), sine = Math.sin(a);
      const sx = Math.max(.8, cw * (.48 - .21 * scatter)), sy = Math.max(.8, ch * (.46 - .35 * scatter));
      const ax = cosine * sx, ay = sine * sx, bx = -sine * sy, by = cosine * sy;
      ctx.moveTo(cx - ax - bx, cy - ay - by);
      ctx.lineTo(cx + ax - bx, cy + ay - by);
      ctx.lineTo(cx + ax + bx, cy + ay + by);
      ctx.lineTo(cx - ax + bx, cy - ay + by); ctx.closePath();
    }
    ctx.fill();
  }
  draw(ctx, time, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const world = this.world.id, hues = this.world.hues;
    this.waves = this.waves.filter(wave => {
      const age = (time - wave.time) / 1150;
      if (age >= 1) return false;
      const radius = (1 - (1 - age) ** 2) * Math.min(w * .82, h * 1.7) * wave.power + 2;
      const fade = (1 - age) ** 1.5;
      const { x, y } = wave;
      ctx.globalAlpha = fade;
      const core = (26 + 112 * (1 - age) ** 3) * wave.power;
      ctx.drawImage(this.glow, 128, 0, 64, 64, x - core, y - core, core * 2, core * 2);
      // A narrow anamorphic streak gives the impact a bright centre without a white screen.
      ctx.drawImage(this.glow, 64, 0, 64, 64, x - w * .43, y - 5, w * .86, 10);
      const squash = world === 'abyss' ? .72 : .39;
      for (let k = 0; k < 3; k++) {
        const r = Math.max(.1, radius * (1 - .09 * k));
        ctx.strokeStyle = ink(hues[(k+1)%5], 76, .76 - k * .16);
        ctx.lineWidth = (k === 0 ? 3.6 : 1.3) * (1 - .6 * age);
        ctx.beginPath(); ctx.ellipse(x, y, r, r * squash, -.07, 0, TAU); ctx.stroke();
      }
      return true;
    });
    ctx.globalAlpha = 1;
    this.bolts = this.bolts.filter(bolt => {
      const age = (time - bolt.time) / 265;
      if (age < 0) return true;
      if (age >= 1) return false;
      const alpha = (1 - age) ** 1.7;
      ctx.lineJoin = 'round';
      ctx.lineWidth = 7 * bolt.power; ctx.strokeStyle = ink(bolt.hue, 57, .29 * alpha); ctx.stroke(bolt.path);
      ctx.lineWidth = 2.4 * bolt.power; ctx.strokeStyle = ink(bolt.hue, 75, .94 * alpha); ctx.stroke(bolt.path);
      ctx.lineWidth = 1; ctx.strokeStyle = ink(bolt.hue, 92, alpha); ctx.stroke(bolt.path); ctx.stroke(bolt.forks);
      return true;
    });
    this.motes = this.motes.filter(p => {
      const age = (time - p.time) / 1000, t = age / p.life;
      if (t >= 1) return false;
      const drag = age / (1 + age * 1.65);
      const x = p.x + p.vx * drag;
      const y = p.y + p.vy * drag + (world === 'abyss' ? -36 : 73) * age * age;
      const size = p.size * (1 - .56 * t);
      const color = hues[p.color];
      ctx.globalAlpha = (1 - t) ** 1.25;
      if (p.shape === 0) {
        const radius = size * (world === 'aurora' ? 5.8 : 5);
        ctx.drawImage(this.glow, p.color * 64, 0, 64, 64, x-radius, y-radius, radius*2, radius*2);
      } else if (world === 'abyss' && p.shape % 2 === 0) {
        ctx.strokeStyle = ink(color, 76, .85); ctx.lineWidth = 1.25;
        ctx.beginPath(); ctx.arc(x, y, size * (1.3 + t), 0, TAU); ctx.stroke();
      } else if (world === 'aurora' && p.shape === 2) {
        const s = size * 1.8; ctx.fillStyle = ink(color, 87, .96);
        ctx.fillRect(x - s, y, s * 2, 1); ctx.fillRect(x, y - s, 1, s * 2);
      } else {
        const trail = (world === 'solar' ? .09 : .055) / (1 + 3 * age);
        ctx.strokeStyle = ink(color, 76, .97); ctx.lineWidth = size;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - p.vx * trail, y - p.vy * trail); ctx.stroke();
      }
      return true;
    });
    ctx.restore();
  }
}
