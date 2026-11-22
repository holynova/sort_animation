// Particle positions are a function of the sorting event and its elapsed fraction.
// Scrubbing needs no particles to be advanced, removed, or replayed in the background.
const TAU = Math.PI * 2;
const unit = (n) => Math.max(0, Math.min(1, n));
const ease = (t) => t * t * (3 - 2 * t);
const windowTime = (t, a, b) => unit((t - a) / (b - a));

let seed = 44213;
const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const grains = Array.from({ length: 681 }, () => ({
  a: random() * TAU,
  b: random(),
  c: random(),
  d: random(),
  e: random(),
  f: random(),
}));

export function geometry(w, h, n, max) {
  const pad = w < 480 ? 24 : 42,
    pitch = (w - pad * 2) / n,
    base = h - 30,
    range = Math.max(45, h - 83);
  return {
    w,
    h,
    pad,
    pitch,
    base,
    range,
    width: Math.max(0.65, Math.min(43, pitch * 0.5)),
    x: (index) => pad + (index + 0.5) * pitch,
    y: (value) => base - (range * value) / max,
  };
}

export function barPose(frame, g, index, action, t = 1) {
  const value = frame.values[index];
  let x = g.x(index),
    y = g.y(value),
    bottom = g.base;
  if (action?.kind === 'swap' && (index === action.i || index === action.j)) {
    const p = ease(windowTime(t, 0.07, 0.73));
    const origin = g.x(index === action.i ? action.j : action.i);
    x = origin + (x - origin) * p;
    const lift = Math.sin(Math.PI * p) * (index === action.i ? Math.min(18, g.range * 0.07) : 3);
    y -= lift;
    bottom -= lift;
  } else if (action?.kind === 'write' && index === action.i) {
    const p = ease(windowTime(t, 0.35, 0.65));
    y = g.y(action.from) + (y - g.y(action.from)) * p;
  }
  return { x, y, bottom, value, index };
}

function flicker(ctx, x, y, r, alpha) {
  if (r <= 0 || alpha <= 0) return;
  ctx.globalAlpha = alpha;
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r);
  halo.addColorStop(0, 'white');
  halo.addColorStop(0.1, 'rgb(255 255 255 / 66%)');
  halo.addColorStop(0.35, 'rgb(255 255 255 / 17%)');
  halo.addColorStop(1, 'rgb(255 255 255 / 0%)');
  ctx.fillStyle = halo;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.fillStyle = 'white';
  ctx.globalAlpha = 1;
}

// A cone of long sparks is followed by finer ballistic debris and a fading core.
function burst(ctx, x, y, t, reach, amount, offset = 0, fan = false) {
  if (t <= 0 || t >= 1) return;
  const age = 1 - (1 - t) ** 2,
    fade = (1 - t) ** 1.4;
  ctx.fillStyle = ctx.strokeStyle = 'white';
  for (let band = 0; band < 3; band++) {
    ctx.globalAlpha = fade * [0.34, 0.62, 1][band];
    ctx.lineWidth = 0.62 + band * 0.31;
    ctx.beginPath();
    for (let k = band; k < amount; k += 3) {
      const p = grains[(k + offset) % grains.length];
      const angle = fan ? Math.PI * (1.07 + 0.86 * p.b) : p.a;
      const dx = Math.cos(angle) * reach * (0.12 + 0.94 * p.c);
      const dy = Math.sin(angle) * reach * (0.2 + 0.8 * p.d);
      const px = x + dx * age,
        py = y + dy * age + reach * 0.3 * t * t;
      if (p.e > 0.59) {
        const tail = (0.055 + 0.14 * p.f) * (1 - t);
        ctx.moveTo(px, py);
        ctx.lineTo(px - dx * tail, py - (dy + reach * 0.35 * t) * tail);
      } else {
        const size = 0.65 + 1.8 * p.f * (1 - t);
        ctx.fillRect(px, py, size, size * (p.d > 0.7 ? 1.8 : 1));
      }
    }
    ctx.stroke();
  }
  flicker(ctx, x, y, reach * 0.44, fade * 0.9);
  ctx.globalAlpha = 1;
}

