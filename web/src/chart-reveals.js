// Reveal data in place. Geometry and final values are never interpolated or changed.
const records = new WeakMap();
const jobs = new Set();
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const ease = 'cubic-bezier(.37,0,.22,1)';
let flowMaskId = 0;
const enabled = typeof IntersectionObserver !== 'undefined' && typeof Element.prototype.animate === 'function';
const onIntersect = entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    const job = [...jobs].find(job => job.element === entry.target);
    if (job) play(job);
  }
};
const observer = enabled ? new IntersectionObserver(onIntersect, {threshold: .12, rootMargin: '0px 0px -36px 0px'}) : null;
const atlasObserver = enabled ? new IntersectionObserver(onIntersect, {threshold: 0, rootMargin: '0px 0px -36px 0px'}) : null;

function finish(job, seen = true) {
  observer?.unobserve(job.element);
  atlasObserver?.unobserve(job.element);
  for (const animation of job.animations) animation.cancel();
  job.animations.length = 0;
  for (const cleanup of job.cleanups) cleanup();
  job.cleanups.length = 0;
  job.element.style.opacity = job.opacity;
  job.element.dataset.revealState = 'complete';
  job.element.removeEventListener('pointerdown', job.interact, true);
  job.element.removeEventListener('focusin', job.interact, true);
  if (seen) job.record.started = true;
  jobs.delete(job);
  job.record.jobs.delete(job);
}
function finishAll() { for (const job of [...jobs]) finish(job); }
motion.addEventListener('change', () => { if (motion.matches) finishAll(); });
addEventListener('beforeprint', finishAll);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) for (const job of [...jobs]) if (job.playing) finish(job);
});

const typeFor = (kind, index) => {
  if (kind === 'f08') return index === 0 ? 'scatter' : 'bars';
  if (['f13'].includes(kind)) return 'flow';
  if (['network-chart', 'f14'].includes(kind)) return 'network';
  if (['overview-chart', 'f02', 'f15'].includes(kind)) return 'line';
  if (kind === 'f23') return 'distribution';
  if (kind === 'f07') return 'composition';
  if (['f01', 'f03', 'f10', 'f11', 'f12', 'f16'].includes(kind)) return 'matrix';
  if (['camera-chart', 'f05', 'f25'].includes(kind)) return 'scatter';
  return kind === 'atlas' ? 'atlas' : 'bars';
};

export function revealCharts(host, kind) {
  if (!host) return;
  let record = records.get(host);
  if (!record) { record = {started: false, jobs: new Set()}; records.set(host, record); }
  // A resized or filtered chart is immediately readable, without replaying its entrance.
  for (const job of [...record.jobs]) finish(job, job.playing);
  if (record.started || !enabled || motion.matches) { record.started = true; return; }
  const elements = kind === 'atlas' ? [host] : [...host.querySelectorAll('svg[role="group"], .matrix-cards')];
  elements.forEach((element, index) => {
    const job = {element, record, type: typeFor(kind, index), opacity: element.style.opacity, animations: [], cleanups: [], playing: false};
    job.interact = () => finish(job);
    element.style.opacity = '0';
    element.dataset.revealState = 'pending';
    element.dataset.revealType = job.type;
    element.addEventListener('pointerdown', job.interact, true);
    element.addEventListener('focusin', job.interact, true);
    record.jobs.add(job); jobs.add(job); (job.type==='atlas'?atlasObserver:observer).observe(element);
  });
}

