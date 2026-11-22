import { algorithms, buildScore } from './sort.js';
import { chartValues, explain, lessons } from './lesson.js';
import { ParticlePlot } from './stage.js';
import { icon, iconsIn } from './icons.js';

const byId = (id) => document.getElementById(id);
const el = (tag, text) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
};
iconsIn(document);
let input = [8, 3, 11, 5, 1, 9, 4, 12, 2, 7, 10, 6];
let algorithm = 'bubble',
  score,
  running = false,
  timer,
  hovered = null;
const nodes = {};
for (const id of [
  'play',
  'first',
  'prev',
  'next',
  'last',
  'timeline',
  'progress',
  'action',
  'phase',
  'formula',
  'note',
  'operands',
  'step-no',
  'cells',
  'compares',
  'writes',
  'pseudo',
  'plot-source',
  'samples',
  'speed',
  'dialog',
])
  nodes[id] = byId(id);

const plot = new ParticlePlot(byId('plot'), selectIndex, (index) => {
  hovered = index;
  updatePlotSource();
});

function viewingBuffer() {
  return algorithm === 'merge' && score.state.event?.kind === 'compare';
}

function updatePlotSource() {
  if (!score) return;
  const index = hovered ?? plot.picked,
    scope = score.state.event?.scope;
  const buffered = viewingBuffer();
  let text = buffered ? '区间 [' + scope.lo + '…' + scope.hi + '] 显示缓冲 B' : '工作数组 A';
  if (index !== null) {
    const inBuffer = buffered && index >= scope.lo && index <= scope.hi;
    const name = inBuffer ? 'B' : 'A';
    const value = inBuffer ? scope.buffer[index - scope.lo] : score.state.data[index];
    text += ' · ' + name + '[' + index + '] = ' + value;
  }
  nodes['plot-source'].textContent = text;
}
function selectIndex(index) {
  plot.picked = plot.picked === index ? null : index;
  updateCells();
  updatePlotSource();
  plot.draw(performance.now());
}
function updateCells() {
  const { data, event } = score.state;
  const cells = nodes.cells;
  if (cells.children.length !== data.length) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < data.length; i++) {
      const cell = el('button');
      cell.type = 'button';
      cell.dataset.index = i;
      cell.append(el('small', i), el('b'));
      fragment.append(cell);
    }
    cells.replaceChildren(fragment);
  }
  const buffered = viewingBuffer();
  for (let i = 0; i < data.length; i++) {
    const cell = cells.children[i],
      value = String(data[i]);
    if (cell.lastChild.textContent !== value) {
      cell.lastChild.textContent = value;
      cell.setAttribute('aria-label', 'A[' + i + '] = ' + value);
    }
    cell.classList.toggle('on', !buffered && !!event && (i === event.i || i === event.j));
    cell.classList.toggle('picked', i === plot.picked);
    const pressed = String(i === plot.picked);
    if (cell.getAttribute('aria-pressed') !== pressed) cell.setAttribute('aria-pressed', pressed);
  }
}
nodes.cells.addEventListener('click', (event) => {
  const cell = event.target.closest('button');
  if (cell) selectIndex(Number(cell.dataset.index));
});

function render(motion, arrived) {
  const { state, length } = score,
    { position, event } = state,
    scope = event?.scope;
  const lesson = explain(algorithm, event);
  nodes.action.textContent = lesson.action;
  nodes.phase.textContent = scope
    ? [scope.pass ? '第 ' + scope.pass + ' 趟' : '', scope.phase, '[' + scope.lo + '…' + scope.hi + ']']
        .filter(Boolean)
        .join(' · ')
    : '准备就绪';
  nodes.formula.textContent = lesson.formula;
  nodes.note.textContent = position === length ? lesson.note + ' 排序完成。' : lesson.note;
  nodes['step-no'].textContent = 'STEP ' + String(position).padStart(3, '0');
  nodes.operands.replaceChildren(
    ...lesson.operands.map(([name, value]) => {
      const box = el('div');
      box.className = 'operand';
      box.append(el('span', name), el('b', value));
      return box;
    }),
  );
  Array.from(nodes.pseudo.children).forEach((line, index) => {
    line.classList.toggle('current', index === event?.line);
    if (index === event?.line) line.setAttribute('aria-current', 'step');
    else line.removeAttribute('aria-current');
  });
  nodes.timeline.value = position;
  nodes.timeline.style.setProperty('--fill', (length ? (position / length) * 100 : 0) + '%');
  nodes.progress.value = position + ' / ' + length;
  nodes.compares.textContent = state.comparisons;
  nodes.writes.textContent = state.writes;
  nodes.prev.disabled = nodes.first.disabled = position === 0;
  nodes.next.disabled = nodes.last.disabled = position === length;
  const pivot = algorithm === 'quick' && event ? (event.line === 4 ? event.i : scope.hi) : null;
  plot.show(
    {
      values: chartValues(algorithm, state),
      max: input.length,
      event,
      pivot,
      finished: position === length,
    },
    motion,
    arrived,
  );
  updateCells();
  updatePlotSource();
  updatePlay();
}

