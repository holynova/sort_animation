import assert from 'node:assert/strict';
import test from 'node:test';
import { Impact, scatterAt } from '../src/scripts/impact.js';
import { algorithms, buildScore } from '../src/scripts/sort.js';

test('clear cues fire on the last visit and each band stays sorted afterwards', () => {
  for (const algorithm of Object.keys(algorithms)) {
    const input = Array.from({length: 50}, (_, i) => (17 * i + 13) % 50);
    const sorted = input.slice().sort((a,b) => a-b);
    const score = buildScore(input, algorithm);
    const visits = new Uint32Array(input.length);
    for (let step = 1; step <= score.length; step++) {
      const { event } = score.seek(step);
      visits[event.i] = visits[event.j] = step;
    }
    let next = 0;
    for (const { first, last, step } of score.bands) {
      assert.equal(first, next);
      assert.equal(step, Math.max(...visits.subarray(first, last + 1)));
      assert.deepEqual(score.seek(step).data.slice(first, last + 1), sorted.slice(first, last + 1));
      next = last + 1;
    }
    assert.equal(next, input.length);
  }
});

test('shards depart, hang, and return completely across a maximum-size sweep', () => {
  assert.deepEqual([-.1, 0, .29, .41, 1, 2].map(scatterAt), [0,0,1,1,0,0]);
  for (let i=1; i<100; i++) assert.ok(scatterAt(i/100) >= 0 && scatterAt(i/100) <= 1);
  const effect = new Impact({style:{}});
  effect.clearBand(0,499,200,870,500,1);
  assert.equal(effect.fractures.size,500);
  assert.equal(effect.fractures.get(0).start,200);
  assert.equal(effect.fractures.get(499).start,1070);
  assert.ok([...effect.fractures.values()].every(f=>f.chips.length===4));
});

test('screen shake decays to an exact reset and clearing cancels pending effects', () => {
  const camera = {style:{}}, effect = new Impact(camera);
  effect.kick(500,10); effect.move(505,390,310);
  assert.match(camera.style.transform,/translate3d/);
  effect.move(900,390,310);
  assert.equal(camera.style.transform,'');
  effect.clearBand(2,4,800,145,64,12);
  effect.kick(1000,9); effect.move(1003,1300,430); effect.reset();
  assert.equal(effect.fractures.size,0);
  assert.equal(camera.style.transform,'');
});
