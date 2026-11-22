// Every mark is white ink. Grain size and optical density supply all the shading.
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const smooth = (n) => n * n * (3 - 2 * n);

function noise(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Keep a grain attached to its value. Reversing an exchange reconstructs the same cloud.
export function makeCloud(value, count) {
  const rand = noise(value * 7919 + 501);
  const layers = Array.from({ length: 4 }, () => []);
  for (let k = 0; k < count; k++) {
    const band = k % 4,
      y = rand(),
      strand = Math.floor(rand() * 3);
    const dust = k % 8 < 3;
    const angle = dust
      ? rand() * TAU
      : y * 8.8 + (strand * TAU) / 3 + Math.sin(y * 7 + value) * 0.56 + (rand() - 0.5) * 0.21;
    const radius = dust ? Math.sqrt(rand()) : 0.8 + 0.19 * rand();
    const cap = k % 13 === 0;
    layers[band].push(Math.cos(angle) * radius, cap ? 1 : y, Math.sin(angle) * radius, rand());
  }
  return layers.map((points) => new Float32Array(points));
}

const samples = (() => {
  const rand = noise(8949);
  return Array.from({ length: 1700 }, () => ({ u: rand(), angle: rand() * TAU, r: rand(), s: rand() }));
})();
const opacity = [0.19, 0.36, 0.62, 0.97];
const sizes = [0.6, 0.73, 0.91, 1.19];
export function cloud(ctx, layers, g, pose, t, active) {
  const { x, height, radius, drift, lift, kind, fromY } = pose;
  const { base, tilt, yaw } = g,
    moving = t < 1 && kind;
  const phase = active ? pose.time * 0.38 : 0;
  const cos = Math.cos(yaw + phase),
    sin = Math.sin(yaw + phase);
  ctx.fillStyle = 'white';
  for (let k = 0; k < layers.length; k++) {
    const grains = layers[k],
      size = sizes[k] * (active ? 1.14 : 0.94);
    ctx.globalAlpha = opacity[k] * (active ? 1 : pose.dim);
    for (let p = 0; p < grains.length; p += 4) {
      const u = grains[p],
        v = grains[p + 1],
        z = grains[p + 2],
        seed = grains[p + 3];
      const side = u * cos + z * sin,
        depth = z * cos - u * sin;
      let px = x + side * radius,
        py = base - v * height - depth * radius * tilt;
      if (moving) {
        const progress = smooth(clamp((t - seed * 0.31) / 0.69, 0, 1));
        const trail = 1 - progress,
          spread = 4 * progress * trail;
        px += drift * trail + (seed - 0.5) * spread * Math.max(13, radius * 1.7);
        if (kind === 'swap') {
          py -= spread * (lift + (v - 0.5) * 23 + depth * radius * 0.45);
        } else {
          // At the start of a write these grains occupy a narrow source on the buffer rail.
          py = py * progress + (fromY + depth * 2.5) * trail - spread * (10 + seed * 13);
          px -= side * radius * trail * 0.93;
        }
      }
      ctx.fillRect(px, py, size, size);
    }
  }
  // Cut-surface ring makes height legible even when the body is shedding particles.
  ctx.globalAlpha = (active ? 0.87 : pose.dim * 0.7) * (moving ? t * t : 1);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = active ? 0.9 : 0.65;
  ctx.beginPath();
  ctx.ellipse(x, base - height, radius, Math.max(0.38, radius * tilt), 0, 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawFloor(ctx, g, focus) {
  const { w, h, base, tilt } = g;
  ctx.fillStyle = 'white';
  const center = focus ?? w / 2;
  // Small fixed grains form a plane with radial interference around the active pair.
  for (let layer = 0; layer < 3; layer++) {
    ctx.globalAlpha = [0.14, 0.26, 0.46][layer];
    for (let i = layer; i < samples.length; i += 3) {
      const p = samples[i],
        radius = (0.025 + 0.975 * p.u) * Math.min(w * 0.77, 720);
      const ring = Math.round(radius / 11) * 11 + (p.r - 0.5) * 2.6;
      const xx = center + Math.cos(p.angle) * ring;
      const yy = base + Math.sin(p.angle) * ring * (0.06 + tilt * 0.11) - 2;
      if (yy >= h - 20 || yy < base - 39 || xx < 10 || xx > w - 7) continue;
      ctx.fillRect(xx, yy, p.s + 0.38, 0.65);
    }
  }
  ctx.globalAlpha = 1;
}

export function corona(ctx, x, y, radius, time, power) {
  ctx.fillStyle = 'white';
  for (let band = 0; band < 3; band++) {
    ctx.globalAlpha = [0.22, 0.5, 0.85][band] * power;
    for (let k = band; k < 390; k += 3) {
      const p = samples[k];
      const a = p.angle + time * 0.47 * (0.45 + p.s);
      const r = radius * (0.75 + 1.6 * p.u);
      const lift = (1 - p.u) * p.r * (radius * 0.85 + 5);
      ctx.fillRect(
        x + Math.cos(a) * r,
        y + Math.sin(a) * r * 0.2 - lift,
        0.66 + p.s * 0.75,
        0.75 + p.s * 0.65,
      );
    }
  }
  ctx.globalAlpha = 1;
}

// Two helices of luminous grains trace an operation. A comparison moves light along
// the link; during a swap the columns themselves also travel in opposite directions.
export function drawStream(ctx, a, b, time, mode, compact) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    distance = Math.hypot(dx, dy);
  const amplitude = Math.min(compact ? 18 : 30, 6 + distance * 0.15);
  const lift = Math.min(Math.max(8, Math.min(a.y, b.y) - 12), Math.min(68, 12 + distance * 0.22));
  const strands = mode === 'swap' ? 4 : 3,
    count = compact ? 840 : 1480;
  ctx.fillStyle = 'white';
  for (let band = 0; band < 4; band++) {
    ctx.globalAlpha = opacity[band] * (mode === 'write' ? 0.96 : 0.83);
    for (let k = band; k < count; k += 4) {
      const p = samples[k],
        lane = k % strands;
      const direction = mode === 'write' || lane % 2 === 0 ? 1 : -1;
      const travel = p.u + time * direction * (0.18 + 0.035 * lane);
      const u = travel - Math.floor(travel),
        envelope = Math.sin(Math.PI * u);
      const wave = u * TAU * (1.2 + 0.22 * lane) + (lane * TAU) / strands + time * direction * 0.91;
      const fuzz = (p.r - 0.5) * (p.s > 0.7 ? 15 : 4);
      const px = a.x + dx * u + envelope * (Math.cos(wave) * amplitude * 0.65 + fuzz);
      const py = a.y + dy * u + envelope * (-lift + Math.sin(wave) * amplitude + fuzz);
      const size = 0.57 + p.s * (band === 3 ? 1.3 : 0.9);
      ctx.fillRect(px, py, size, size);
    }
  }
  ctx.globalAlpha = 1;
}

export function settlement(ctx, g, time) {
  const { w, base, maxHeight } = g;
  const wave = time * (w + 110) - 55;
  ctx.fillStyle = 'white';
  for (let band = 0; band < 3; band++) {
    ctx.globalAlpha = [0.28, 0.55, 0.86][band] * Math.sin(Math.PI * time);
    for (let k = band; k < 1200; k += 3) {
      const p = samples[k],
        x = g.pad + p.u * (w - 2 * g.pad);
      const wake = Math.abs(wave - x);
      if (wake > 75) continue;
      const y = base - p.u * maxHeight - (1 - wake / 75) * p.r * 29;
      ctx.fillRect(x + (p.s - 0.5) * 7, y, 1 + p.s, 1 + p.s);
    }
  }
  ctx.globalAlpha = 1;
}

// The flow along the floor peaks at the operands. It stays below their value labels.
export function floorCurrent(ctx, g, focus, time) {
  const across = g.w < 530 ? 100 : 158;
  const concentration = Math.max(40, g.step * 1.9);
  ctx.fillStyle = 'white';
  for (let strand = 0; strand < 21; strand++) {
    const depth = strand / 20;
    ctx.globalAlpha = 0.16 + 0.37 * depth;
    for (let k = 0; k < across; k++) {
      const u = (k + (strand % 2) * 0.4) / across;
      const x = g.pad / 3 + u * (g.w - g.pad * 0.65);
      const envelope = 0.23 + 0.77 / (1 + ((x - focus) / concentration) ** 2);
      const ripple =
        Math.sin(u * 15 - time * 1.5 + depth * 6) + 0.65 * Math.sin(u * 26 + time + depth * 3);
      const y = g.base - 9 + depth * 19 + ripple * envelope * (7 + 9 * g.tilt);
      ctx.fillRect(x, y, 0.78 + depth * 0.24, 0.78);
    }
  }
  ctx.globalAlpha = 1;
}

export function ionHalo(ctx, x, y, radius, time, strength) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.45);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, 'rgb(255 255 255 / 28%)');
  glow.addColorStop(0.21, 'rgb(255 255 255 / 12%)');
  glow.addColorStop(1, 'rgb(255 255 255 / 0%)');
  ctx.globalAlpha = strength * (0.88 + 0.12 * Math.sin(time * 3));
  ctx.fillStyle = glow;
  ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
  ctx.restore();
}

