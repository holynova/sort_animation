import test from 'node:test';
import assert from 'node:assert/strict';
import { cloud, makeCloud } from '../src/scripts/grains.js';

// Capture the individual grains at both ends of a transfer, before drawing its rim.
function dots(pose, time) {
  const result = [];
  const ctx = {
    fillRect(x, y) {
      result.push([x, y]);
    },
    beginPath() {},
    ellipse() {},
    stroke() {},
  };
  cloud(ctx, makeCloud(8, 40), { base: 150, tilt: 0.27, yaw: 0.5 }, pose, time, true);
  return result;
}

test('swap transports the same grains from the old slot into the destination', () => {
  const final = { x: 120, height: 96, radius: 15, time: 0, kind: 'swap', drift: -60, lift: 25 };
  assert.deepEqual(dots(final, 1), dots({ ...final, kind: null }, 1));
  const start = dots(final, 0),
    origin = dots({ ...final, x: 60, kind: null }, 1);
  for (let i = 0; i < start.length; i++) {
    assert.ok(Math.abs(start[i][0] - origin[i][0]) < 1e-10);
    assert.equal(start[i][1], origin[i][1]);
  }
  assert.notDeepEqual(dots(final, 0.5), start);
});

test('a merge write originates on the buffer rail and reconstructs its value column', () => {
  const pose = { x: 35, height: 60, radius: 12, time: 0, kind: 'write', drift: 110, fromY: 19 };
  for (const [x, y] of dots(pose, 0)) {
    assert.ok(Math.abs(x - 145) < 2);
    assert.ok(Math.abs(y - 19) < 3);
  }
  assert.deepEqual(dots(pose, 1), dots({ ...pose, kind: null }, 1));
});
