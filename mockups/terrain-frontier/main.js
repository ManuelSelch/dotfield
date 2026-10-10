const ns = 'http://www.w3.org/2000/svg';
const cities = [
  { id: 'north', owner: 'enemy', units: 36, x: 210, y: 46 },
  { id: 'upper-west', owner: 'neutral', units: 12, x: 90, y: 105 },
  { id: 'upper-east', owner: 'neutral', units: 12, x: 330, y: 105 },
  { id: 'bridge-north-west', owner: 'neutral', units: 10, x: 65, y: 145 },
  { id: 'bridge-north-east', owner: 'neutral', units: 10, x: 355, y: 145 },
  { id: 'mid-west', owner: 'neutral', units: 11, x: 90, y: 280 },
  { id: 'mid-east', owner: 'neutral', units: 11, x: 330, y: 280 },
  { id: 'bridge-south-west', owner: 'neutral', units: 10, x: 65, y: 230 },
  { id: 'bridge-south-east', owner: 'neutral', units: 10, x: 355, y: 230 },
  { id: 'west-pass', owner: 'neutral', units: 12, x: 90, y: 420 },
  { id: 'east-pass', owner: 'neutral', units: 12, x: 330, y: 420 },
  { id: 'south-west', owner: 'neutral', units: 12, x: 140, y: 535 },
  { id: 'south-east', owner: 'neutral', units: 12, x: 280, y: 535 },
  { id: 'south', owner: 'player', units: 36, x: 210, y: 575 },
];
const paths = {
  west: ['south', 'south-west', 'west-pass', 'mid-west', 'bridge-south-west', 'bridge-north-west', 'upper-west', 'north'],
  east: ['south', 'south-east', 'east-pass', 'mid-east', 'bridge-south-east', 'bridge-north-east', 'upper-east', 'north'],
};
const colors = { player: '#267c72', enemy: '#bd624e', neutral: '#404b46' };
const board = document.querySelector('#map');
const regions = document.querySelector('#regions');
const riverLayer = document.querySelector('#river');
const mountainLayer = document.querySelector('#mountains');
const routesLayer = document.querySelector('#routes');
const citiesLayer = document.querySelector('#cities');
let selectedRoute = new URLSearchParams(location.search).get('route') === 'east' ? 'east' : 'west';

