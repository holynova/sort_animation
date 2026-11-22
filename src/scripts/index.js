import { buildScore } from './sort.js';
import { worlds } from './worlds.js';
import { iconsIn, icon } from './icons.js';
import { Stage } from './stage.js';
import { Soundtrack } from './audio.js';

const $ = id => document.getElementById(id);
const reducedMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
const guide = $('guide');
const stage = new Stage($('visual'), worlds[0], reducedMedia.matches);
const audio = new Soundtrack(worlds[0]);
let worldIndex = 0, score, sample, max;
let playing = false, endAt = 0, previousTime = 0, fractionalSteps = 0;
let beatPhase = 0, lastTick = -1, lastDraw = -10000, drawNeeded = true;
let resumeOnVisibility = false;
let visible = true;
function generate(n) {
  const values = Array.from({length:n}, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
function ui() {
  const { position, comparisons, writes } = score.state;
  const ended = position === score.length;
  $('timeline').value = position;
  $('timeline').style.setProperty('--fill', (100 * position / score.length) + '%');
  $('progress-count').textContent = position.toLocaleString() + ' / ' + score.length.toLocaleString();
  $('compares').textContent = String(comparisons).padStart(4, '0');
  $('writes').textContent = String(writes).padStart(4, '0');
  $('first').disabled = $('prev').disabled = !position;
  $('last').disabled = $('next').disabled = ended;
  const label = playing ? '暂停演出' : ended ? '再次演出' : position ? '继续演出' : '开始演出';
  if ($('play').lastElementChild.textContent !== label) {
    $('play').innerHTML = '<i data-icon>' + icon(playing ? 'pause' : 'play') + '</i><span>' + label + '</span>';
  }
  const status = playing ? '演出中' : ended ? '已完成' : position ? '已暂停' : '就绪';
  if ($('status').textContent !== status) $('status').textContent = status;
  $('instrument').classList.toggle('is-playing', playing);
  drawNeeded = true;
}
function pause() {
  playing = false;
  endAt = 0;
  audio.stop();
}
function reset(randomize) {
  pause();
  if (randomize) sample = generate(Number($('samples').value));
  max = Math.max(...sample);
  score = buildScore(sample, $('algorithm').value);
  $('timeline').max = score.length;
  stage.clear();
  ui();
}
function start() {
  if (score.state.position === score.length) score.seek(0);
  playing = true;
  endAt = fractionalSteps = beatPhase = 0;
  lastTick = -1;
  previousTime = performance.now();
  stage.clear();
  audio.start();
  ui();
}
function toggle() {
  if (playing) { pause(); ui(); } else start();
}
function act(time, single = false) {
  const { event, data } = score.state;
  if (!event) return;
  stage.react(event, data, max, time);
  audio.note(data[event.i] / max, event.i / Math.max(1, data.length - 1), event.kind, lastTick, single);
}
function scrub(index, audition = false) {
  pause(); stage.clear();
  score.seek(index);
  if (audition && score.state.event) { audio.unlock(); act(performance.now(), true); }
  ui();
}
function selectWorld(index) {
  worldIndex = index;
  const w = worlds[index];
  document.documentElement.style.setProperty('--accent', w.accent);
  for (const image of $('backdrop').children) image.style.opacity = Number(image.dataset.world == index);
  $('scene-number').textContent = 'SCENE 0' + (index + 1);
  $('scene-name').textContent = w.name;
  $('scene-english').textContent = w.english;
  $('stage-bpm').textContent = w.bpm;
  for (const button of $('world-list').children) button.setAttribute('aria-pressed', button.dataset.world == index);
  stage.setWorld(w);
  audio.setWorld(w);
  beatPhase = 0; lastTick = -1;
  drawNeeded = true;
}
function soundSwitch() {
  audio.enabled = !audio.enabled;
  if (audio.enabled) audio.unlock();
  audio.level(playing);
  $('audio').setAttribute('aria-pressed', audio.enabled);
  $('audio').innerHTML = '<i data-icon>' + icon(audio.enabled ? 'volume' : 'mute') + '</i><span>声音' + (audio.enabled ? '开启' : '关闭') + '</span>';
}
function setImmersiveUI() {
  const el = $('instrument');
  const on = el.classList.contains('fallback-full') || document.fullscreenElement === el;
  const title = on ? '退出沉浸模式' : '进入沉浸模式';
  $('immersive').innerHTML = '<i data-icon>' + icon(on ? 'collapse' : 'expand') + '</i>';
  $('immersive').title = title + ' (F)';
  $('immersive').setAttribute('aria-label', title);
}
async function immersive() {
  const el = $('instrument');
  if (el.classList.contains('fallback-full')) el.classList.remove('fallback-full');
  else if (document.fullscreenElement) await document.exitFullscreen();
  else {
    try { await el.requestFullscreen(); }
    catch { el.classList.add('fallback-full'); }
  }
  setImmersiveUI();
}
function loop(time) {
  requestAnimationFrame(loop);
  if (document.hidden || (!visible && !playing && !endAt)) { previousTime = time; return; }
  const dt = Math.max(0, Math.min(100, time - previousTime));
  previousTime = time;
  if (playing) {
    const bpm = worlds[worldIndex].bpm;
    beatPhase += dt * bpm / 15000;
    const tick = Math.floor(beatPhase);
    if (tick !== lastTick) {
      lastTick = tick;
      audio.beat(tick, score.state.position / score.length);
      if (tick % 4 === 0) stage.downbeat(time);
    }
    // Large samples group operations into one display frame without dropping history.
    const baseRate = Math.max(8 * bpm / 60, score.length / 80);
    fractionalSteps += dt / 1000 * baseRate * Number($('speed').value);
    const steps = Math.floor(fractionalSteps);
    if (steps) {
      fractionalSteps -= steps;
      const before = score.state.position / score.length;
      score.seek(score.state.position + steps);
      act(time);
      const after = score.state.position / score.length;
      if (Math.floor(before * 4) < Math.floor(after * 4)) stage.surge(time);
      if (score.state.position === score.length) {
        playing = false;
        audio.active = false;
        endAt = time;
        stage.finish(time, score.state.data, max);
        audio.finish();
      }
      ui();
    }
  } else if (endAt && time - endAt > 2500) {
    endAt = 0;
    if ($('continuous').checked) {
      selectWorld((worldIndex + 1) % worlds.length);
      reset(true); start();
    }
  }
  const idleInterval = stage.reduced ? Infinity : 1000 / 24;
  if (drawNeeded || stage.dirty || time - lastDraw >= (playing || endAt ? 1000 / 65 : idleInterval)) {
    if (visible) stage.render(score.state, max, time); lastDraw = time; drawNeeded = false;
  }
}

$('world-list').innerHTML = worlds.map((w,i) =>
  `<button class="world" data-world="${i}" aria-pressed="${i === 0}" aria-label="${w.name}，${w.tone}，${w.bpm} BPM" title="${w.tone}" style="--card-accent:${w.accent}"><img src="./worlds/${w.id}.webp" class="art" alt=""><span class="track-no">TRACK 0${i+1}</span><span class="world-check"><i data-icon="check"></i></span><span class="world-copy"><strong>${w.name}</strong><small>${w.english}</small></span><span class="card-bpm"><i data-icon="music"></i>${w.bpm} BPM</span></button>`
).join('');
$('backdrop').innerHTML = worlds.map((w,i) => `<img alt="" data-world="${i}" src="./worlds/${w.id}.webp" style="opacity:${i===0?1:0}">`).join('');
iconsIn(document);
$('world-list').addEventListener('click', event => {
  const button = event.target.closest('button[data-world]');
  if (button && Number(button.dataset.world) !== worldIndex) { endAt = 0; selectWorld(Number(button.dataset.world)); }
});
$('play').onclick = toggle;
$('shuffle').onclick = () => reset(true);
$('algorithm').onchange = () => reset(false);
$('samples').onchange = () => {
  const n = $('samples').valueAsNumber;
  $('samples').value = Number.isFinite(n) ? Math.max(2, Math.min(500, Math.round(n))) : sample.length;
  if (Number($('samples').value) !== sample.length) reset(true);
};
$('timeline').oninput = () => scrub(Number($('timeline').value));
$('first').onclick = () => scrub(0);
$('prev').onclick = () => scrub(score.state.position - 1, true);
$('next').onclick = () => scrub(score.state.position + 1, true);
$('last').onclick = () => scrub(score.length);
$('audio').onclick = soundSwitch;
$('immersive').onclick = immersive;
document.addEventListener('fullscreenchange', setImmersiveUI);
$('help').onclick = () => { pause(); ui(); guide.showModal(); };
$('reduced').checked = stage.reduced;
$('reduced').onchange = () => { stage.reduced = $('reduced').checked; stage.clear(); drawNeeded = true; };
document.addEventListener('keydown', e => {
  if (guide.open || e.ctrlKey || e.altKey || e.metaKey || /^(SELECT|INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.code === 'Space' && /^(BUTTON|A)$/.test(e.target.tagName)) return;
  const actions = { Space:toggle, ArrowLeft:() => scrub(score.state.position - 1, true), ArrowRight:() => scrub(score.state.position + 1, true),
    Home:() => scrub(0), End:() => scrub(score.length), KeyR:() => reset(true), KeyF:immersive, KeyM:soundSwitch,
    Escape:() => { $('instrument').classList.remove('fallback-full'); setImmersiveUI(); } };
  if (actions[e.code]) { e.preventDefault(); if (!e.repeat || e.code.startsWith('Arrow')) actions[e.code](); }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resumeOnVisibility = playing;
    if (playing) { playing = false; ui(); }
    audio.stop();
  } else if (resumeOnVisibility) {
    resumeOnVisibility = false;
    playing = true;
    audio.start();
    ui();
  }
  previousTime = performance.now();
});
new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting;
  drawNeeded = true;
  previousTime = performance.now();
}).observe($('instrument'));

reset(true);
requestAnimationFrame(loop);
