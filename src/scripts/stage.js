import {
  makeCloud,
  cloud,
  drawFloor,
  corona,
  drawStream,
  settlement,
  floorCurrent,
  ionHalo,
  orbit,
} from './grains.js';

const mono = '"SFMono-Regular",Consolas,monospace';
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export class ParticlePlot {
  constructor(canvas, select, hover) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.back = document.createElement('canvas');
    this.backCtx = this.back.getContext('2d', { alpha: false });
    this.select = select;
    this.hover = hover;
    this.yaw = 0.5;
    this.front = false;
    this.picked = null;
    this.time = 0;
    this.age = 0;
    this.raf = 0;
    this.lastTime = 0;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
    this.flow = !this.reduce.matches;
    this.visible = true;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.restartClock();
    });
    this.intersection.observe(canvas);
    document.addEventListener('visibilitychange', () => this.restartClock());
    this.reduce.addEventListener('change', () => {
      this.setFlow(!this.reduce.matches);
      this.onFlowChange?.();
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.drag = { x: e.clientX, y: e.clientY, yaw: this.yaw, moved: false };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.drag) {
        this.hover(this.hit(e));
        return;
      }
      const dx = e.clientX - this.drag.x;
      if (Math.abs(dx) > 5 || Math.abs(e.clientY - this.drag.y) > 7) this.drag.moved = true;
      if (this.drag.moved && !this.front) {
        this.yaw = clamp(this.drag.yaw + dx * 0.005, -1.35, 1.35);
        canvas.classList.add('dragging');
        this.invalidate();
      }
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
    this.resize();
  }
  hit(e) {
    if (!this.g) return null;
    const i = Math.floor(
      (e.clientX - this.canvas.getBoundingClientRect().left - this.g.pad) / this.g.step,
    );
    return i >= 0 && i < this.frame.values.length ? i : null;
  }
  resize() {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    for (const [canvas, ctx] of [
      [this.canvas, this.ctx],
      [this.back, this.backCtx],
    ]) {
      canvas.width = Math.round(w * this.dpr);
      canvas.height = Math.round(h * this.dpr);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }
    this.invalidate();
  }
  setView(front) {
    this.front = front;
    this.invalidate();
  }
  setFlow(on) {
    this.flow = on;
    if (!on) {
      this.motion = null;
      this.finish = false;
    }
    this.restartClock();
  }
  restartClock() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastTime = 0;
    if (this.visible && !document.hidden) this.draw();
  }
  show(frame, motion = null, arrived = false) {
    this.frame = frame;
    this.motion = this.flow ? motion : null;
    this.finish = this.flow && frame.finished && arrived;
    this.age = 0;
    this.invalidate();
  }
  invalidate() {
    this.dirty = true;
    this.draw();
  }
  metrics() {
    const { w, h } = this,
      n = this.frame.values.length;
    const pad = w < 470 ? 23 : 40,
      step = (w - 2 * pad) / n;
    return {
      w,
      h,
      pad,
      step,
      base: h - 36,
      maxHeight: h - 80,
      tilt: this.front ? 0 : 0.27,
      yaw: this.front ? 0 : this.yaw,
      radius: Math.min(38, step * 0.36),
      x: (i) => pad + (i + 0.5) * step,
    };
  }
  grains(value, count) {
    const key = value + '/' + count;
    if (!this.grainCache.has(key)) this.grainCache.set(key, makeCloud(value, count));
    return this.grainCache.get(key);
  }
  paintStillColumn(ctx, pose, count) {
    // Rasterize each stationary value once for this camera. A step only moves its stamp.
    let stamp = this.stamps.get(pose.value);
    if (!stamp) {
      const margin = Math.ceil(pose.radius + 3);
      const bottom = Math.ceil(pose.height + pose.radius * this.g.tilt + 4);
      const height = bottom + Math.ceil(pose.radius * this.g.tilt) + 3;
      const surface = document.createElement('canvas');
      surface.width = Math.ceil(2 * margin * this.dpr);
      surface.height = Math.ceil(height * this.dpr);
      const ink = surface.getContext('2d');
      ink.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      cloud(
        ink,
        this.grains(pose.value, count),
        { ...this.g, base: bottom },
        { ...pose, x: margin, dim: 1 },
        1,
        false,
      );
      stamp = { surface, margin, bottom, height };
      this.stamps.set(pose.value, stamp);
    }
    ctx.globalAlpha = pose.dim;
    ctx.drawImage(
      stamp.surface,
      pose.x - stamp.margin,
      this.g.base - stamp.bottom,
      stamp.margin * 2,
      stamp.height,
    );
    ctx.globalAlpha = 1;
  }
  rebuild() {
    this.dirty = false;
    const g = (this.g = this.metrics()),
      { w, h, base, maxHeight, step, pad } = g;
    const { values, event, max } = this.frame,
      ctx = this.backCtx;
    const camera = [w, h, values.length, g.tilt, g.yaw, this.dpr].join('/');
    if (this.camera !== camera) {
      this.camera = camera;
      this.stamps = new Map();
      this.grainCache = new Map();
    }
    const active = new Set(event ? [event.i, event.j] : []);
    if (this.motion) {
      active.add(this.motion.i);
      active.add(this.motion.j);
    }
    this.active = [...active];
    this.poses = [];
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);
    drawFloor(ctx, g, event ? (g.x(event.i) + g.x(event.j)) / 2 : undefined);
    ctx.font = '10px ' + mono;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const v of [...new Set([0, Math.round(max / 2), max])]) {
      const y = base - maxHeight * (v / max);
      ctx.strokeStyle = 'white';
      ctx.globalAlpha = 0.19;
      ctx.setLineDash([1, 6]);
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.66;
      ctx.fillStyle = 'white';
      ctx.fillText(v, pad - 8, y);
    }
    ctx.globalAlpha = 1;
    // Keep the whole chart inside one pixel budget, including dense 500-value samples.
    const budget = w < 530 ? 12500 : 31000;
    for (let i = 0; i < values.length; i++) {
      const fraction = values[i] / max;
      const count = Math.max(
        12,
        Math.round(Math.min(5400, (budget / values.length) * (0.32 + 1.35 * fraction))),
      );
      const isActive = active.has(i);
      const pose = {
        x: g.x(i),
        height: maxHeight * fraction,
        radius: g.radius,
        dim: !event || (i >= event.scope.lo && i <= event.scope.hi) ? 0.76 : 0.42,
        index: i,
        value: values[i],
        time: 0,
      };
      this.poses.push(pose);
      if (isActive) {
        pose.layers = this.grains(values[i], Math.max(count, Math.min(720, Math.round(step * 33))));
      } else if (step < 3) {
        // A one-pixel-wide column still carries the full value at the largest sample size.
        ctx.fillStyle = 'white';
        ctx.globalAlpha = pose.dim;
        for (let y = 0; y < pose.height; y += 2.4)
          ctx.fillRect(pose.x, base - y, Math.max(0.65, step * 0.64), 1.45);
      } else {
        this.paintStillColumn(ctx, pose, count);
      }
    }
    ctx.globalAlpha = 1;
  }
  tick = (now) => {
    this.raf = 0;
    if (document.hidden || !this.visible) return;
    // Limit drawing, especially on high-refresh screens. Timeline events are independent.
    if (this.lastTime && now - this.lastTime < 1000 / 35) {
      this.queue();
      return;
    }
    const delta = this.lastTime ? Math.max(0, (now - this.lastTime) / 1000) : 0;
    this.lastTime = now;
    this.time += Math.min(0.1, delta);
    this.age += delta;
    this.draw();
  };
  queue() {
    if (!this.raf && this.flow && this.visible && !document.hidden && this.frame?.event)
      this.raf = requestAnimationFrame(this.tick);
  }
  draw() {
    if (!this.frame || !this.w || !this.h) return;
    if (this.motion && this.age >= this.motion.duration) {
      this.motion = null;
      this.dirty = true;
    }
    if (this.dirty) this.rebuild();
    const { ctx, g, frame } = this,
      { event } = frame;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.back, 0, 0, g.w, g.h);
    const time = this.time;
    const change = this.motion,
      t = change ? Math.min(1, this.age / change.duration) : 1;
    const buffer = event?.kind === 'write' ? { x: g.x(event.source), y: 19 } : null;
    // Paint the connection behind the grains, and paint all labels above the connection.
    if (event) {
      const a = this.poses[event.i],
        b = this.poses[event.j];
      floorCurrent(ctx, g, (a.x + b.x) / 2, time);
      const anchor = (p) => ({ x: p.x, y: g.base - p.height * 0.76 });
      if (buffer) {
        const end = anchor(a);
        drawStream(ctx, buffer, end, time, 'write', g.w < 530);
      } else if (a !== b) {
        orbit(ctx, anchor(a), anchor(b), g, time);
        drawStream(ctx, anchor(a), anchor(b), time, event.kind, g.w < 530);
      }
    }
    for (const index of this.active) {
      const pose = this.poses[index];
      pose.kind = null;
      pose.time = time;
      if (t < 1 && change && (index === change.i || index === change.j)) {
        pose.kind = change.kind;
        const start =
          change.kind === 'swap' ? (index === change.i ? change.j : change.i) : change.source;
        pose.drift = g.x(start) - pose.x;
        pose.lift =
          index === change.i
            ? Math.min(47, 16 + Math.abs(pose.drift) * 0.15)
            : -Math.min(15, g.step * 0.3);
        pose.fromY = 19;
        if (change.kind === 'write' && change.from !== undefined) {
          ctx.fillStyle = 'white';
          ctx.globalAlpha = 0.3 * (1 - t);
          const oldHeight = (change.from / frame.max) * g.maxHeight;
          ctx.fillRect(pose.x - g.radius, g.base - oldHeight, Math.max(1, g.radius * 2), 1);
          ctx.globalAlpha = 1;
        }
      }
      ionHalo(ctx, pose.x, g.base, Math.max(10, pose.radius * 2.8), time, 1);
      ionHalo(ctx, pose.x, g.base - pose.height, Math.max(7, pose.radius * 1.6), time, 0.82 * t);
      corona(ctx, pose.x, g.base, Math.max(3.5, pose.radius), time, 0.88);
      cloud(ctx, pose.layers, g, pose, t, true);
    }
    if (this.finish && this.age < 1.15) settlement(ctx, g, this.age / 1.15);
    this.drawLabels(buffer);
    this.queue();
  }
  drawLabels(buffer) {
    const { ctx, g, frame } = this,
      { event, pivot } = frame;
    const labels = [];
    for (const pose of this.poses) {
      const i = pose.index,
        active = event && (i === event.i || i === event.j);
      if (!active && i !== this.picked && i !== pivot && g.step < 24) continue;
      labels.push({
        x: pose.x,
        y: g.base - pose.height - g.radius * g.tilt - 10,
        text: (i === pivot ? 'P ' : '') + pose.value,
        active,
        priority: active || i === this.picked || i === pivot,
      });
    }
    if (buffer)
      labels.unshift({
        x: buffer.x,
        y: 9,
        text: 'B[' + event.source + ']',
        active: true,
        priority: true,
      });
    labels.sort((a, b) => Number(!!b.priority) - Number(!!a.priority));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const placed = [];
    for (const label of labels) {
      ctx.font = (label.priority ? 'bold ' : '') + (g.w < 500 ? '11px ' : '12px ') + mono;
      const width = ctx.measureText(label.text).width + 6,
        x = clamp(label.x, width / 2 + 2, g.w - width / 2 - 2);
      let y = Math.max(9, label.y);
      const overlaps = () =>
        placed.some((p) => Math.abs(x - p.x) < (width + p.width) / 2 + 1 && Math.abs(y - p.y) < 15);
      if (!label.priority && overlaps()) continue;
      while (overlaps() && y < g.base - 5) y += 15;
      placed.push({ x, y, width });
      ctx.globalAlpha = label.active ? 1 : 0.88;
      ctx.fillStyle = label.active ? 'white' : 'black';
      ctx.fillRect(x - width / 2, y - 7, width, 14);
      ctx.fillStyle = label.active ? 'black' : 'white';
      ctx.fillText(label.text, x, y + 0.5);
    }
    ctx.font = '10px ' + mono;
    const skip = Math.max(1, Math.ceil(24 / g.step));
    for (let i = 0; i < frame.values.length; i++) {
      const active = event && (i === event.i || i === event.j);
      if (i % skip && !active && i !== this.picked) continue;
      ctx.fillStyle = 'white';
      ctx.globalAlpha = active || i === this.picked ? 1 : 0.65;
      const x = g.x(i);
      if (active || i === this.picked)
        ctx.fillRect(x - Math.min(7, g.step * 0.35), g.base + 11, Math.min(14, g.step * 0.7), 1.8);
      if (g.step >= 19 || i % skip === 0) ctx.fillText(i, x, g.base + 23);
    }
    ctx.globalAlpha = 1;
  }
}