function svg(tag, attrs, parent) {
  const el = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
  parent.append(el);
  return el;
}
function pointString(points) { return points.map(p => `${p.x},${p.y}`).join(' '); }
function cell(city) {
  let polygon = [{ x: 0, y: 0 }, { x: 420, y: 0 }, { x: 420, y: 620 }, { x: 0, y: 620 }];
  for (const other of cities) {
    if (city === other) continue;
    const dx = other.x - city.x, dy = other.y - city.y;
    const limit = (other.x ** 2 + other.y ** 2 - city.x ** 2 - city.y ** 2) / 2;
    const side = p => p.x * dx + p.y * dy - limit;
    const clipped = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const sa = side(a), sb = side(b);
      if (sa <= 0) clipped.push(a);
      if ((sa <= 0) !== (sb <= 0)) {
        const t = sa / (sa - sb);
        clipped.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
    polygon = clipped;
  }
  return polygon;
}
function drawRegions() {
  for (const city of cities) {
    svg('polygon', { class: `region ${city.owner}`, points: pointString(cell(city)) }, regions);
  }
}
function drawRiver() {
  const water = svg('path', {
    class: 'river-water',
    d: 'M0 178 C52 170 96 185 147 178 C205 170 260 185 315 178 C358 172 390 179 420 175 L420 212 C375 216 353 207 312 215 C257 225 201 207 150 216 C93 225 48 207 0 217 Z',
  }, riverLayer);
  water.setAttribute('aria-hidden', 'true');
  for (const x of [65, 355]) {
    svg('rect', { x: x - 22, y: 176, width: 44, height: 40, rx: 2, class: 'bridge-deck' }, riverLayer);
    svg('path', { d: `M${x - 17} 177v38M${x + 17} 177v38`, class: 'bridge-rail' }, riverLayer);
  }
}
function drawMountains() {
  const points = [
    [154, 292], [173, 266], [191, 282], [210, 244], [232, 272], [252, 238], [273, 273],
    [294, 257], [312, 294], [296, 318], [314, 341], [294, 366], [309, 393], [286, 417],
    [294, 444], [272, 466], [257, 495], [237, 480], [216, 502], [196, 483], [176, 499],
    [157, 476], [139, 466], [149, 439], [130, 420], [145, 398], [126, 374], [143, 350],
    [127, 329], [145, 309],
  ].map(([x, y]) => ({ x, y }));
  svg('polygon', { class: 'mountain-mass', points: pointString(points) }, mountainLayer);
  svg('polygon', { class: 'mountain-shadow', points: '210,244 252,238 273,273 294,257 312,294 296,318 314,341 294,366 309,393 286,417 294,444 272,466 257,495 237,480 236,419 252,370 231,325' }, mountainLayer);
  svg('polygon', { class: 'mountain-snow', points: '210,244 198,273 210,267 219,279 232,272' }, mountainLayer);
  svg('polygon', { class: 'mountain-snow', points: '252,238 239,269 251,263 260,275 273,273' }, mountainLayer);
  svg('path', { class: 'mountain-ridge', d: 'M173 266l18 37-19 34 20 35-21 42 4 59M232 272l-18 35 21 37-19 42 20 40-20 57M145 350l18 22-18 26M294 318l-20 26 20 22' }, mountainLayer);
}
function trimmedSegment(a, b, radius = 18) {
  const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / distance, uy = (b.y - a.y) / distance;
  return [{ x: a.x + ux * radius, y: a.y + uy * radius }, { x: b.x - ux * radius, y: b.y - uy * radius }];
}
function drawRoutes() {
  routesLayer.replaceChildren();
  const sequence = paths[selectedRoute].map(id => cities.find(city => city.id === id));
  for (let i = 1; i < sequence.length; i++) {
    svg('polyline', { class: 'route-leg', points: pointString(trimmedSegment(sequence[i - 1], sequence[i])) }, routesLayer);
  }
  document.querySelectorAll('[data-route]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.route === selectedRoute));
  });
  const label = selectedRoute === 'west' ? 'West flank' : 'East flank';
  document.querySelector('#route-summary').textContent = `${label} · 7 city-to-city orders · ${selectedRoute} pass + bridge`;
}
function drawCities() {
  for (const city of cities) {
    const group = svg('g', { 'aria-label': `${city.owner} city, ${city.units} troops`, transform: `translate(${city.x} ${city.y})` }, citiesLayer);
    svg('circle', { class: `city-disc ${city.owner}`, r: 16 }, group);
    const count = svg('text', { class: `city-count ${city.owner === 'neutral' ? 'neutral' : 'owned'}`, x: 0, y: -1 }, group);
    count.textContent = city.units;
    if (city.owner === 'player') svg('circle', { class: 'city-mark', cx: 0, cy: 8, r: 2.2 }, group);
    if (city.owner === 'enemy') svg('rect', { class: 'city-mark', x: -2, y: 6, width: 4, height: 4 }, group);
    if (city.id.startsWith('bridge-')) {
      svg('circle', { r: 20, fill: 'none', stroke: '#718777', 'stroke-width': 1, 'stroke-dasharray': '2 3', opacity: .7 }, group);
    }
  }
}
for (const city of cities) svg('polygon', { class: `region ${city.owner}`, points: pointString(cell(city)) }, regions);
drawRiver();
drawMountains();
drawCities();
document.querySelectorAll('[data-route]').forEach(button => button.addEventListener('click', () => {
  selectedRoute = button.dataset.route;
  drawRoutes();
}));
drawRoutes();
