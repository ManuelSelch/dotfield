import { layouts } from './layouts.js';

const presets = {
  countdown: { you: 0, enemy: 0, owner: 'neutral', units: 18, time: '0:38' },
  holding: { you: 38, enemy: 24, owner: 'player', units: 27, time: '1:42' },
  urgent: { you: 38, enemy: 76, owner: 'enemy', units: 34, time: '2:34' },
};
const params = new URLSearchParams(location.search);
let state = Object.hasOwn(presets, params.get('state')) ? params.get('state') : 'countdown';
let snapshot = { ...presets[state] };
let routes = true;
const ns = 'http://www.w3.org/2000/svg';
function el(tag, attrs, parent) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}
function scores() {
  return `<div class="score-pair">${[['You', snapshot.you, 'player'], ['Enemy', snapshot.enemy, 'enemy']].map(([name, value, owner]) => `<div class="score ${owner}"><div class="score-top"><span>${name}${snapshot.owner === owner ? ' · +1/s' : ''}</span><b>${value}<span style="font-weight:400"> / 90</span></b></div><div class="track"><div class="fill" style="width:${value / 90 * 100}%"></div></div></div>`).join('')}</div>`;
}
function citiesFor(layout) {
  return layout.cities.map(c => ({ ...c, owner: c.id === 'relay' ? snapshot.owner : c.owner, units: c.id === 'relay' ? snapshot.units : c.id.startsWith('home-') ? 36 : c.factory ? 14 : c.owner === 'neutral' ? 12 : 24 }));
}
function cell(city, cities, river) {
  const north = city.y < river[0];
  const top = north ? 0 : river[1], bottom = north ? river[0] : 620;
  let polygon = [{ x: 0, y: top }, { x: 420, y: top }, { x: 420, y: bottom }, { x: 0, y: bottom }];
  for (const other of cities) {
    if (city === other || north !== (other.y < river[0])) continue;
    const dx = other.x - city.x, dy = other.y - city.y;
    const limit = (other.x ** 2 + other.y ** 2 - city.x ** 2 - city.y ** 2) / 2;
    const side = p => p.x * dx + p.y * dy - limit;
    const clipped = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length], sa = side(a), sb = side(b);
      if (sa <= 0) clipped.push(a);
      if ((sa <= 0) !== (sb <= 0)) {
        const t = sa / (sa - sb);
        clipped.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    polygon = clipped;
  }
  return polygon.map(p => `${p.x},${p.y}`).join(' ');
}
function mountain(svg, [left, top, right, bottom]) {
  const group = el('g', { transform: `translate(${left} ${top}) scale(${(right - left) / 100} ${(bottom - top) / 100})` }, svg);
  el('polygon', { class: 'mountain-mass', points: '0,20 13,8 25,17 39,0 54,14 70,3 85,18 100,12 95,34 100,52 91,69 98,83 78,100 62,91 46,99 30,92 14,100 0,84 7,65 0,50 8,36' }, group);
  el('polygon', { class: 'mountain-shadow', points: '39,0 54,14 70,3 85,18 100,12 95,34 100,52 91,69 98,83 78,100 62,91 66,70 53,48 61,30' }, group);
  el('path', { class: 'mountain-snow', d: 'M39 0L25 17l13-5 8 9 8-7 M70 3L58 20l11-5 9 9 7-6' }, group);
  el('path', { class: 'mountain-ridge', d: 'M25 17l10 21-13 19 15 20-7 15 M54 14l7 16-8 18 13 22-4 21 M8 36l12 14-13 15' }, group);
}
function route(svg, cities, sequence, color, economy = false) {
  for (let i = 1; i < sequence.length; i++) {
    const a = cities.find(c => c.id === sequence[i - 1]), b = cities.find(c => c.id === sequence[i]);
    const length = Math.hypot(b.x - a.x, b.y - a.y), ux = (b.x - a.x) / length, uy = (b.y - a.y) / length;
    el('path', { class: 'route-leg', style: `stroke:${color};${economy ? 'stroke-dasharray:2 5;opacity:.55' : ''}`, d: `M${a.x + ux * 21} ${a.y + uy * 21}L${b.x - ux * 26} ${b.y - uy * 26}` }, svg);
  }
}
function drawMap(svg, layout) {
  const cities = citiesFor(layout);
  for (const city of cities) el('polygon', { class: `region ${city.owner}`, points: cell(city, cities, layout.river) }, svg);
  const [top, bottom] = layout.river;
  el('path', { class: 'river-water', d: `M0 ${top} Q70 ${top - 5} 140 ${top} T280 ${top} T420 ${top} L420 ${bottom} Q350 ${bottom + 5} 280 ${bottom} T140 ${bottom} T0 ${bottom} Z` }, svg);
  for (const x of layout.bridges) {
    el('rect', { class: 'bridge-deck', x: x - 22, y: top - 4, width: 44, height: bottom - top + 8, rx: 3 }, svg);
    el('path', { class: 'bridge-rail', d: `M${x - 17} ${top - 2}V${bottom + 2} M${x + 17} ${top - 2}V${bottom + 2}` }, svg);
  }
  layout.mountains.forEach(bounds => mountain(svg, bounds));
  if (routes) {
    layout.paths.forEach((path, i) => route(svg, cities, path, i ? '#bd624e' : '#267c72'));
    layout.economyPaths.forEach(path => route(svg, cities, path, '#aa8131', true));
    if (state === 'urgent') {
      const start = cities.find(c => c.id === 'supply-west'), target = cities.find(c => c.id === 'relay');
      el('path', { class: 'air-route', d: `M${start.x} ${start.y}Q12 ${target.y + 110} ${target.x} ${target.y}` }, svg);
      const text = el('text', { class: 'route-label', x: 15, y: 465 }, svg);
      text.textContent = 'AIRLIFT';
    }
  }
  for (const city of cities) {
    const isRelay = city.id === 'relay';
    const group = el('g', { transform: `translate(${city.x} ${city.y})`, ...(isRelay ? { class: 'relay-hit', tabindex: 0, role: 'button', 'aria-label': 'Relay. Simulate change of control.' } : { role: 'img', 'aria-label': `${city.owner} ${city.factory ? 'Factory' : 'city'}, ${city.units} troops` }) }, svg);
    if (isRelay) {
      el('circle', { class: 'relay-ring', r: 25 }, group);
      el('path', { class: 'relay-symbol', d: 'M-5-32q5-8 10 0 M-9-35q9-13 18 0 M0-28v-5' }, group);
      const text = el('text', { class: 'relay-label', x: 0, y: -40 }, group);
      text.textContent = 'RELAY';
      group.addEventListener('click', capture);
      group.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); capture(); } });
    }
    el('circle', { class: `city-disc ${city.owner}`, r: 14 }, group);
    const count = el('text', { class: `city-count ${city.owner === 'neutral' ? 'neutral' : ''}`, y: 1 }, group);
    count.textContent = city.units;
    if (city.factory) el('path', { class: 'factory-mark', d: 'M-8-22v-10l6 3v-5l7 4v-8h4v16z M-4-26v2 M1-26v2 M5-26v2' }, group);
    if (city.id.startsWith('home-')) {
      const text = el('text', { class: 'home-label', x: 0, y: 29 }, group);
      text.textContent = city.owner === 'player' ? 'YOU' : 'ENEMY';
    }
  }
}
function capture() {
  state = snapshot.owner === 'player' ? 'urgent' : 'holding';
  snapshot = { ...snapshot, owner: state === 'holding' ? 'player' : 'enemy', units: 27 };
  render();
}
function render() {
  const remaining = 90 - (snapshot.owner === 'player' ? snapshot.you : snapshot.enemy);
  const title = state === 'countdown' ? 'Relay activates in 22s' : snapshot.owner === 'player' ? `You win in ${remaining}s` : `Interrupt within ${remaining}s`;
  params.set('state', state);
  history.replaceState(null, '', `${location.pathname}?${params}`);
  document.querySelectorAll('[data-state]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.state === state)));
  document.querySelector('.comparison').innerHTML = layouts.map(layout => `<article>
    <h2 class="option-title"><span class="letter">${layout.id.toUpperCase()}</span>${layout.title}</h2>
    <p class="option-description">${layout.description}</p>
    <div class="phone ${state}">
      <div class="game-header"><span class="brand">dotfield</span><span>${snapshot.time} · Ⅱ</span></div>
      <div class="hud" aria-live="polite"><div class="status-line"><strong>${title}</strong><span>FIRST TO 90</span></div>${scores()}</div>
      <div class="field"><svg class="map" id="map-${layout.id}" viewBox="0 0 420 620" role="group" aria-label="${layout.title}. Two bridges cross a river. Mountains separate approaches to an inland relay."></svg></div>
      <div class="city-strip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V8l6 3V6l6 4V3h4v17ZM8 15v2m5-2v2m4-2v2"/></svg><span>Tap a city to convert · drag to send troops</span></div>
      <div class="interaction"><button data-action="capture">${snapshot.owner === 'player' ? 'Simulate enemy capture' : 'Simulate your capture'}</button><button data-action="advance" ${state === 'countdown' ? 'disabled' : ''}>+10s holding</button></div>
    </div><p class="scenario-note">${layout.note}</p>
  </article>`).join('');
  layouts.forEach(layout => drawMap(document.querySelector(`#map-${layout.id}`), layout));
  document.querySelectorAll('[data-action="capture"]').forEach(button => button.addEventListener('click', capture));
  document.querySelectorAll('[data-action="advance"]').forEach(button => button.addEventListener('click', () => {
    const key = snapshot.owner === 'player' ? 'you' : 'enemy';
    snapshot[key] = Math.min(89, snapshot[key] + 10);
    render();
  }));
}
document.querySelectorAll('[data-state]').forEach(button => button.addEventListener('click', () => {
  state = button.dataset.state;
  snapshot = { ...presets[state] };
  render();
}));
document.querySelector('#routes-toggle').addEventListener('change', e => { routes = e.target.checked; render(); });
render();
