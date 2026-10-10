// Isolated fake-data review. No production imports or simulation.
const svg = document.querySelector('#field');
const hint = document.querySelector('#hint');
const ns = 'http://www.w3.org/2000/svg';
const requested = new URLSearchParams(location.search).get('state');
const state = ['river', 'mountain', 'blocked'].includes(requested) ? requested : 'river';
document.querySelector(`[data-state="${state}"]`).setAttribute('aria-current', 'page');
const cities = [
  { x: 180, y: 50, owner: 'enemy', count: 36 },
  { x: 70, y: 120, owner: 'neutral', count: 10 },
  { x: 290, y: 120, owner: 'enemy', count: 12 },
  { x: 90, y: 200, owner: 'neutral', count: 12 },
  { x: 270, y: 200, owner: 'neutral', count: 12 },
  { x: 90, y: 280, owner: 'neutral', count: 12 },
  { x: 270, y: 280, owner: 'neutral', count: 12 },
  { x: 70, y: 360, owner: 'player', count: 16 },
  { x: 290, y: 360, owner: 'neutral', count: 8 },
  { x: 180, y: 430, owner: 'player', count: 45 },
];
if (state === 'mountain') cities[2].owner = 'neutral';
const mountain = [
  { x: 130, y: 164 }, { x: 149, y: 150 }, { x: 164, y: 169 }, { x: 184, y: 128 },
  { x: 204, y: 163 }, { x: 222, y: 145 }, { x: 248, y: 178 }, { x: 235, y: 196 },
  { x: 251, y: 217 }, { x: 237, y: 238 }, { x: 248, y: 258 }, { x: 227, y: 278 },
  { x: 213, y: 307 }, { x: 194, y: 294 }, { x: 178, y: 314 }, { x: 160, y: 299 },
  { x: 142, y: 307 }, { x: 132, y: 283 }, { x: 115, y: 269 }, { x: 127, y: 248 },
  { x: 113, y: 228 }, { x: 128, y: 207 }, { x: 116, y: 187 },
];
const stagingPaths = { west: [9, 7, 5, 3, 1, 0], east: [9, 8, 6, 4, 2, 0] };
// Parallel angular banks use the same flat polygon language as city regions.
const upperBank = [{ x: 0, y: 229 }, { x: 58, y: 229 }, { x: 118, y: 222 },
  { x: 180, y: 228 }, { x: 242, y: 218 }, { x: 302, y: 231 }, { x: 360, y: 228 }];
