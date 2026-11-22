const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const mono = '"SFMono-Regular",Consolas,monospace';

function polygon(ctx, vertices, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(...vertices[0]);
  for (let i = 1; i < vertices.length; i++) ctx.lineTo(...vertices[i]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.65;
  ctx.stroke();
}

// Parallel projection keeps equal values equal in height, even while the view rotates.
export class ParticlePlot {
  constructor(canvas, select, hover) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.select = select;
    this.hover = hover;
    this.yaw = 0.47;
    this.front = false;
    this.picked = null;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, moved: false };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (this.drag) {
        const dx = e.clientX - this.drag.x;
        if (Math.abs(dx) > 5 || Math.abs(e.clientY - this.drag.y) > 7) this.drag.moved = true;
        if (this.drag.moved && !this.front) {
          this.yaw = clamp(this.drag.yaw + dx * 0.003, -0.62, 0.62);
          canvas.classList.add('dragging');
          this.draw(performance.now());
        }
      } else this.hover(this.hit(e));
    });
    canvas.addEventListener('pointerup', (e) => {
      if (this.drag && !this.drag.moved) this.select(this.hit(e));
      this.drag = null;
      canvas.classList.remove('dragging');
    });
    canvas.addEventListener('pointercancel', () => {
      this.drag = null;
      canvas.classList.remove('dragging');
    });
    canvas.addEventListener('pointerleave', () => this.hover(null));
    this.reduce.addEventListener('change', () => {
      this.motion = null;
      this.draw(performance.now());
    });
  }
  resize() {
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    const dpi = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * dpi);
    this.canvas.height = Math.round(this.h * dpi);
    this.ctx.setTransform(dpi, 0, 0, dpi, 0, 0);
    this.draw(performance.now());
  }
  hit(e) {
    if (!this.frame || !this.geometry) return null;
    const box = this.canvas.getBoundingClientRect(),
      x = e.clientX - box.left;
    const { origin, pitch, n } = this.geometry;
    const i = Math.floor((x - origin) / pitch);
    return i >= 0 && i < n ? i : null;
  }
  show(frame, motion = null) {
    this.frame = frame;
    this.motion = motion && !this.reduce.matches ? { ...motion, start: performance.now() } : null;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.draw(performance.now());
  }
  tick = (time) => {
    this.raf = 0;
    this.draw(time);
  };
  draw(time) {
    if (!this.frame || this.w < 1 || this.h < 1) return;
    const ctx = this.ctx,
      w = this.w,
      h = this.h;
    const { values, max, event, pivot } = this.frame,
      n = values.length;
    const yaw = this.front ? 0 : this.yaw,
      pitchAngle = this.front ? 0 : 0.3;
    const cy = Math.cos(yaw),
      sy = Math.sin(yaw),
      cp = Math.cos(pitchAngle),
      sp = Math.sin(pitchAngle);
    const pad = w < 470 ? 23 : 42;
    const available = w - pad * 2,
      step = available / n,
      pitch = step / cy;
    const bw = Math.min(65, pitch * 0.62),
      depth = Math.min(35, bw * 0.7);
    const span = pitch * n;
    const base = h - 27,
      top = Math.max(54, h - 63);
    // An oblique projection holds the row on one baseline while the depth faces turn.
    const project = (x, y, z) => [w / 2 + x * cy + z * sy, base - y * cp - z * cy * sp];
    const centre = (i) => (i + 0.5 - n / 2) * pitch;
    this.geometry = { origin: pad, pitch: step, n };
    ctx.clearRect(0, 0, w, h);
    const line = (a, b, color, width = 1) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(...a);
      ctx.lineTo(...b);
      ctx.stroke();
    };
    const floorDepth = Math.max(14, depth * 1.8);
    const left = -span / 2,
      right = span / 2;
    for (let k = 0; k <= 4; k++)
      line(
        project(left, 0, (k * floorDepth) / 4),
        project(right, 0, (k * floorDepth) / 4),
        '#3a3a3a',
        0.65,
      );
    for (let i = 0; i <= n; i += Math.max(1, Math.ceil(n / 55))) {
      const x = left + pitch * i;
      line(project(x, 0, 0), project(x, 0, floorDepth), '#393939', 0.75);
    }
    const guideValues = [...new Set([0, Math.round(max / 2), max])];
    ctx.font = '10px ' + mono;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const value of guideValues) {
      const a = project(left, (top * value) / max, 0),
        b = project(right, (top * value) / max, 0);
      ctx.setLineDash([2, 5]);
      line(a, b, '#404040', 0.7);
      ctx.setLineDash([]);
      ctx.fillStyle = '#aaa';
      ctx.fillText(value, pad - 9, a[1]);
    }
    const elapsed = this.motion ? clamp((time - this.motion.start) / 265, 0, 1) : 1;
    const ease = elapsed * elapsed * (3 - 2 * elapsed);
    const change = this.motion;
    const moving = change && elapsed < 1;
    const shapes = [];
    for (let i = 0; i < n; i++) {
      let slot = i,
        v = values[i],
        lift = 0;
      if (moving && change.kind === 'swap' && (i === change.i || i === change.j)) {
        const from = i === change.i ? change.j : change.i;
        slot = from + (i - from) * ease;
        if (i === change.i) lift = Math.sin(Math.PI * ease) * Math.min(13, step * 0.32);
      } else if (moving && change.kind === 'write' && i === change.i)
        v = change.from + (v - change.from) * ease;
      shapes.push({ i, x: centre(slot), bh: Math.max(1, (v / max) * top), lift });
    }
    // Draw the distant prism first. Moving prisms use the same depth ordering.
    if (yaw !== 0 || moving) shapes.sort((a, b) => (a.x - b.x) * sy || a.lift - b.lift);
    const labels = [];
    for (const { i, x, bh, lift } of shapes) {
      const active = !!event && (event.i === i || event.j === i),
        pinned = this.picked === i;
      const inside = !event || (i >= event.scope.lo && i <= event.scope.hi);
      const x0 = x - bw / 2,
        x1 = x + bw / 2;
      const bl = project(x0, lift, 0),
        br = project(x1, lift, 0),
        tl = project(x0, lift + bh, 0),
        tr = project(x1, lift + bh, 0);
      const ttl = project(x0, lift + bh, depth),
        ttr = project(x1, lift + bh, depth);
      const near = sy >= 0 ? x1 : x0;
      const side = [
        project(near, lift, 0),
        project(near, lift, depth),
        project(near, bh + lift, depth),
        project(near, bh + lift, 0),
      ];
      if (step < 3) {
        ctx.setLineDash(this.front ? [] : [1.4, 1.1]);
        line(
          project(x, lift, 0),
          project(x, lift + bh, 0),
          active ? 'white' : inside ? '#b4b4b4' : '#777',
          Math.max(0.75, step * 0.64),
        );
        ctx.setLineDash([]);
      } else {
        const edge = active ? '#d7d7d7' : pinned ? '#c0c0c0' : inside ? '#707070' : '#4a4a4a';
        polygon(ctx, [bl, br, tr, tl], active ? '#505050' : inside ? '#252525' : '#202020', edge);
        if (!this.front) {
          polygon(ctx, side, active ? '#333' : '#1d1d1d', edge);
          polygon(ctx, [tl, tr, ttr, ttl], active ? '#bababa' : inside ? '#474747' : '#303030', edge);
        }
        const gap = Math.max(2.6, Math.min(4.3, step * 0.09));
        const nx = Math.max(1, Math.round(bw / gap)),
          ny = Math.max(1, Math.round(bh / gap));
        const nz = this.front ? 0 : Math.max(1, Math.round(depth / gap));
        const dot = Math.max(0.7, Math.min(1.6, gap * 0.37));
        // Surface samples are fixed in object space. View changes reproject the same points.
        ctx.fillStyle = active ? '#fafafa' : inside ? '#ababab' : '#707070';
        for (let row = 0; row < ny; row++) {
          const yy = lift + ((row + 0.5) * bh) / ny;
          for (let col = 0; col < nx; col++) {
            const uv = project(x0 + ((col + 0.5) * bw) / nx, yy, 0);
            ctx.fillRect(uv[0] - dot / 2, uv[1] - dot / 2, dot, dot);
          }
        }
        if (!this.front && Math.abs(sy) > 0.1) {
          ctx.fillStyle = active ? '#a3a3a3' : inside ? '#686868' : '#434343';
          for (let row = 0; row < ny; row++)
            for (let col = 0; col < nz; col++) {
              const uv = project(near, lift + ((row + 0.5) * bh) / ny, ((col + 0.5) * depth) / nz);
              ctx.fillRect(uv[0], uv[1], dot * 0.77, dot * 0.77);
            }
        }
        if (!this.front) {
          ctx.fillStyle = active ? '#fff' : '#b5b5b5';
          for (let row = 0; row < nz; row++)
            for (let col = 0; col < nx; col++) {
              const uv = project(x0 + ((col + 0.5) * bw) / nx, bh + lift, ((row + 0.5) * depth) / nz);
              ctx.fillRect(uv[0], uv[1], dot, dot * 0.82);
            }
        }
      }
      if (active || pinned || i === pivot || step >= 24) {
        const [px, py] = project(x, bh + lift, depth * 0.6);
        labels.push({ x: px, y: py - 8, value: values[i], active, pinned, pivot: i === pivot });
      }
    }
    labels.sort(
      (a, b) => Number(b.active || b.pinned || b.pivot) - Number(a.active || a.pinned || a.pivot),
    );
    const placed = [];
    for (const label of labels) {
      const text = (label.pivot ? 'P ' : '') + label.value,
        priority = label.active || label.pinned || label.pivot;
      ctx.font = (priority ? 'bold ' : '') + (w < 500 ? '11px ' : '12px ') + mono;
      const tw = ctx.measureText(text).width + 7,
        x = clamp(label.x, tw / 2 + 2, w - tw / 2 - 2);
      let y = Math.max(9, label.y);
      const collides = () =>
        placed.some((p) => Math.abs(x - p.x) < (tw + p.w) / 2 + 2 && Math.abs(y - p.y) < 15);
      if (collides() && !priority) continue;
      while (collides() && y < h - 18) y += 16;
      placed.push({ x, y, w: tw });
      if (priority) {
        ctx.fillStyle = label.active ? '#f0f0f0' : '#484848';
        ctx.fillRect(x - tw / 2, y - 7, tw, 14);
      }
      ctx.fillStyle = label.active ? '#141414' : priority ? '#fff' : '#c7c7c7';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 0.5);
    }
    const skip = Math.max(1, Math.ceil(24 / step));
    ctx.font = '10px ' + mono;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const active = !!event && (i === event.i || i === event.j);
      if (i % skip && !active && i !== this.picked) continue;
      const [x, y] = project(centre(i), 0, 0);
      if (active || i === this.picked) {
        line([x - Math.min(8, step * 0.4), y + 3], [x + Math.min(8, step * 0.4), y + 3], '#eee', 2);
      }
      if (step >= 19 || i % skip === 0) {
        ctx.fillStyle = active ? '#fff' : '#a0a0a0';
        ctx.fillText(i, x, y + 14);
      }
    }
    if (moving && !this.raf) this.raf = requestAnimationFrame(this.tick);
    else if (!moving) this.motion = null;
  }
}