// Particles from each end curl into a shared orbit. Depth collapses in the front view.
export function orbit(ctx, a, b, g, time) {
  const cx = (a.x + b.x) / 2,
    cy = (a.y + b.y) / 2;
  const rx = Math.abs(b.x - a.x) * 0.58 + Math.max(13, g.radius * 1.55);
  const ry = Math.min(g.maxHeight * 0.24, 15 + Math.abs(b.y - a.y) * 0.31 + g.radius * 0.5);
  const slope = (b.y - a.y) * 0.47 * Math.sign(b.x - a.x);
  const count = g.w < 530 ? 500 : 950;
  ctx.fillStyle = 'white';
  for (let layer = 0; layer < 3; layer++) {
    ctx.globalAlpha = [0.18, 0.38, 0.61][layer];
    for (let k = layer; k < count; k += 3) {
      const p = samples[k],
        lane = k % 5,
        angle = p.angle + time * (0.28 + 0.02 * lane);
      const c = Math.cos(angle),
        s = Math.sin(angle);
      const curl = Math.sin(angle * 3 + lane * 0.41 + time * 0.9);
      const feather = (p.u - 0.5) * (p.s > 0.73 ? 11 : 2.9);
      const px = cx + c * (rx + (lane - 2) * 2.4 + curl * 3) + feather;
      const py = cy + c * slope + s * ry * (0.6 + g.tilt) + curl * (lane - 2) * 1.8 + feather;
      ctx.fillRect(px, py, 0.55 + p.r * 0.82, 0.55 + p.r * 0.82);
    }
  }
  ctx.globalAlpha = 1;
}