// A broken expanding ring is drawn entirely with individual grains.
function shockRing(ctx, x, y, t, radius, flat) {
  if (t <= 0 || t >= 1) return;
  const r = radius * (1 - (1 - t) ** 2);
  ctx.fillStyle = 'white';
  for (let band = 0; band < 3; band++) {
    ctx.globalAlpha = (1 - t) ** 1.3 * [0.36, 0.68, 1][band];
    for (let k = band; k < 228; k += 3) {
      const p = grains[k],
        a = p.a;
      const spread = r * (0.93 + 0.1 * p.b) + p.d * 3;
      const size = 1 + p.f * (1 - t);
      ctx.fillRect(x + Math.cos(a) * spread, y + Math.sin(a) * spread * flat, size, size);
    }
  }
  ctx.globalAlpha = 1;
}

// Each sample has its own delay and transverse velocity. The comet travels along
// the data path and leaves a widening cloud where the head has already passed.
function comet(ctx, from, to, t, arc, spread, count, offset, twist) {
  if (t <= 0 || t >= 1) return;
  const dx = to.x - from.x,
    dy = to.y - from.y;
  const pos = (u) => ({ x: from.x + dx * u, y: from.y + dy * u - 4 * u * (1 - u) * arc });
  const head = ease(Math.min(1, t / 0.82)),
    fade = 1 - windowTime(t, 0.72, 1);
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  for (let band = 0; band < 3; band++) {
    ctx.globalAlpha = [0.28, 0.54, 0.96][band] * fade;
    ctx.lineWidth = band === 2 ? 1.1 : 0.68;
    ctx.beginPath();
    for (let k = band; k < count; k += 3) {
      const s = grains[(k + offset) % grains.length];
      const lag = s.b * s.b * 0.55;
      if (lag > head) continue;
      const u = head - lag,
        p = pos(u);
      const cone = spread * (0.06 + lag * 1.6);
      const whorl = twist ? Math.sin(u * TAU * 2.2 + s.e * 2.4) * cone * 0.7 : 0;
      const jitter = (s.e - 0.5) * cone;
      const px = p.x + Math.cos(s.a) * s.c * cone;
      const py = p.y + Math.sin(s.a) * s.c * cone + whorl + jitter;
      if (k % 8 === 0) {
        const back = pos(Math.max(0, u - 0.012 - 0.025 * s.d));
        ctx.moveTo(px, py);
        ctx.lineTo(px + back.x - p.x, py + back.y - p.y);
      } else {
        const size = 0.65 + 1.4 * s.f;
        ctx.fillRect(px, py, size, size);
      }
    }
    ctx.stroke();
  }
  const tip = pos(head);
  flicker(ctx, tip.x, tip.y, Math.min(24, spread * 0.77), fade);
  ctx.globalAlpha = 1;
}

function compare(ctx, a, b, t, g, offset) {
  const scale = g.w < 460 ? 0.72 : 1;
  const p = { x: a.x, y: a.y - 3 },
    q = { x: b.x, y: b.y - 3 };
  burst(ctx, p.x, p.y, windowTime(t, 0, 0.57), 42 * scale, 110, offset, true);
  comet(
    ctx,
    p,
    q,
    windowTime(t, 0.025, 0.71),
    Math.min(36, 8 + Math.abs(q.x - p.x) * 0.1),
    17 * scale,
    230,
    offset,
    false,
  );
  burst(ctx, q.x, q.y, windowTime(t, 0.43, 1), 54 * scale, 146, offset + 79, true);
}

