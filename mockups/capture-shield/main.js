const teal = '#267c72';
const enemy = '#bd624e';
function arc(slot) {
  const a = (-90 + slot * 120 + 12) * Math.PI / 180;
  const b = (-90 + slot * 120 + 108) * Math.PI / 180;
  return `M ${23 * Math.cos(a)} ${23 * Math.sin(a)} A 23 23 0 0 1 ${23 * Math.cos(b)} ${23 * Math.sin(b)}`;
}
function cityMarkup(charges, color = teal, badge = '', spent = []) {
  const arcs = [0, 1, 2].map(i => i < charges || spent.includes(i) ? `<path class="shield ${spent.includes(i) ? 'spent' : ''}" stroke="${color}" d="${arc(i)}"/>` : '').join('');
  const badgeMarkup = badge ? `<g transform="translate(23 ${badge === 'factory' ? -23 : 23})"><circle r="7" fill="${color}" stroke="white" stroke-width=".7"/><path d="${badge === 'factory' ? 'M-4 4V-1L-1 0V-3L2-1V-5H4V4Z' : 'M-3 4V-2H-4V-5H-2V-3H0V-5H2V-3H4V-2H3V4Z'}" fill="white"/></g>` : '';
  return `${arcs}<circle r="17" fill="${color}"/><text class="counter" y="-2">${units}</text>${color === teal ? '<circle cy="9.5" r="2.3" fill="white"/>' : '<rect x="-2" y="8" width="4" height="4" fill="white"/>'}${badgeMarkup}`;
}
let charges = 3;
let units = 12;
let busy = false;
let timer;
let generation = 0;
const city = document.querySelector('#city');
city.setAttribute('transform', 'translate(105 91)');
function render(spent = []) {
  city.innerHTML = cityMarkup(charges, teal, '', spent);
  document.querySelector('#charges').textContent = `${charges} / 3 charges`;
  document.querySelector('#battle').setAttribute('aria-label', `Player city, ${units} units, Capture shield ${charges} of 3 charges`);
}
function setBusy(value) {
  busy = value;
  document.querySelector('#hit').disabled = value;
  document.querySelector('#batch').disabled = value;
}
function attack(count) {
  if (busy) return;
  setBusy(true);
  const token = ++generation;
  const incoming = document.querySelector('#incoming');
  incoming.innerHTML = Array.from({ length: count * 5 }, (_, i) => {
    const batch = Math.floor(i / 5);
    const slot = i % 5;
    return `<circle class="troop" cx="${260 + batch * 30 + (slot % 2) * 10}" cy="${81 + Math.floor(slot / 2) * 10}" r="3.8"/>`;
  }).join('');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();
  const duration = reduced ? 0 : 650;
  function step(now) {
    if (!busy || token !== generation) return;
    const progress = duration ? Math.min(1, (now - start) / duration) : 1;
    incoming.setAttribute('transform', `translate(${-140 * progress} 0)`);
    if (progress < 1) { requestAnimationFrame(step); return; }
    const absorbed = Math.min(charges, count);
    const spent = Array.from({ length: absorbed }, (_, i) => charges - 1 - i);
    charges -= absorbed;
    const damage = Math.min(units, (count - absorbed) * 5);
    units -= damage;
    incoming.innerHTML = '';
    incoming.removeAttribute('transform');
    render(spent);
    document.querySelector('#status').textContent = `${absorbed} ${absorbed === 1 ? 'batch' : 'batches'} blocked (${absorbed * 5} troops) · ${damage} garrison lost · ${units} units remain${charges ? '' : ' · shield depleted'}`;
    timer = setTimeout(() => { render(); setBusy(false); }, reduced ? 0 : 650);
  }
  requestAnimationFrame(step);
}
document.querySelector('#hit').onclick = () => attack(1);
document.querySelector('#batch').onclick = () => attack(3);
document.querySelector('#reset').onclick = () => {
  generation++; clearTimeout(timer); setBusy(false); charges = 3; units = 12;
  document.querySelector('#incoming').innerHTML = '';
  document.querySelector('#incoming').removeAttribute('transform');
  document.querySelector('#status').textContent = 'Freshly captured · garrison 12 · shield 3'; render();
};
const examples = [
  ['Fresh capture', '3 charges', 3, teal, ''],
  ['One batch blocked', '2 charges', 2, teal, ''],
  ['Depleted', 'No ring', 0, teal, ''],
  ['Factory', 'Shield + badge', 3, teal, 'factory'],
  ['Watchtower', 'Shield + badge', 3, teal, 'tower'],
  ['Enemy capture', 'Owner-coloured', 3, enemy, ''],
];
document.querySelector('#tiles').innerHTML = examples.map(([label, detail, count, color, badge]) => `<div class="tile"><svg viewBox="0 0 120 96" role="img" aria-label="${label}: ${detail}"><g transform="translate(60 48)">${cityMarkup(count, color, badge)}</g></svg><p>${label}</p><small>${detail}</small></div>`).join('');
render();
