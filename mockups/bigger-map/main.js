import { layout, nearestCity } from './geometry.js';
import { makeOrder, advanceFlights, flightDots } from './flights.js';

const ORIGINAL = [
  { id: 'north', owner: 'enemy', units: 36, x: 180, y: 40 },
  { id: 'north-west', owner: 'neutral', units: 8, x: 65, y: 100 },
  { id: 'north-east', owner: 'neutral', units: 12, x: 295, y: 100 },
  { id: 'upper-west', owner: 'neutral', units: 10, x: 115, y: 170 },
  { id: 'upper-east', owner: 'neutral', units: 10, x: 245, y: 170 },
  { id: 'west', owner: 'neutral', units: 8, x: 40, y: 240 },
  { id: 'centre', owner: 'neutral', units: 20, x: 180, y: 240 },
  { id: 'east', owner: 'neutral', units: 8, x: 320, y: 240 },
  { id: 'lower-west', owner: 'neutral', units: 10, x: 115, y: 310 },
  { id: 'lower-east', owner: 'neutral', units: 10, x: 245, y: 310 },
  { id: 'south-west', owner: 'neutral', units: 12, x: 65, y: 380 },
  { id: 'south-east', owner: 'neutral', units: 8, x: 295, y: 380 },
  { id: 'south', owner: 'player', units: 36, x: 180, y: 440 },
];
const variant = new URLSearchParams(location.search).get('state');
const board = document.querySelector('#board');
const regions = document.querySelector('#regions');
const citiesLayer = document.querySelector('#cities');
const guide = document.querySelector('#guide');
const troops = document.querySelector('#troops');
const hint = document.querySelector('#hint');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const color = { player: '#267c72', enemy: '#bd624e', neutral: '#404b46' };
const ownerLabel = { player: 'You', enemy: 'Opponent', neutral: 'Neutral' };
const name = id => id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
let nodes, field, flights = [], drag = null, keyboardSource = null, keyboardTarget = null, frame = 0;
let previewSelection = variant === 'selection';

function reset() {
  if (drag && board.hasPointerCapture(drag.pointerId)) board.releasePointerCapture(drag.pointerId);
  cancelAnimationFrame(frame);
  frame = 0;
  nodes = structuredClone(ORIGINAL);
  if (variant === 'expanded') {
    nodes.find(n => n.id === 'centre').owner = 'player';
    nodes.find(n => n.id === 'centre').units = 15;
    nodes.find(n => n.id === 'south').units = 1;
  }
  flights = []; drag = null; keyboardSource = null; keyboardTarget = null;
  previewSelection = variant === 'selection';
  hint.textContent = 'Drag from anywhere in your region.';
  resize();
}

function resize() {
  const bounds = board.getBoundingClientRect();
  if (!nodes || bounds.width <= 0 || bounds.height <= 0) return;
  field = layout(nodes, bounds.width, bounds.height);
  board.setAttribute('viewBox', `0 0 ${field.width} ${field.height}`);
  const texture = document.querySelector('#texture');
  texture.setAttribute('width', field.width); texture.setAttribute('height', field.height);
  regions.innerHTML = field.cities.map((city, index) => `<polygon data-city="${city.id}" class="region ${city.owner}"
    points="${field.cells[index].map(p => `${p.x},${p.y}`).join(' ')}" tabindex="0" role="button" />`).join('');
  draw();
}

function draw(now = performance.now()) {
  const sourceId = drag?.sourceId ?? keyboardSource ?? (previewSelection ? 'south' : null);
  const targetId = drag?.targetId ?? keyboardTarget ?? (previewSelection ? 'centre' : null);
  for (const element of regions.children) {
    const node = nodes.find(n => n.id === element.dataset.city);
    element.setAttribute('class', `region ${node.owner}${node.id === sourceId ? ' source' : ''}${node.id === targetId ? ' target' : ''}`);
    element.setAttribute('aria-label', `${name(node.id)}: ${ownerLabel[node.owner]}, ${node.units} units`);
    element.setAttribute('aria-pressed', String(node.id === sourceId));
  }
  const source = field.cities.find(c => c.id === sourceId);
  const target = field.cities.find(c => c.id === targetId);
  const tip = target ?? drag?.point;
  guide.innerHTML = source && tip ? `<path d="M${source.x},${source.y} L${tip.x},${tip.y}"
    fill="none" stroke="#267c72" stroke-width="2" opacity="0.55" ${target ? '' : 'stroke-dasharray="5 5"'} />` : '';
  troops.innerHTML = flightDots(flights, field, now, reducedMotion.matches).map(dot =>
    `<circle cx="${dot.x}" cy="${dot.y}" r="${dot.radius}" fill="${color[dot.owner]}" />`).join('');
  citiesLayer.innerHTML = field.cities.map(city => {
    const node = nodes.find(n => n.id === city.id);
    const ink = node.owner === 'neutral' ? '#404b46' : '#ffffff';
    const selected = city.id === sourceId || city.id === targetId;
    const ring = selected ? `<circle cx="${city.x}" cy="${city.y}" r="${city.radius + 6}" fill="none" stroke="#267c72" stroke-width="2" />`
      : node.owner !== 'neutral' ? `<circle cx="${city.x}" cy="${city.y}" r="${city.radius + 5}" fill="none" stroke="${color[node.owner]}" stroke-width="1" opacity="0.18" />` : '';
    const markerY = city.y + city.radius * 0.56;
    const marker = node.owner === 'player' ? `<circle cx="${city.x}" cy="${markerY}" r="2.3" fill="${ink}" />`
      : node.owner === 'enemy' ? `<rect x="${city.x - 2}" y="${markerY - 2}" width="4" height="4" fill="${ink}" />`
      : `<rect x="${city.x - 3}" y="${markerY - 0.7}" width="6" height="1.4" fill="${ink}" />`;
    return `${ring}<circle class="city-disc ${node.owner}" cx="${city.x}" cy="${city.y}" r="${city.radius}" stroke-width="1.5" />
      <text class="city-count" x="${city.x}" y="${city.y - 2}" fill="${ink}" font-size="${Math.max(12, 17 * field.scale)}">${node.units}</text>${marker}`;
  }).join('');
}

