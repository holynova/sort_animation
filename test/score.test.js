import assert from 'node:assert/strict';
import test from 'node:test';
import { chartValues, explain, lessons } from '../src/scripts/lesson.js';
import { algorithms, buildScore } from '../src/scripts/sort.js';

for (const key of Object.keys(algorithms)) {
  test(key + ' sorts and reconstructs every operation while seeking', () => {
    for (const input of [
      [],
      [1],
      [2, 1],
      [3, 3, 3],
      [-2, 5, 3, 1, -2],
      Array.from({ length: 38 }, (_, i) => (i * 37) % 31),
    ]) {
      const original = input.slice(),
        score = buildScore(input, key),
        history = [];
      for (let pos = 0; pos <= score.length; pos++) {
        const step = score.seek(pos);
        history.push({ values: step.data.slice(), writes: step.writes, comparisons: step.comparisons });
        if (step.event)
          for (const ix of [step.event.i, step.event.j]) assert.ok(ix >= 0 && ix < input.length);
      }
      assert.deepEqual(
        score.state.data,
        input.slice().sort((a, b) => a - b),
      );
      assert.deepEqual(input, original);
      // Jump across and back over multiple 256-operation checkpoint boundaries.
      for (const pos of [
        score.length >> 1,
        0,
        score.length,
        Math.min(257, score.length),
        Math.min(255, score.length),
        0,
      ]) {
        const step = score.seek(pos);
        assert.deepEqual(
          { values: step.data, writes: step.writes, comparisons: step.comparisons },
          history[pos],
        );
      }
    }
  });
  test(key + ' supports the largest sample with a reversed input', () => {
    const values = Array.from({ length: 500 }, (_, i) => 500 - i);
    const score = buildScore(values, key);
    assert.deepEqual(score.seek(score.length).data, values.slice().reverse());
    assert.deepEqual(score.seek(0).data, values);
  });
}
test('the introductory comparison and exchange match the data, counters and explanation', () => {
  const score = buildScore([8, 3], 'bubble');
  const compared = score.seek(1);
  assert.deepEqual(compared.data, [8, 3]);
  assert.equal(compared.comparisons, 1);
  assert.equal(compared.writes, 0);
  assert.deepEqual(explain('bubble', compared.event).operands, [
    ['左项 A[0]', 8],
    ['右项 A[1]', 3],
  ]);
  assert.equal(explain('bubble', compared.event).formula, '8 > 3');
  const swapped = score.seek(2);
  assert.deepEqual(swapped.data, [3, 8]);
  assert.equal(swapped.writes, 2);
  assert.equal(explain('bubble', swapped.event).formula, '8 ⇄ 3');
  assert.deepEqual(score.seek(1).data, [8, 3]);
});

for (const key of Object.keys(algorithms)) {
  test(key + ' explains the actual operands on the matching code line', () => {
    const input = [5, 4, 4, 6, 1, 0, 2],
      score = buildScore(input, key);
    let before = input.slice(),
      sawBufferDisagree = false;
    for (let pos = 1; pos <= score.length; pos++) {
      const state = score.seek(pos),
        e = state.event,
        plot = chartValues(key, state);
      for (const i of [e.i, e.j]) assert.ok(i >= e.scope.lo && i <= e.scope.hi);
      assert.ok(lessons[key].code[e.line]);
      assert.ok(explain(key, e).note.length);
      if (e.kind === 'compare') {
        assert.deepEqual(state.data, before);
        assert.equal(plot[e.i], e.left);
        assert.equal(plot[e.j], e.right);
        sawBufferDisagree ||= e.left !== before[e.i] || e.right !== before[e.j];
      } else if (e.kind === 'write') {
        assert.equal(e.scope.buffer[e.source - e.scope.lo], e.value);
        assert.equal(before[e.i], e.previous);
        assert.equal(state.data[e.i], e.value);
      } else {
        assert.deepEqual([before[e.i], before[e.j]], [e.left, e.right]);
        assert.deepEqual([state.data[e.i], state.data[e.j]], [e.right, e.left]);
      }
      before = state.data.slice();
    }
    assert.equal(sawBufferDisagree, key === 'merge');
  });
}
