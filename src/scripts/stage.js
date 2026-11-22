import { barPose, drawEffect, geometry } from './effects.js';

const mono = '"SFMono-Regular",Consolas,monospace';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function face(ctx, points, shade) {
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
  ctx.closePath();
  ctx.fillStyle = 'black';
  ctx.fill();
  ctx.globalAlpha = shade;
  ctx.fillStyle = 'white';
  ctx.fill();
  ctx.globalAlpha = 1;
}

// The graph always has solid geometry. Effects paint underneath it, and the text paints last.
export function drawBar(ctx, pose, g, shade, depth) {
  const x = pose.x - g.width / 2,
    y = pose.y,
    w = g.width,
    h = pose.bottom - y;
  if (depth !== 0) {
    const edge = depth > 0 ? x + w : x,
      dy = -Math.abs(depth) * 0.62;
    face(
      ctx,
      [
        [edge, y],
        [edge + depth, y + dy],
        [edge + depth, pose.bottom + dy],
        [edge, pose.bottom],
      ],
      shade * 0.65,
    );
    face(
      ctx,
      [
        [x, y],
        [x + depth, y + dy],
        [x + w + depth, y + dy],
        [x + w, y],
      ],
      Math.min(1, shade + 0.18),
    );
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'black';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'white';
  ctx.globalAlpha = shade;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
}

export class BarPlot {
  constructor(canvas, select, hover) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.front = true;
    this.yaw = 0.58;
    this.picked = null;
    this.visible = true;
    this.reduce = matchMedia('(prefers-reduced-motion: reduce)');
    this.effectsOn = !this.reduce.matches;
    this.reduce.addEventListener('change', () => {
      this.setEffects(!this.reduce.matches);
      this.onEffectsChange?.();
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.intersection = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      if (!this.visible) this.settle();
      else this.draw();
    });
    this.intersection.observe(canvas);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.settle();
      else this.draw();
    });
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      this.drag = { x: event.clientX, y: event.clientY, yaw: this.yaw, moved: false };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointermove', (event) => {
      if (!this.drag) {
        hover(this.hit(event));
        return;
      }
      const dx = event.clientX - this.drag.x;
      if (Math.abs(dx) > 5 || Math.abs(event.clientY - this.drag.y) > 7) this.drag.moved = true;
      if (this.drag.moved && !this.front) {
        this.yaw = clamp(this.drag.yaw + dx * 0.007, -1, 1);
        canvas.classList.add('dragging');
        this.draw();
      }
    });
    const endDrag = () => {
      this.drag = null;
      canvas.classList.remove('dragging');
    };
    canvas.addEventListener('pointerup', (event) => {
      if (this.drag && !this.drag.moved) select(this.hit(event));
      endDrag();
    });
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', () => hover(null));
    this.resize();
  }
  hit(event) {
    if (!this.g) return null;
    const x = event.clientX - this.canvas.getBoundingClientRect().left;
    const index = Math.floor((x - this.g.pad) / this.g.pitch);
    return index >= 0 && index < this.frame.values.length ? index : null;
  }
  resize() {
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    if (!this.w || !this.h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }
  settle() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.action = null;
  }
  setEffects(on) {
    this.effectsOn = on;
    if (!on) this.settle();
    this.draw();
  }
  setView(front) {
    this.front = front;
    this.draw();
  }
  show(frame, action) {
    this.settle();
    this.frame = frame;
    if (action && this.effectsOn && this.visible && !document.hidden) {
      this.action = action;
      this.start = performance.now();
    }
    this.draw();
  }
  tick = (now) => {
    this.raf = 0;
    this.draw(now);
  };
  draw(now = performance.now()) {
    if (!this.frame || !this.w || !this.h) return;
    const { frame, ctx } = this;
    const g = (this.g = geometry(this.w, this.h, frame.values.length, frame.max));
    let op = this.action,
      t = 1;
    if (op) {
      const elapsed = now - this.start;
      if (op.finale && elapsed >= op.duration) {
        t = (elapsed - op.duration) / 960;
        op = { kind: 'finish' };
      } else t = elapsed / op.duration;
      if (t >= 1) {
        this.settle();
        op = null;
        t = 1;
      }
    }
    ctx.fillStyle = 'black';
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, g.w, g.h);
    this.drawAxes(g);
    drawEffect(ctx, frame, g, op, t);
    const poses = frame.values.map((_, i) => barPose(frame, g, i, op, t));
    const depth = this.front ? 0 : this.yaw * Math.min(10, g.pitch * 0.16);
    const order = depth > 0 ? [...poses].reverse() : [...poses];
    // Put travelling columns in front, preserving their value and width while crossing.
    if (op?.kind === 'swap') {
      const layer = (p) => (p.index === op.i || p.index === op.j ? frame.max + 1 - p.value : 0);
      order.sort((a, b) => layer(a) - layer(b));
    }
    for (const pose of order) {
      const i = pose.index,
        e = frame.event;
      const active = e && (e.i === i || e.j === i);
      const shade = active
        ? 1
        : i === this.picked
          ? 0.87
          : e && (i < e.scope.lo || i > e.scope.hi)
            ? 0.34
            : 0.57;
      if (op?.kind === 'swap' && (i === op.i || i === op.j) && t > 0 && t < 0.73) {
        ctx.fillStyle = 'black';
        ctx.fillRect(pose.x - g.width / 2 - 1.5, pose.y - 1.5, g.width + 3, pose.bottom - pose.y + 3);
      }
      drawBar(ctx, pose, g, shade, depth);
    }
    this.drawLabels(g, poses, depth, op, t);
    if (this.action && !this.raf) this.raf = requestAnimationFrame(this.tick);
  }
  drawAxes(g) {
    const ctx = this.ctx,
      max = this.frame.max;
    ctx.font = '10px ' + mono;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const value of [...new Set([0, Math.round(max / 2), max])]) {
      const y = g.y(value);
      ctx.fillStyle = 'white';
      ctx.globalAlpha = 0.55;
      ctx.fillText(value, g.pad - 9, y);
      ctx.globalAlpha = value === 0 ? 0.34 : 0.16;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 0.7;
      ctx.setLineDash(value === 0 ? [] : [2, 6]);
      ctx.beginPath();
      ctx.moveTo(g.pad, y);
      ctx.lineTo(g.w - g.pad, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
  drawLabels(g, poses, depth, op, t) {
    const { ctx, frame } = this,
      e = frame.event;
    const labels = [];
    for (const p of poses) {
      const active = !!e && (e.i === p.index || e.j === p.index),
        pivot = frame.pivot === p.index;
      const priority = active || pivot || p.index === this.picked;
      if (!priority && g.pitch < 24) continue;
      labels.push({
        x: p.x + depth * 0.35,
        y: p.y - Math.abs(depth) * 0.62 - 11,
        text: (pivot ? 'P ' : '') + p.value,
        active,
        priority,
      });
    }
    if (op?.kind === 'write' && t < 0.73)
      labels.unshift({
        x: g.x(op.source),
        y: 13,
        text: 'B[' + op.source + ']',
        active: true,
        priority: true,
      });
    labels.sort((a, b) => Number(b.priority) - Number(a.priority));
    const placed = [];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const label of labels) {
      ctx.font = (label.priority ? 'bold ' : '') + (g.w < 500 ? '11px ' : '12px ') + mono;
      const width = ctx.measureText(label.text).width + 6;
      const x = clamp(label.x, width / 2 + 1, g.w - width / 2 - 1);
      let y = Math.max(9, label.y);
      const overlap = () =>
        placed.some((p) => Math.abs(x - p.x) < (width + p.width) / 2 + 2 && Math.abs(y - p.y) < 15);
      if (!label.priority && overlap()) continue;
      while (overlap() && y < g.base - 10) y += 15;
      placed.push({ x, y, width });
      ctx.fillStyle = label.active ? 'white' : 'black';
      ctx.fillRect(x - width / 2, y - 7, width, 14);
      ctx.fillStyle = label.active ? 'black' : 'white';
      ctx.globalAlpha = label.priority ? 1 : 0.83;
      ctx.fillText(label.text, x, y + 0.5);
      ctx.globalAlpha = 1;
    }
    const skip = Math.max(1, Math.ceil(24 / g.pitch));
    ctx.font = '10px ' + mono;
    ctx.fillStyle = 'white';
    for (let i = 0; i < poses.length; i++) {
      const active = !!e && (i === e.i || i === e.j);
      if (i % skip && !active && i !== this.picked) continue;
      const x = g.x(i);
      ctx.globalAlpha = active || i === this.picked ? 1 : 0.56;
      if (active || i === this.picked)
        ctx.fillRect(x - Math.min(7, g.pitch * 0.34), g.base + 4, Math.min(14, g.pitch * 0.68), 1.5);
      if (g.pitch >= 19 || i % skip === 0) ctx.fillText(i, x, g.base + 16);
    }
    ctx.globalAlpha = 1;
  }
}
