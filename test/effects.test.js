import test from 'node:test';
import assert from 'node:assert/strict';
import { geometry, barPose, drawEffect } from '../src/scripts/effects.js';
import { drawBar } from '../src/scripts/stage.js';

const g = geometry(800, 320, 3, 8);
const frame = { values: [3, 8, 5] };
test('an exchanged bar moves as a solid column of constant height', () => {
  const swap = { kind: 'swap', i: 0, j: 1 };
  for (const index of [0, 1]) {
    assert.equal(barPose(frame, g, index, swap, 0).x, g.x(1 - index));
    assert.equal(barPose(frame, g, index, swap, 1).x, g.x(index));
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const p = barPose(frame, g, index, swap, t);
      assert.ok(Math.abs(p.bottom - p.y - (g.base - g.y(frame.values[index]))) < 1e-8);
      const rectangles = [];
      drawBar(
        {
          fillRect(...args) {
            rectangles.push(args);
          },
        },
        p,
        g,
        1,
        0,
      );
      assert.deepEqual(rectangles, Array(2).fill([p.x - g.width / 2, p.y, g.width, p.bottom - p.y]));
    }
  }
  assert.equal(barPose(frame, g, 2, swap, 0.4).x, g.x(2));
});
test('a buffer write changes only the target height and lands on the exact stored value', () => {
  const write = { kind: 'write', i: 1, source: 2, from: 3 };
  assert.equal(barPose(frame, g, 1, write, 0).y, g.y(3));
  assert.equal(barPose(frame, g, 1, write, 1).y, g.y(8));
  assert.deepEqual(barPose(frame, g, 2, write, 0.5), barPose(frame, g, 2, null));
});
test('all four particle effects emit within the event and leave no marks at rest', () => {
  let marks = 0;
  const ctx = {
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    fillRect(...args) {
      assert.ok(args.every(Number.isFinite));
      marks++;
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
  };
  for (const kind of ['compare', 'swap', 'write', 'finish']) {
    const fx = { kind, i: 0, j: 1, source: 1, from: 8 };
    marks = 0;
    drawEffect(ctx, frame, g, fx, 0);
    drawEffect(ctx, frame, g, fx, 1);
    drawEffect(ctx, frame, g, null, 0.4);
    assert.equal(marks, 0);
    drawEffect(ctx, frame, g, fx, 0.32);
    assert.ok(marks > 0);
  }
});