function dispatch(sourceId, targetId) {
  const source = nodes.find(n => n.id === sourceId), target = nodes.find(n => n.id === targetId);
  if (!source || !target || source === target || source.owner !== 'player' || source.units < 2) return;
  if (flights.some(group => group.sourceId === sourceId)) { hint.textContent = 'That city already has an order in progress.'; return; }
  const now = performance.now();
  flights.push(...makeOrder(source, target, now));
  flights = advanceFlights(flights, nodes, now);
  hint.textContent = `Moving to ${name(targetId)} · impact stays at the circle.`;
  if (!frame) frame = requestAnimationFrame(tick);
}

function tick(now) {
  flights = advanceFlights(flights, nodes, now);
  draw(now);
  frame = flights.length ? requestAnimationFrame(tick) : 0;
  if (!flights.length) hint.textContent = 'Drag from anywhere in your region.';
}

function point(event) {
  const bounds = board.getBoundingClientRect();
  return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
}
function cancel() {
  const id = drag?.pointerId;
  drag = null; keyboardSource = null; keyboardTarget = null; previewSelection = false;
  if (id !== undefined && board.hasPointerCapture(id)) board.releasePointerCapture(id);
  draw();
}
board.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || drag) return;
  const sourceId = nearestCity(point(event), field);
  const source = nodes.find(n => n.id === sourceId);
  if (!source || source.owner !== 'player' || source.units < 2) return;
  event.preventDefault(); keyboardSource = null; keyboardTarget = null; previewSelection = false;
  drag = { pointerId: event.pointerId, sourceId, targetId: null, point: point(event) };
  board.setPointerCapture(event.pointerId);
  hint.textContent = `Source: ${name(sourceId)} · release in another region.`;
  draw();
});
board.addEventListener('pointermove', event => {
  if (event.pointerId !== drag?.pointerId) return;
  const location = point(event), targetId = nearestCity(location, field);
  drag.point = location; drag.targetId = targetId === drag.sourceId ? null : targetId;
  draw();
});
board.addEventListener('pointerup', event => {
  if (event.pointerId !== drag?.pointerId) return;
  const sourceId = drag.sourceId, targetId = nearestCity(point(event), field);
  cancel();
  if (targetId && targetId !== sourceId) dispatch(sourceId, targetId);
  else hint.textContent = 'Cancelled · release inside a different region.';
  draw();
});
for (const type of ['pointercancel', 'lostpointercapture']) board.addEventListener(type, event => {
  if (event.pointerId === drag?.pointerId) { cancel(); hint.textContent = 'Drag from anywhere in your region.'; }
});
board.addEventListener('focusin', event => {
  const id = event.target.dataset.city;
  if (keyboardSource) { keyboardTarget = id === keyboardSource ? null : id; draw(); }
});
board.addEventListener('keydown', event => {
  if (event.key === 'Escape') { cancel(); hint.textContent = 'Cancelled.'; return; }
  if (!['Enter', ' '].includes(event.key)) return;
  const id = event.target.dataset.city;
  if (!id) return;
  event.preventDefault(); previewSelection = false;
  if (keyboardSource && keyboardSource !== id) { const sourceId = keyboardSource; cancel(); dispatch(sourceId, id); }
  else {
    const node = nodes.find(n => n.id === id);
    if (node.owner === 'player' && node.units >= 2) { keyboardSource = id; keyboardTarget = null; hint.textContent = 'Focus a target region and press Enter.'; }
  }
  draw();
});
document.querySelector('#reset').addEventListener('click', reset);
reset();
new ResizeObserver(resize).observe(board);