function play(job) {
  if (job.playing || !jobs.has(job)) return;
  if (motion.matches || !job.element.isConnected) { finish(job); return; }
  observer.unobserve(job.element);
  atlasObserver.unobserve(job.element);
  job.playing = true; job.record.started = true;
  const root = job.element, type = job.type;
  root.style.opacity = job.opacity;
  root.dataset.revealState = 'playing';
  const all = selector => [...root.querySelectorAll(selector)];
  const opacity = element => Number(getComputedStyle(element).opacity);
  const animate = (element, frames, duration = 650, delay = 0) => {
    const pace = type === 'flow' ? 1 : 1.3;
    job.animations.push(element.animate(frames, {duration: duration * pace, delay: delay * pace, easing: ease, fill: 'backwards'}));
  };
  const fade = (element, delay = 0, duration = 500) => animate(element, [{opacity: 0}, {opacity: opacity(element)}], duration, delay);
  const box = element => element.getBBox();
  const width = root.viewBox?.baseVal.width || root.clientWidth || 1;
  const height = root.viewBox?.baseVal.height || root.clientHeight || 1;
  const progress = (element, axis = 'x') => {
    const b = box(element);
    return Math.max(0, Math.min(1, axis === 'x' ? (b.x + b.width / 2) / width : (b.y + b.height / 2) / height));
  };
  const sweep = (element, delay = 0, duration = 800, vertical = false) => {
    const from = vertical ? 'inset(100% 0 0 0) fill-box' : 'inset(0 100% 0 0) fill-box';
    animate(element, [{clipPath: from, opacity: 0}, {clipPath: 'inset(0 0 0 0) fill-box', opacity: opacity(element)}], duration, delay);
  };
  const grow = (element, delay = 0, duration = 600) => {
    const b = box(element), origin = `${b.x + b.width / 2}px ${b.y + b.height / 2}px`;
    animate(element, [{transformOrigin: origin, transform: 'scale(.72)', opacity: 0}, {transformOrigin: origin, transform: 'scale(1)', opacity: opacity(element)}], duration, delay);
  };
  const trace = (element, delay = 0, duration = 950) => {
    const length = element.getTotalLength();
    animate(element, [{strokeDasharray: `${length} ${length}`, strokeDashoffset: length, opacity: 0}, {strokeDasharray: `${length} ${length}`, strokeDashoffset: 0, opacity: opacity(element)}], duration, delay);
  };
  try {
    if (type === 'atlas') {
      // Animate opacity only; layout-mode transitions own the tile transforms.
      all('.post-icon:not([hidden])').forEach((element, i) => fade(element, Math.min(430, i * 1.2), 650));
      const guides = root.querySelector('.atlas-guides'); if (guides) fade(guides, 0, 500);
    } else if (root.matches('.matrix-cards')) {
      all('button').forEach((element, i) => animate(element, [{opacity: 0, transform: 'translateY(7px)'}, {opacity: 1, transform: 'translateY(0)'}], 500, i * 45));
    } else {
      const circles = all('circle').filter(el => !el.closest('.trend-readout'));
      const rectangles = all('rect').filter(el => !['transparent', 'white', '#fff', '#FFFFFF', '#EDF2F7', 'var(--line)'].includes(el.getAttribute('fill')) && box(el).height < height * .9);
      const labels = all('text').filter(el => !el.closest('.tick, .chart-axis, .trend-readout'));
      if (type === 'line') {
        all('path[fill="none"][stroke]').filter(el => !el.closest('.tick, .chart-axis')).forEach((element, i) => trace(element, i * 75, 1100));
        circles.forEach(element => fade(element, 120 + progress(element) * 850, 350));
        labels.forEach(element => fade(element, element.closest('.trend-endpoints') ? 930 : 60, 450));
      } else if (type === 'flow') {
        // Follow each ribbon's centreline instead of wiping across the whole diagram.
        const ns = 'http://www.w3.org/2000/svg';
        const defs = document.createElementNS(ns, 'defs');
        root.append(defs);
        job.cleanups.push(() => defs.remove());
        const nodes = all('g[data-flow-side]');
        const sources = nodes.filter(element => element.dataset.flowSide === 'source');
        const order = new Map(sources.map((element, i) => [element.dataset.flowName, i]));
        const branches = new Map(), arrivals = new Map();
        all('path[role="button"]').forEach(element => {
          const source = element.dataset.flowSource, target = element.dataset.flowTarget;
          const branch = branches.get(source) || 0;
          branches.set(source, branch + 1);
          const delay = 140 + (order.get(source) || 0) * 160 + branch * 22;
          arrivals.set(target, Math.min(arrivals.get(target) ?? Infinity, delay + 1300));
          if (!element.dataset.flowCenter) { sweep(element, delay, 1750); return; }
          const mask = document.createElementNS(ns, 'mask');
          const id = 'flow-reveal-' + ++flowMaskId;
          for (const [name, value] of Object.entries({id, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width, height})) mask.setAttribute(name, value);
          const ink = document.createElementNS(ns, 'path');
          ink.setAttribute('d', element.dataset.flowCenter);
          ink.setAttribute('fill', 'none');
          ink.setAttribute('stroke', 'white');
          ink.setAttribute('stroke-width', Number(element.dataset.flowWidth) + 3);
          ink.setAttribute('stroke-linecap', 'round');
          mask.append(ink); defs.append(mask);
          const originalMask = element.getAttribute('mask');
          element.setAttribute('mask', `url(#${id})`);
          job.cleanups.push(() => originalMask === null ? element.removeAttribute('mask') : element.setAttribute('mask', originalMask));
          const length = ink.getTotalLength();
          animate(ink, [{strokeDasharray: `${length} ${length}`, strokeDashoffset: length, opacity: 0}, {strokeDasharray: `${length} ${length}`, strokeDashoffset: 0, opacity: 1}], 1750, delay);
          fade(element, delay, 350);
        });
        nodes.forEach(element => fade(element, element.dataset.flowSide === 'source' ? (order.get(element.dataset.flowName) || 0) * 90 : arrivals.get(element.dataset.flowName) || 1500, 480));
      } else if (type === 'network') {
        circles.forEach((element, i) => grow(element, i * 55, 620));
        all('path[role="button"], line[role="button"]').forEach((element, i) => trace(element, 160 + i * 28, 850));
        labels.forEach(element => fade(element, 370 + progress(element, 'y') * 170, 450));
      } else if (type === 'distribution') {
        circles.forEach(element => fade(element, progress(element, 'y') * 260 + progress(element) * 470, 450));
        rectangles.forEach(element => sweep(element, 300 + progress(element, 'y') * 260, 650));
        all('line[stroke-width="3"]').forEach(element => fade(element, 650 + progress(element, 'y') * 180, 350));
        labels.forEach(element => fade(element, progress(element, 'y') * 260, 450));
      } else if (type === 'matrix') {
        rectangles.forEach(element => fade(element, progress(element) * 250 + progress(element, 'y') * 220, 550));
        labels.forEach(element => fade(element, progress(element) * 250 + progress(element, 'y') * 220, 550));
      } else if (type === 'composition') {
        rectangles.forEach(element => sweep(element, progress(element) * 350, 800, true));
        labels.forEach(element => fade(element, 340 + progress(element) * 350, 400));
      } else if (type === 'scatter') {
        circles.forEach(element => grow(element, progress(element) * 400 + progress(element, 'y') * 130, 650));
        labels.forEach(element => fade(element, 400, 500));
        all('line:not([stroke-dasharray])').filter(element => !element.closest('.tick, .chart-axis')).forEach(element => fade(element, 300, 650));
      } else {
        rectangles.forEach(element => sweep(element, progress(element, 'y') * 350, 750));
        circles.forEach(element => grow(element, 270 + progress(element, 'y') * 350, 450));
        labels.forEach(element => fade(element, 120 + progress(element, 'y') * 350, 500));
      }
    }
    Promise.all(job.animations.map(animation => animation.finished.catch(() => {}))).then(() => { if (jobs.has(job)) finish(job); });
  } catch {
    // A reveal must never prevent access to data on an unsupported browser.
    finish(job);
  }
}