function go(target, animated = true) {
  const before = score.state.position,
    previous = score.state.event;
  const { position, event } = score.seek(target);
  const change = before < position ? event : previous;
  const forward = position > before;
  const animateMutation =
    animated &&
    Math.abs(before - position) === 1 &&
    (change?.kind === 'swap' || (change?.kind === 'write' && forward));
  const motion = animateMutation
    ? {
        kind: change.kind,
        i: change.i,
        j: change.j,
        source: change.source,
        from: change.previous,
        duration: running ? Math.min(0.69, 0.76 / Number(nodes.speed.value)) : 0.69,
      }
    : null;
  if (position === score.length) stop();
  render(motion, animated && position === before + 1);
}
function updatePlay() {
  const text = running ? '暂停' : score.state.position === score.length ? '重播' : '播放';
  nodes.play.firstElementChild.innerHTML = icon(running ? 'pause' : 'play');
  nodes.play.lastElementChild.textContent = text;
}
function stop() {
  running = false;
  clearTimeout(timer);
  if (score) updatePlay();
}
function schedule() {
  clearTimeout(timer);
  if (!running || document.hidden) return;
  timer = setTimeout(
    () => {
      go(score.state.position + 1);
      schedule();
    },
    850 / Number(nodes.speed.value),
  );
}
function togglePlay() {
  if (running) {
    stop();
    return;
  }
  if (score.state.position === score.length) go(0, false);
  running = true;
  updatePlay();
  schedule();
}
function manual(target, animated = true) {
  stop();
  go(target, animated);
}

function loadStudy() {
  stop();
  hovered = null;
  plot.picked = null;
  score = buildScore(input, algorithm);
  nodes.timeline.max = score.length;
  nodes.samples.value = input.length;
  const lesson = lessons[algorithm];
  byId('title').textContent = algorithms[algorithm];
  byId('english').textContent = lesson.english;
  byId('summary').textContent = lesson.summary;
  byId('facts').textContent =
    '平均时间 ' + lesson.complexity + '　·　' + (lesson.stable ? '稳定排序' : '非稳定排序');
  nodes.pseudo.replaceChildren(
    ...lesson.code.map((code, i) => {
      const line = el('li');
      line.append(el('span', String(i + 1).padStart(2, '0')), document.createTextNode(code));
      return line;
    }),
  );
  byId('algorithms')
    .querySelectorAll('button')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.key === algorithm)));
  go(Math.min(1, score.length), false);
}
function shuffle(n) {
  const values = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  if (n === input.length && values.every((v, i) => v === input[i]))
    [values[0], values[1]] = [values[1], values[0]];
  input = values;
  loadStudy();
}
for (const [key, label] of Object.entries(algorithms)) {
  const button = el('button', label);
  button.dataset.key = key;
  button.addEventListener('click', () => {
    if (algorithm !== key) {
      algorithm = key;
      loadStudy();
    }
  });
  byId('algorithms').append(button);
}
byId('shuffle').addEventListener('click', () => shuffle(input.length));
nodes.samples.addEventListener('change', () => {
  const n = nodes.samples.valueAsNumber;
  const count = Number.isFinite(n) ? Math.max(2, Math.min(500, Math.round(n))) : input.length;
  if (count !== input.length) shuffle(count);
  else nodes.samples.value = input.length;
});
nodes.play.addEventListener('click', togglePlay);
nodes.first.addEventListener('click', () => manual(0, false));
nodes.prev.addEventListener('click', () => manual(score.state.position - 1));
nodes.next.addEventListener('click', () => manual(score.state.position + 1));
nodes.last.addEventListener('click', () => manual(score.length, false));
nodes.timeline.addEventListener('input', () => manual(Number(nodes.timeline.value), false));
nodes.speed.addEventListener('change', schedule);
document.querySelectorAll('[data-view]').forEach((button) =>
  button.addEventListener('click', () => {
    plot.setView(button.dataset.view === 'front');
    document
      .querySelectorAll('[data-view]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
    byId('graph-name').textContent = plot.front ? '正视粒子' : '三维粒子';
  }),
);
const flowButton = byId('flow');
function updateFlowButton() {
  flowButton.setAttribute('aria-pressed', String(plot.flow));
  flowButton.textContent = plot.flow ? '粒子流动' : '粒子静止';
}
flowButton.addEventListener('click', () => {
  plot.setFlow(!plot.flow);
  updateFlowButton();
});
plot.onFlowChange = updateFlowButton;
updateFlowButton();
byId('help').addEventListener('click', () => {
  stop();
  nodes.dialog.showModal();
});
document.addEventListener('visibilitychange', schedule);
document.addEventListener('keydown', (event) => {
  if (
    nodes.dialog.open ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.target.closest('input,select,textarea,[contenteditable="true"]')
  )
    return;
  switch (event.key) {
    case 'ArrowLeft':
      manual(score.state.position - 1);
      break;
    case 'ArrowRight':
      manual(score.state.position + 1);
      break;
    case 'Home':
      manual(0, false);
      break;
    case 'End':
      manual(score.length, false);
      break;
    case ' ':
      if (event.target.closest('button,a') || event.repeat) return;
      togglePlay();
      break;
    default:
      return;
  }
  event.preventDefault();
});
loadStudy();
