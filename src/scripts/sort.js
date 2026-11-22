export const algorithms = {
  bubble: '冒泡排序',
  quick: '快速排序',
  merge: '归并排序',
  insertion: '插入排序',
  selection: '选择排序',
  heap: '堆排序',
  cocktail: '鸡尾酒排序',
};

// Scope objects belong to a pass, partition, or merge. Events share their context.
export function buildScore(input, algorithm) {
  const data = input.slice(),
    events = [],
    checkpoints = [];
  const block = 256;
  let comparisons = 0,
    writes = 0,
    scope;
  function checkpoint() {
    checkpoints.push({ data: data.slice(), comparisons, writes });
  }
  function record(event) {
    events.push({ ...event, scope });
    if (events.length % block === 0) checkpoint();
  }
  function compare(i, j, line, left = data[i], right = data[j]) {
    comparisons++;
    record({ kind: 'compare', i, j, left, right, line });
    return left - right;
  }
  function swap(i, j, line) {
    if (i === j) return;
    const left = data[i],
      right = data[j];
    [data[i], data[j]] = [right, left];
    writes += 2;
    record({ kind: 'swap', i, j, left, right, line });
  }
  function quick(lo, hi) {
    if (lo >= hi) return;
    scope = { lo, hi, phase: '分区', pivot: data[hi] };
    let cut = lo;
    for (let i = lo; i < hi; i++) if (compare(i, hi, 2) < 0) swap(i, cut++, 3);
    swap(cut, hi, 4);
    quick(lo, cut - 1);
    quick(cut + 1, hi);
  }
  function merge(lo, hi) {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);
    merge(lo, mid);
    merge(mid + 1, hi);
    const buffer = data.slice(lo, hi + 1);
    scope = { lo, hi, mid, buffer, phase: '合并有序区间' };
    let a = lo,
      b = mid + 1;
    for (let dest = lo; dest <= hi; dest++) {
      const takeLeft = b > hi || (a <= mid && compare(a, b, 3, buffer[a - lo], buffer[b - lo]) <= 0);
      const source = takeLeft ? a++ : b++;
      const value = buffer[source - lo],
        previous = data[dest];
      data[dest] = value;
      writes++;
      record({ kind: 'write', i: dest, j: dest, source, value, previous, line: 4 });
    }
  }
  function sink(root, size) {
    while (root * 2 + 1 < size) {
      let child = root * 2 + 1;
      if (child + 1 < size && compare(child, child + 1, 3) < 0) child++;
      if (compare(root, child, 4) >= 0) return;
      swap(root, child, 5);
      root = child;
    }
  }
  function sweep(lo, hi, direction, pass) {
    const forward = direction > 0;
    scope = { lo, hi, direction, pass, phase: forward ? '向右扫描' : '向左扫描' };
    const start = forward ? lo : hi,
      end = forward ? hi : lo;
    let changed = false;
    for (let i = start; i !== end; i += direction) {
      const left = Math.min(i, i + direction);
      if (compare(left, left + 1, forward ? 2 : 5) > 0) {
        swap(left, left + 1, forward ? 3 : 6);
        changed = true;
      }
    }
    return changed;
  }
  checkpoint();
  const last = data.length - 1;
  switch (algorithm) {
    case 'quick':
      quick(0, last);
      break;
    case 'merge':
      merge(0, last);
      break;
    case 'heap':
      scope = { lo: 0, hi: last, phase: '构建最大堆' };
      for (let root = Math.floor(data.length / 2) - 1; root >= 0; root--) sink(root, data.length);
      for (let end = last; end > 0; end--) {
        scope = { lo: 0, hi: end, phase: '取出堆顶' };
        swap(0, end, 1);
        scope = { lo: 0, hi: end - 1, phase: '修复最大堆' };
        sink(0, end);
      }
      break;
    case 'bubble':
      for (let end = last; end > 0; end--) if (!sweep(0, end, 1, data.length - end)) break;
      break;
    case 'cocktail':
      for (let lo = 0, hi = last; lo < hi; lo++, hi--) {
        if (!sweep(lo, hi, 1, 2 * lo + 1) || !sweep(lo, hi - 1, -1, 2 * lo + 2)) break;
      }
      break;
    case 'insertion':
      for (let end = 1; end <= last; end++) {
        scope = { lo: 0, hi: end, pass: end, phase: '插入有序前缀' };
        for (let j = end; j > 0 && compare(j - 1, j, 2) > 0; j--) swap(j - 1, j, 3);
      }
      break;
    case 'selection':
      for (let end = last; end > 0; end--) {
        scope = { lo: 0, hi: end, pass: data.length - end, phase: '寻找最大值' };
        let max = 0;
        for (let i = 1; i <= end; i++) if (compare(i, max, 2) > 0) max = i;
        swap(max, end, 4);
      }
      break;
    default:
      throw new Error('Unknown sort: ' + algorithm);
  }
  const state = { data: input.slice(), position: 0, comparisons: 0, writes: 0, event: null };
  function seek(position) {
    const target = Math.max(0, Math.min(events.length, Math.round(position)));
    const start = Math.floor(target / block) * block;
    if (target < state.position || state.position < start) {
      const point = checkpoints[start / block];
      Object.assign(state, point, { data: point.data.slice(), position: start });
    }
    for (; state.position < target; state.position++) {
      const { kind, i, j, value } = events[state.position];
      if (kind === 'compare') state.comparisons++;
      if (kind === 'swap') {
        [state.data[i], state.data[j]] = [state.data[j], state.data[i]];
        state.writes += 2;
      }
      if (kind === 'write') {
        state.data[i] = value;
        state.writes++;
      }
    }
    state.event = events[target - 1] || null;
    return state;
  }
  return { state, length: events.length, seek };
}
