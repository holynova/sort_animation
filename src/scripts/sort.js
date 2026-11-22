export const algorithms = {
  quick: '快速排序', merge: '归并排序', heap: '堆排序', bubble: '冒泡排序',
  insertion: '插入排序', selection: '选择排序', cocktail: '鸡尾酒排序'
};

// Keep operations and periodic checkpoints so scrubbing a large sort stays inexpensive.
export function buildScore(input, algorithm) {
  const data = input.slice();
  const events = [];
  const checkpoints = [];
  const block = 256;
  let comparisons = 0;
  let writes = 0;

  function checkpoint() {
    checkpoints.push({ data: data.slice(), comparisons, writes });
  }
  function record(event) {
    events.push(event);
    if (events.length % block === 0) checkpoint();
  }
  function compare(i, j, left = data[i], right = data[j]) {
    comparisons++;
    record({ kind: 'compare', i, j });
    return left - right;
  }
  function swap(i, j) {
    if (i === j) return;
    [data[i], data[j]] = [data[j], data[i]];
    writes += 2;
    record({ kind: 'swap', i, j });
  }
  function write(i, value) {
    const previous = data[i];
    data[i] = value;
    writes++;
    record({ kind: 'write', i, j: i, value, previous });
  }
  function quick(lo, hi) {
    if (lo >= hi) return;
    let pivot = lo;
    for (let i = lo; i < hi; i++) {
      if (compare(i, hi) < 0) swap(i, pivot++);
    }
    swap(pivot, hi);
    quick(lo, pivot - 1);
    quick(pivot + 1, hi);
  }
  function merge(lo, hi) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    merge(lo, mid);
    merge(mid + 1, hi);
    const buffer = data.slice(lo, hi + 1);
    let a = lo, b = mid + 1;
    for (let dest = lo; dest <= hi; dest++) {
      const takeLeft = b > hi || (a <= mid && compare(a, b, buffer[a - lo], buffer[b - lo]) <= 0);
      write(dest, buffer[(takeLeft ? a++ : b++) - lo]);
    }
  }
  function sink(root, size) {
    while (root * 2 + 1 < size) {
      let child = root * 2 + 1;
      if (child + 1 < size && compare(child, child + 1) < 0) child++;
      if (compare(root, child) >= 0) return;
      swap(root, child);
      root = child;
    }
  }
  function sweep(start, end, dir) {
    let changed = false;
    for (let i = start; i !== end; i += dir) {
      const next = i + dir;
      if (compare(i, next) * dir > 0) {
        swap(i, next);
        changed = true;
      }
    }
    return changed;
  }
  checkpoint();
  const last = data.length - 1;
  switch (algorithm) {
    case 'quick': quick(0, last); break;
    case 'merge': merge(0, last); break;
    case 'heap':
      for (let root = Math.floor(data.length / 2) - 1; root >= 0; root--) sink(root, data.length);
      for (let end = last; end > 0; end--) { swap(0, end); sink(0, end); }
      break;
    case 'bubble':
      for (let end = last; end > 0 && sweep(0, end, 1); end--) { /* next pass */ }
      break;
    case 'cocktail':
      for (let lo = 0, hi = last; lo < hi; lo++, hi--) {
        if (!sweep(lo, hi, 1) || !sweep(hi - 1, lo, -1)) break;
      }
      break;
    case 'insertion':
      for (let end = 1; end <= last; end++) {
        for (let j = end; j > 0 && compare(j - 1, j) > 0; j--) swap(j, j - 1);
      }
      break;
    case 'selection':
      for (let end = last; end > 0; end--) {
        let max = 0;
        for (let i = 1; i <= end; i++) if (compare(i, max) > 0) max = i;
        swap(max, end);
      }
      break;
    default: throw new Error('Unknown sort: ' + algorithm);
  }
  const state = { data: input.slice(), position: 0, comparisons: 0, writes: 0, event: null };
  function seek(position) {
    const target = Math.max(0, Math.min(events.length, Math.round(position)));
    const blockStart = Math.floor(target / block) * block;
    if (target < state.position || state.position < blockStart) {
      const point = checkpoints[blockStart / block];
      Object.assign(state, point, { data: point.data.slice(), position: blockStart });
    }
    for (; state.position < target; state.position++) {
      const { kind, i, j, value } = events[state.position];
      if (kind === 'compare') state.comparisons++;
      if (kind === 'swap') {
        [state.data[i], state.data[j]] = [state.data[j], state.data[i]];
        state.writes += 2;
      }
      if (kind === 'write') { state.data[i] = value; state.writes++; }
    }
    state.event = events[target - 1] || null;
    return state;
  }
  return { state, length: events.length, seek };
}