function exchange(ctx, frame, g, op, t, offset) {
  const scale = g.w < 460 ? 0.75 : 1;
  for (const index of [op.i, op.j]) {
    const source = index === op.i ? op.j : op.i,
      dir = index === op.i ? 1 : -1;
    const p = { x: g.x(source), y: g.y(frame.values[index]) - 2 },
      q = { x: g.x(index), y: p.y };
    const distance = Math.abs(q.x - p.x);
    const arc = dir > 0 ? Math.min(79, 40 + distance * 0.15) : Math.min(46, 17 + distance * 0.1);
    burst(ctx, p.x, p.y, windowTime(t, 0, 0.55), 74 * scale, 230, offset + index);
    comet(ctx, p, q, windowTime(t, 0.04, 0.87), arc, 54 * scale, 560, offset + index * 7, true);
    const pose = barPose(frame, g, index, op, t);
    const wake = windowTime(t, 0.08, 0.9);
    if (wake > 0 && wake < 1) {
      // Vapor peels off the trailing edge. Its full-height silhouette makes the exchange legible.
      const direction = Math.sign(q.x - p.x);
      const edge = pose.x - direction * g.width * 0.5;
      const strength = Math.sin(Math.PI * wake);
      ctx.fillStyle = 'white';
      for (let k = 0; k < 214; k++) {
        const s = grains[(k + offset + index * 11) % grains.length];
        const drift = (s.b + wake * 1.4) % 1;
        const travel = drift * strength;
        const x = edge - direction * travel * (14 + 55 * s.d) * scale;
        const y = pose.y + (pose.bottom - pose.y) * s.c - 18 * travel * s.f;
        ctx.globalAlpha = (1 - drift) * strength * (0.18 + 0.72 * s.e);
        ctx.fillRect(x, y, 0.7 + 2.4 * s.f, 0.7 + s.e);
      }
      ctx.globalAlpha = 1;
    }
    const arrival = windowTime(t, 0.58, 1);
    burst(ctx, q.x, q.y, arrival, (op.lock ? 115 : 88) * scale, 300, offset + 81 + index, true);
    shockRing(ctx, q.x, g.base - 1, arrival, (op.lock ? 99 : 61) * scale, 0.22);
  }
}

function write(ctx, frame, g, op, t, offset) {
  const dest = { x: g.x(op.i), y: g.y(frame.values[op.i]) };
  const origin = { x: g.x(op.source), y: 24 };
  comet(ctx, origin, dest, windowTime(t, 0, 0.68), -8, g.w < 460 ? 22 : 34, 510, offset, true);
  const erase = windowTime(t, 0.3, 0.92);
  if (erase > 0 && erase < 1 && op.from !== frame.values[op.i]) {
    const oldTop = g.y(op.from);
    ctx.fillStyle = 'white';
    for (let k = 0; k < 335; k++) {
      const s = grains[(k + offset) % grains.length];
      const progress = windowTime(erase, s.c * 0.36, 1);
      const x = dest.x + (s.b - 0.5) * g.width + Math.cos(s.a) * progress * (22 + 47 * s.d);
      const y = oldTop + (dest.y - oldTop) * s.c - progress * (19 + 46 * s.f);
      ctx.globalAlpha = Math.sin(Math.PI * progress) * (0.25 + 0.7 * s.e);
      ctx.fillRect(x, y, 0.8 + 1.8 * s.d, 1 + s.f);
    }
    ctx.globalAlpha = 1;
  }
  const impact = windowTime(t, 0.42, 1);
  burst(ctx, dest.x, dest.y, impact, Math.min(90, g.range * 0.52), 270, offset, true);
  shockRing(ctx, dest.x, dest.y, impact, Math.min(77, g.range * 0.42), 0.4);
}

function finale(ctx, frame, g, t) {
  if (t <= 0 || t >= 1) return;
  // Each emitter starts at an actual sorted value, including at dense sample sizes.
  const stride = Math.max(1, Math.ceil(frame.values.length / 25));
  for (let i = 0; i < frame.values.length; i += stride) {
    const start = (i / Math.max(1, frame.values.length - 1)) * 0.62;
    const local = windowTime(t, start, start + 0.38);
    const x = g.x(i),
      y = g.y(frame.values[i]);
    burst(ctx, x, y, local, Math.min(120, g.range * 0.5), 195, i * 11, true);
    shockRing(ctx, x, g.base, local, Math.min(52, g.pitch * 1.8), 0.19);
  }
}

export function drawEffect(ctx, frame, g, op, t) {
  if (!op || t <= 0 || t >= 1) return;
  ctx.save();
  if (op.kind === 'finish') finale(ctx, frame, g, t);
  else {
    const offset = (op.i * 23 + op.j * 17) % grains.length;
    if (op.kind === 'compare')
      compare(
        ctx,
        { x: g.x(op.i), y: g.y(frame.values[op.i]) },
        { x: g.x(op.j), y: g.y(frame.values[op.j]) },
        t,
        g,
        offset,
      );
    else if (op.kind === 'swap') exchange(ctx, frame, g, op, t, offset);
    else if (op.kind === 'write') write(ctx, frame, g, op, t, offset);
  }
  ctx.restore();
}
