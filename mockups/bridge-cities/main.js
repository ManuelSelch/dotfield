// Deliberately isolated fake-data demonstration, not production simulation.
const svg = document.querySelector('#field');
const hint = document.querySelector('#hint');
const ns = 'http://www.w3.org/2000/svg';
const state = new URLSearchParams(location.search).get('state') === 'staged' ? 'staged' : 'opening';
document.querySelector(`[data-state="${state}"]`).setAttribute('aria-current', 'page');
const seeds = [
  { id: 'north', x: 180, y: 50, owner: 'enemy', count: 36, bank: 'north' },
  { id: 'north-west', x: 70, y: 120, owner: 'neutral', count: 8, bank: 'north' },
  { id: 'north-east', x: 290, y: 120, owner: 'enemy', count: 12, bank: 'north' },
  { id: 'west-north', x: 80, y: 190, owner: state === 'staged' ? 'player' : 'neutral', count: state === 'staged' ? 28 : 8, bank: 'north', pair: 'west-south' },
  { id: 'east-north', x: 280, y: 190, owner: 'neutral', count: 8, bank: 'north', pair: 'east-south' },
  { id: 'west-south', x: 80, y: 290, owner: 'player', count: 18, bank: 'south', pair: 'west-north' },
  { id: 'east-south', x: 280, y: 290, owner: 'neutral', count: 8, bank: 'south', pair: 'east-north' },
  { id: 'south-west', x: 70, y: 360, owner: 'neutral', count: 8, bank: 'south' },
  { id: 'south-east', x: 290, y: 360, owner: 'neutral', count: 8, bank: 'south' },
  { id: 'south', x: 180, y: 430, owner: 'player', count: 36, bank: 'south' },
];
let cities = seeds.map(city => ({ ...city }));
let source = null, target = null, drag = false, paused = false;
let orders = [];
let message = '';
const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const legal = (a, b) => a !== b && (a.bank === b.bank || a.pair === b.id);
function node(tag, attrs, parent) {
  const result = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) result.setAttribute(key, value);
  parent.append(result);
  return result;
}
function cell(city) {
  // Independently clipped bank regions, not territories continuing under water.
  const top = city.bank === 'north' ? 0 : 255, bottom = city.bank === 'north' ? 225 : 480;
  let poly = [{ x: 0, y: top }, { x: 360, y: top }, { x: 360, y: bottom }, { x: 0, y: bottom }];
  for (const other of cities.filter(other => other.bank === city.bank && other !== city)) {
    const dx = other.x - city.x, dy = other.y - city.y;
    const limit = (other.x ** 2 + other.y ** 2 - city.x ** 2 - city.y ** 2) / 2;
    const score = p => p.x * dx + p.y * dy - limit;
    const next = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], sa = score(a), sb = score(b);
      if (sa <= 0) next.push(a);
      if ((sa <= 0) !== (sb <= 0)) {
        const t = sa / (sa - sb);
        next.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    poly = next;
  }
  return poly.map(p => `${p.x},${p.y}`).join(' ');
}
function endpoints(a, b) {
  const distance = length(a, b), dx = (b.x - a.x) / distance, dy = (b.y - a.y) / distance;
  return { from: { x: a.x + dx * 21, y: a.y + dy * 21 },
    to: { x: b.x - dx * 21, y: b.y - dy * 21 }, dx, dy, distance: distance - 42 };
}
const terrain = document.querySelector('#terrain');
node('rect', { x: 0, y: 225, width: 360, height: 30, class: 'river' }, terrain);
for (const x of [80, 280]) {
  node('rect', { x: x - 32, y: 221, width: 64, height: 38, class: 'bridge' }, terrain);
  node('path', { d: `M${x - 30} 222v36M${x + 30} 222v36`, class: 'bridge-rail' }, terrain);
}
function update() {
  const regions = document.querySelector('#regions'), layer = document.querySelector('#cities');
  regions.replaceChildren(); layer.replaceChildren();
  for (const city of cities) {
    const isTarget = city === target && city !== source;
    const highlight = city === source ? ' source' : isTarget ? legal(source, city) ? ' target' : ' blocked-target' : '';
    node('polygon', { points: cell(city), class: `cell ${city.owner}${highlight}` }, regions);
    const g = node('g', { class: `city ${city.owner}`, role: 'button', tabindex: 0,
      'data-city': city.id, 'aria-label': `${city.owner} city, ${city.count} troops${city.pair ? ', bridge city linked to the opposite bank' : ''}`,
      transform: `translate(${city.x} ${city.y})` }, layer);
    node('circle', { r: 25, class: 'focus-ring' }, g);
    if (source?.pair === city.id) node('circle', { r: 27, class: 'paired-ring' }, g);
    node('circle', { r: 21, class: 'core' }, g);
    node('text', { x: 0, y: 0 }, g).textContent = city.count;
    if (city.pair) node('path', { d: 'M21-27v12M33-27v12M21-23h12M21-19h12', class: 'bridge-symbol' }, g);
  }
  document.querySelector('#route').replaceChildren();
  if (source && target && source !== target) {
    const route = endpoints(source, target);
    node('line', { x1: route.from.x, y1: route.from.y, x2: route.to.x, y2: route.to.y,
      class: `guide${legal(source, target) ? '' : ' invalid'}` }, document.querySelector('#route'));
  }
  hint.textContent = paused ? 'Preview paused' : message || (source ? source.pair
    ? 'Cross to the linked city · or send within this bank'
    : 'Send within this bank · stage troops at a bridge city'
    : 'Stage troops at a bridge city · send across');
}
function select(city) {
  if (city?.owner !== 'player' || city.count < 2 || paused) return;
  source = city; target = null; message = ''; update();
}
function send() {
  drag = false;
  if (!source || !target || source === target) return;
  if (!legal(source, target)) {
    message = 'Cross only between the paired bridge cities'; update(); return;
  }
  if (source.count < 2) { message = 'Leave one behind · bring more troops first'; update(); return; }
  const units = source.count - 1;
  source.count = 1;
  const order = { ...endpoints(source, target), units, targetId: target.id, progress: 0 };
  orders.push(order);
  message = source.bank !== target.bank ? 'Crossing the bridge · choose your next move after arrival'
    : target.pair ? 'Reinforcements heading to the bridge city' : 'Troops on their way';
  source = target = null;
  update();
}
function choose(city) {
  if (paused) return;
  if (source && source !== city) { target = city; send(); }
  else select(city);
}
function nearest(event) {
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  if (p.x < 0 || p.x > 360 || p.y < 0 || p.y > 480 || (p.y > 225 && p.y < 255)) return null;
  const bank = p.y <= 225 ? 'north' : 'south';
  return cities.filter(city => city.bank === bank).sort((a, b) => length(a, p) - length(b, p))[0];
}
svg.addEventListener('pointerdown', event => {
  if (paused) return;
  const city = nearest(event);
  if (source && city && source !== city) { target = city; send(); return; }
  if (city?.owner === 'player' && city.count >= 2) {
    select(city); drag = true; svg.setPointerCapture(event.pointerId);
  }
});
svg.addEventListener('pointermove', event => { if (drag) { target = nearest(event); message = ''; update(); } });
svg.addEventListener('pointerup', () => { if (drag) send(); });
svg.addEventListener('pointercancel', cancel);
svg.addEventListener('keydown', event => {
  if (['Enter', ' '].includes(event.key)) {
    const id = event.target.closest('[data-city]')?.getAttribute('data-city');
    const city = cities.find(city => city.id === id);
    if (city) {
      event.preventDefault(); choose(city);
      svg.querySelector(`[data-city="${id}"]`)?.focus();
    }
  }
});
function cancel() { source = target = null; drag = false; message = ''; update(); }
window.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
document.querySelector('#reset').addEventListener('click', () => {
  cities = seeds.map(city => ({ ...city })); orders = []; cancel(); document.querySelector('#troops').replaceChildren();
});
document.querySelector('#pause').addEventListener('click', () => {
  paused = !paused; drag = false;
  const button = document.querySelector('#pause');
  button.setAttribute('aria-label', paused ? 'Resume preview' : 'Pause preview');
  button.setAttribute('title', paused ? 'Resume preview' : 'Pause preview');
  button.querySelector('path').setAttribute('d', paused ? 'M9 6l8 6-8 6z' : 'M9 6v12M15 6v12');
  update();
});
function arrive(order) {
  const city = cities.find(city => city.id === order.targetId);
  if (city.owner === 'player') city.count += order.units;
  else if (order.units > city.count) { city.count = order.units - city.count; city.owner = 'player'; }
  else city.count -= order.units;
  message = city.owner === 'player' && city.pair ? 'Bridge city secured · send onward when ready' : 'Arrival resolved · choose your next move';
}
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let last = null;
function frame(now) {
  const elapsed = last === null ? 0 : Math.min(50, now - last); last = now;
  const layer = document.querySelector('#troops');
  layer.replaceChildren();
  if (!paused && !document.hidden) for (const order of orders) order.progress += elapsed * .035;
  let changed = false;
  for (const order of orders) {
    const t = Math.min(1, order.progress / order.distance);
    if (t === 1) { arrive(order); changed = true; continue; }
    const opening = Math.min(1, t / .3), gathering = Math.max(0, (t - .8) / .2);
    const spread = opening ** 2 * (3 - 2 * opening) * (1 - gathering ** 2 * (3 - 2 * gathering));
    const visibleDots = Math.min(5, order.units);
    for (let slot = 0; slot < visibleDots; slot++) {
      const offset = (slot - (visibleDots - 1) / 2) * 12 * spread;
      const x = order.from.x + (order.to.x - order.from.x) * t - order.dy * offset;
      const y = order.from.y + (order.to.y - order.from.y) * t + order.dx * offset;
      if (!reducedMotion) node('circle', { cx: x, cy: y, r: 4.8, fill: '#267c72' }, layer);
    }
  }
  orders = orders.filter(order => order.progress < order.distance);
  if (changed) update();
  requestAnimationFrame(frame);
}
update(); requestAnimationFrame(frame);
