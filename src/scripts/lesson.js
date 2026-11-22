export const lessons = {
  bubble: {
    english: 'Bubble sort',
    complexity: 'O(n²)',
    stable: true,
    summary: '从左向右比较相邻元素，每一趟把当前最大值送到右端。',
    code: [
      'for end = n−1 … 1',
      '  for i = 0 … end−1',
      '    if A[i] > A[i+1]',
      '      swap(A[i], A[i+1])',
      '  若本趟没有交换，结束',
    ],
  },
  quick: {
    english: 'Quicksort',
    complexity: 'O(n log n)',
    stable: false,
    summary: '选区间末尾的值作为基准，把较小元素移到左侧，再分别处理两边。',
    code: [
      'pivot = A[hi]; cut = lo',
      'for i = lo … hi−1',
      '  if A[i] < pivot',
      '    swap(A[i], A[cut]); cut++',
      'swap(A[cut], A[hi])',
      '递归处理基准左右两段',
    ],
  },
  merge: {
    english: 'Merge sort',
    complexity: 'O(n log n)',
    stable: true,
    summary: '先排好左右两半，再从两个缓冲区的头部取较小值，依次写回数组。',
    code: [
      '递归排好左右两半',
      '复制 A[lo…hi] 到缓冲 B',
      'for k = lo … hi',
      '  比较两侧头部，跳过空侧',
      '  A[k] = B[选中的头部]',
      '  选中一侧的指针前进',
    ],
  },
  insertion: {
    english: 'Insertion sort',
    complexity: 'O(n²)',
    stable: true,
    summary: '从第二个元素开始，向左交换，直到它进入有序前缀中的合适位置。',
    code: [
      'for end = 1 … n−1',
      '  j = end',
      '  while j > 0 and A[j−1] > A[j]',
      '    swap(A[j−1], A[j])',
      '    j = j−1',
    ],
  },
  selection: {
    english: 'Selection sort',
    complexity: 'O(n²)',
    stable: false,
    summary: '扫描未排序区间，记住最大值的位置，再把它放到区间末尾。',
    code: [
      'for end = n−1 … 1',
      '  max = 0; for i = 1 … end',
      '    if A[i] > A[max]',
      '      max = i',
      '  swap(A[max], A[end])',
    ],
  },
  heap: {
    english: 'Heapsort',
    complexity: 'O(n log n)',
    stable: false,
    summary: '先建最大堆，再把堆顶移到末尾，通过下沉恢复堆的顺序。',
    code: [
      '从末个父节点依次下沉建堆',
      '交换堆顶与末尾，缩小堆',
      '下沉时，只看当前节点的孩子',
      '  child = 较大孩子的位置',
      '  if A[root] ≥ A[child]: 停止',
      '  swap(A[root], A[child])',
      '  root = child，继续下沉',
    ],
  },
  cocktail: {
    english: 'Cocktail shaker sort',
    complexity: 'O(n²)',
    stable: true,
    summary: '向右推最大值，再向左推最小值。两端交替收紧，直到中间有序。',
    code: [
      'while lo < hi',
      '  从 lo 向 hi 扫描',
      '    if A[i] > A[i+1]',
      '      swap(A[i], A[i+1])',
      '  收紧右界，反向扫描',
      '    if A[i−1] > A[i]',
      '      swap(A[i−1], A[i])',
      '  收紧左界；无交换则结束',
    ],
  },
};

export function explain(key, event) {
  if (!event)
    return {
      action: '起点',
      formula: '初始数组',
      note: '尚未执行操作。下一步会标出参与比较的元素。',
      operands: [],
    };
  const { kind, i, j, left, right, scope } = event;
  const a = (index) => 'A[' + index + ']';
  const relation = left === right ? '=' : left < right ? '<' : '>';
  if (kind === 'write')
    return {
      action: '写回',
      formula: event.previous + ' → ' + event.value,
      note: `从${event.source <= scope.mid ? '左' : '右'}侧缓冲取出 ${event.value}，写入 ${a(i)}。`,
      operands: [
        ['缓冲 B[' + event.source + ']', event.value],
        [a(i) + ' 原值', event.previous],
      ],
    };
  if (kind === 'swap') {
    let note = `${left} 移到下标 ${j}，${right} 移到下标 ${i}。`;
    if (key === 'quick') note += event.line === 4 ? ' 基准值到达最终位置。' : ' 较小值进入左分区。';
    if (key === 'heap' && event.line === 1) note += ' 本轮最大值归位。';
    if (key === 'selection') note += ' 本轮最大值归位。';
    return {
      action: '交换',
      formula: left + ' ⇄ ' + right,
      note,
      operands: [
        [a(i), left + ' → ' + right],
        [a(j), right + ' → ' + left],
      ],
    };
  }
  let note;
  switch (key) {
    case 'quick':
      note =
        left < right
          ? '扫描值小于基准，纳入左分区并推进分界。'
          : '扫描值大于或等于基准，继续扫描下一个位置。';
      break;
    case 'merge':
      note =
        left <= right ? '左侧头部较小或相等，接下来写回左侧值。' : '右侧头部较小，接下来写回右侧值。';
      break;
    case 'selection':
      note =
        left > right
          ? '扫描值更大，把它记为新的最大候选。'
          : '扫描值没有超过当前候选，保留最大值的位置。';
      break;
    case 'heap':
      note =
        event.line === 3
          ? left < right
            ? '右孩子更大，选它与父节点比较。'
            : '左孩子较大或相等，选它与父节点比较。'
          : left < right
            ? '父节点小于较大孩子，下一步交换并继续下沉。'
            : '父节点已不小于孩子，本次下沉结束。';
      break;
    case 'insertion':
      note =
        left > right
          ? '前一项偏大，下一步交换，让待插入值向左移动。'
          : '前一项不大于待插入值，插入位置已找到。';
      break;
    default:
      note =
        left > right ? '左值大于右值，下一步交换这两个相邻元素。' : '相邻两项已经有序，保持当前位置。';
  }
  let roles = ['左项', '右项'];
  if (key === 'quick') roles = ['扫描', '基准'];
  if (key === 'selection') roles = ['扫描', '候选'];
  if (key === 'heap') roles = event.line === 3 ? ['左孩子', '右孩子'] : ['父节点', '较大孩子'];
  const source = key === 'merge' ? 'B' : 'A';
  return {
    action: '比较',
    formula: left + ' ' + relation + ' ' + right,
    note,
    operands: [
      [roles[0] + ' ' + source + '[' + i + ']', left],
      [roles[1] + ' ' + source + '[' + j + ']', right],
    ],
  };
}

export function chartValues(key, state) {
  const e = state.event;
  if (key !== 'merge' || e?.kind !== 'compare') return state.data;
  const data = state.data.slice();
  data.splice(e.scope.lo, e.scope.buffer.length, ...e.scope.buffer);
  return data;
}