const lowerBank = upperBank.map(p => ({ x: p.x, y: p.y + 30 }));
const riverPolygon = [...upperBank, ...lowerBank.toReversed()];
const bridges = [80, 280].map(x => ({ from: { x, y: bankY(x) }, to: { x, y: bankY(x) + 30 } }));
function bankY(x) {
  for (let i = 1; i < upperBank.length; i++) {
    if (x <= upperBank[i].x) {
      const a = upperBank[i - 1], b = upperBank[i];
      return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
    }
  }
  return upperBank.at(-1).y;
}
function inRiver(p) { return p.y > bankY(p.x) + 1e-7 && p.y < bankY(p.x) + 30 - 1e-7; }
// Split a segment at polygon-edge contacts, then test each open interval.
function crossesRiver(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const cuts = [0, 1];
  for (let i = 0; i < riverPolygon.length; i++) {
    const p = riverPolygon[i], q = riverPolygon[(i + 1) % riverPolygon.length];
    const ex = q.x - p.x, ey = q.y - p.y;
    const denominator = dx * ey - dy * ex;
    if (Math.abs(denominator) < 1e-9) continue;
    const ox = p.x - a.x, oy = p.y - a.y;
    const t = (ox * ey - oy * ex) / denominator;
    const u = (ox * dy - oy * dx) / denominator;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) cuts.push(t);
  }
  cuts.sort((a, b) => a - b);
  return cuts.slice(1).some((t, i) => {
    const middle = (cuts[i] + t) / 2;
    return inRiver({ x: a.x + dx * middle, y: a.y + dy * middle });
  });
}
function riverRoute(a, b) {
  const nodes = [a, b, ...upperBank.slice(1, -1), ...lowerBank.slice(1, -1),
    ...bridges.flatMap(bridge => [bridge.from, bridge.to])];
  const edges = nodes.map(() => []);
  const link = (i, j) => { edges[i].push(j); edges[j].push(i); };
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (!crossesRiver(nodes[i], nodes[j])) link(i, j);
  }
  if (state !== 'blocked') for (const bridge of bridges) link(nodes.indexOf(bridge.from), nodes.indexOf(bridge.to));
  const lengths = nodes.map(() => Infinity), previous = [], visited = new Set();
  lengths[0] = 0;
  while (visited.size < nodes.length) {
    const current = nodes.map((_, i) => i).filter(i => !visited.has(i))
      .sort((i, j) => lengths[i] - lengths[j])[0];
    if (!Number.isFinite(lengths[current])) return null;
    if (current === 1) break;
    visited.add(current);
    for (const next of edges[current]) {
      const candidate = lengths[current] + length(nodes[current], nodes[next]);
      if (candidate < lengths[next] - 1e-7) { lengths[next] = candidate; previous[next] = current; }
    }
  }
  const result = [b];
  let current = 1;
  while (current !== 0) { current = previous[current]; result.unshift(nodes[current]); }
  return result;
}
let source = null;
let target = null;
let drag = false;
let paused = false;
let batch = null;
let selectedPass = 'west';
const passOptions = document.querySelector('#pass-options');
if (state === 'mountain') {
  passOptions.hidden = false;
  passOptions.querySelectorAll('[data-pass]').forEach(button => button.addEventListener('click', () => {
    selectedPass = button.dataset.pass;
    passOptions.querySelectorAll('[data-pass]').forEach(option => option.setAttribute('aria-pressed', String(option === button)));
    document.querySelector('#pass-summary').textContent = `${button.textContent} · 5 city-to-city orders`;
    update();
  }));
}
const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const total = path => path.slice(1).reduce((sum, p, i) => sum + length(path[i], p), 0);
const coords = path => path.map(p => `${p.x},${p.y}`).join(' ');
function node(tag, attrs, parent) {
  const element = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  parent.append(element);
  return element;
}
function cell(city) {
  let poly = [{ x: 0, y: 0 }, { x: 360, y: 0 }, { x: 360, y: 480 }, { x: 0, y: 480 }];
  for (const other of cities) {
    if (city === other) continue;
    const dx = other.x - city.x, dy = other.y - city.y;
    const limit = (other.x ** 2 + other.y ** 2 - city.x ** 2 - city.y ** 2) / 2;
    const score = p => p.x * dx + p.y * dy - limit;
    const next = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const sa = score(a), sb = score(b);
      if (sa <= 0) next.push(a);
      if ((sa <= 0) !== (sb <= 0)) {
        const t = sa / (sa - sb);
        next.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    poly = next;
  }
  return poly;
}
function insideMountain(point) {
  let inside = false;
  for (let i = 0, j = mountain.length - 1; i < mountain.length; j = i++) {
    const a = mountain[i], b = mountain[j];
    const crosses = (a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}
function hits(a, b) {
  const steps = Math.ceil(length(a, b) / 2);
  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0;
    if (insideMountain({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })) return true;
  }
  return false;
}
function route(a, b) {
  if (state !== 'mountain') return riverRoute(a, b);
  return hits(a, b) ? null : [a, b];
}
function at(path, offset) {
  for (let i = 1; i < path.length; i++) {
    const size = length(path[i - 1], path[i]);
    if (offset <= size) {
      const t = size ? Math.max(0, offset / size) : 0;
      return { x: path[i - 1].x + (path[i].x - path[i - 1].x) * t,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * t };
    }
    offset -= size;
  }
  return path[path.length - 1];
}
function trim(path) {
  return [at(path, 21), ...path.slice(1, -1), at([...path].reverse(), 21)];
}
const regionLayer = document.querySelector('#regions');
if (state !== 'mountain') {
  const mask = node('mask', { id: 'land', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 360, height: 480 }, svg.querySelector('defs'));
  node('rect', { x: 0, y: 0, width: 360, height: 480, fill: 'white' }, mask);
  node('polygon', { points: coords(riverPolygon), fill: 'black' }, mask);
  regionLayer.setAttribute('mask', 'url(#land)');
}
for (const city of cities) city.cell = node('polygon', { points: coords(cell(city)), class: `cell ${city.owner}` }, regionLayer);
const terrainLayer = document.querySelector('#terrain');
if (state === 'mountain') {
  node('polygon', { points: coords(mountain), class: 'mountain-mass' }, terrainLayer);
  node('polygon', { points: '184,128 204,163 222,145 248,178 235,196 251,217 237,238 248,258 227,278 213,307 194,294 202,253 190,221 203,188', class: 'mountain-shadow' }, terrainLayer);
  node('polygon', { points: '184,128 173,153 183,147 190,157 204,163', class: 'mountain-snow' }, terrainLayer);
  node('polygon', { points: '222,145 211,164 220,160 228,170 248,178', class: 'mountain-snow' }, terrainLayer);
  node('path', { d: 'M164 169L181 196 162 224 181 254 160 299M204 163L190 192 211 219 190 250 194 294M128 207l14 18-15 23M235 196l-16 23 18 19', class: 'mountain-ridge' }, terrainLayer);
} else {
  node('polygon', { points: coords(riverPolygon), class: 'river' }, terrainLayer);
  if (state === 'river') for (const bridge of bridges) {
    const x = bridge.from.x;
    const leftTop = bankY(x - 10) - 4, rightTop = bankY(x + 10) - 4;
    const deck = [{ x: x - 10, y: leftTop }, { x: x + 10, y: rightTop },
      { x: x + 10, y: rightTop + 38 }, { x: x - 10, y: leftTop + 38 }];
    node('polygon', { points: coords(deck), class: 'bridge' }, terrainLayer);
    node('path', { d: `M${x - 8} ${bankY(x - 8) - 3}v36M${x + 8} ${bankY(x + 8) - 3}v36`, class: 'bridge-rail' }, terrainLayer);
  }
}
const cityLayer = document.querySelector('#cities');
for (const [index, city] of cities.entries()) {
  const g = node('g', { class: `city ${city.owner}`, role: 'button', tabindex: 0,
    'aria-label': `${city.owner} city ${index + 1}, ${city.count} troops`, transform: `translate(${city.x} ${city.y})` }, cityLayer);
  node('circle', { r: 25, class: 'focus-ring' }, g);
  node('circle', { r: 21, class: 'core' }, g);
  node('text', { x: 0, y: 0 }, g).textContent = city.count;
  g.addEventListener('keydown', event => {
    if (['Enter', ' '].includes(event.key)) { event.preventDefault(); choose(city); }
  });
}
function update() {
  const path = source && target && source !== target ? route(source, target) : undefined;
  for (const city of cities) city.cell.setAttribute('class', `cell ${city.owner}${city === source ? ' source' : ''}${city === target && city !== source ? path ? ' target' : ' blocked-target' : ''}`);
  const routeLayer = document.querySelector('#route');
  routeLayer.replaceChildren();
  if (state === 'mountain') {
    const stagedCities = stagingPaths[selectedPass].map(index => cities[index]);
    for (let i = 1; i < stagedCities.length; i++) {
      node('polyline', { points: coords(trim([stagedCities[i - 1], stagedCities[i]])), class: 'staging-route' }, routeLayer);
    }
  }
  if (source && target && source !== target) node('polyline', { points: coords(path ? trim(path) : trim([source, target])), class: `guide${path ? '' : ' invalid'}` }, routeLayer);
  hint.textContent = paused ? 'Preview paused' : path === null
    ? state === 'mountain' ? 'Ridge blocks direct orders · stage through a side city' : 'No crossing · choose another destination'
    : source && !target ? 'Choose a destination · Escape cancels' : 'Drag between regions · leave one behind';
}
function choose(city) {
  if (paused) return;
  if (source && city !== source) { target = city; release(); }
  else if (city.owner === 'player') { source = city; target = null; update(); }
}
function release() {
  if (source && target && source !== target) {
    const path = route(source, target);
    if (path) batch = { path: trim(path), progress: 0 };
  }
  drag = false;
  update();
}
function nearest(event) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  if (p.x < 0 || p.x > 360 || p.y < 0 || p.y > 480) return null;
  if (state !== 'mountain' && inRiver(p)
    && !(state === 'river' && bridges.some(bridge => Math.abs(p.x - bridge.from.x) <= 10))) return null;
  return [...cities].sort((a, b) => length(a, p) - length(b, p))[0];
}
svg.addEventListener('pointerdown', event => {
  if (paused) return;
  const city = nearest(event);
  if (source && city && city.owner !== 'player') { target = city; release(); return; }
  if (city?.owner === 'player') { source = city; target = null; drag = true; svg.setPointerCapture(event.pointerId); update(); }
});
svg.addEventListener('pointermove', event => { if (drag) { target = nearest(event); update(); } });
svg.addEventListener('pointerup', () => { if (drag) release(); });
svg.addEventListener('pointercancel', () => { drag = false; source = target = null; update(); });
function reset() { source = target = batch = null; drag = false; document.querySelector('#troops').replaceChildren(); update(); }
document.querySelector('#reset').addEventListener('click', reset);
window.addEventListener('keydown', event => { if (event.key === 'Escape') reset(); });
document.querySelector('#pause').addEventListener('click', () => {
  paused = !paused;
  document.querySelector('#pause').setAttribute('aria-label', paused ? 'Resume preview' : 'Pause preview');
  document.querySelector('#pause').setAttribute('title', paused ? 'Resume preview' : 'Pause preview');
  document.querySelector('#pause path').setAttribute('d', paused ? 'M9 6l8 6-8 6z' : 'M9 6v12M15 6v12');
  update();
});
let last = null;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now) {
  const elapsed = last === null ? 0 : Math.min(50, now - last);
  last = now;
  if (batch && !paused && !document.hidden) {
    batch.progress += elapsed * .06;
    const layer = document.querySelector('#troops');
    layer.replaceChildren();
    for (let i = 0; i < 5; i++) {
      const p = at(batch.path, Math.max(0, batch.progress - i * 11));
      node('circle', { cx: p.x, cy: p.y, r: 4.8, fill: '#267c72' }, layer);
    }
    if (batch.progress > total(batch.path) + 44) { batch = null; layer.replaceChildren(); }
  }
  requestAnimationFrame(frame);
}
update();
if (!reducedMotion) requestAnimationFrame(frame);
