import assert from 'node:assert/strict';
import test from 'node:test';
import { algorithms, buildScore } from '../src/scripts/sort.js';

for (const key of Object.keys(algorithms)) {
  test(key + ' sorts and reconstructs every operation while seeking', () => {
    for (const input of [[], [1], [2, 1], [3, 3, 3], [-2, 5, 3, 1, -2], Array.from({length:38}, (_,i) => (i * 37) % 31)]) {
      const original = input.slice(), score = buildScore(input, key), history = [];
      for (let pos = 0; pos <= score.length; pos++) {
        const step = score.seek(pos);
        history.push({ values: step.data.slice(), writes:step.writes, comparisons:step.comparisons });
        if (step.event) for (const ix of [step.event.i, step.event.j]) assert.ok(ix >= 0 && ix < input.length);
      }
      assert.deepEqual(score.state.data, input.slice().sort((a,b) => a-b));
      assert.deepEqual(input, original);
      // Jump across and back over multiple 256-operation checkpoint boundaries.
      for (const pos of [score.length >> 1, 0, score.length, Math.min(257, score.length), Math.min(255, score.length), 0]) {
        const step = score.seek(pos);
        assert.deepEqual({ values:step.data, writes:step.writes, comparisons:step.comparisons },history[pos]);
      }
    }
  });
  test(key + ' supports the largest sample with a reversed input', () => {
    const values = Array.from({length:500}, (_,i) => 500-i);
    const score = buildScore(values, key);
    assert.deepEqual(score.seek(score.length).data, values.slice().reverse());
    assert.deepEqual(score.seek(0).data, values);
  });
}
test('comparison and write counters match the changes seen at each step', () => {
  const score = buildScore([4, 1], 'quick');
  assert.equal(score.length, 2);
  assert.deepEqual(score.seek(1), { position:1, data:[4,1], writes:0, comparisons:1, event:{ kind:'compare',i:0,j:1 } });
  assert.deepEqual(score.seek(2), { position:2, data:[1,4], writes:2, comparisons:1, event:{ kind:'swap',i:0,j:1 } });
});
