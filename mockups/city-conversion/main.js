// Disposable control study: local fake data, no production imports or persistence.
const $ = selector => document.querySelector(selector);
const prices = { Production: 10, Defender: 20, Airfield: 30 };
const seed = [
  { id: 'a', name: 'Orchard', x: 78, y: 68, owner: 'you', type: 'Production', troops: 48 },
  { id: 'b', name: 'Meadow', x: 78, y: 189, owner: 'you', type: 'Airfield', troops: 126, phase: 'ready' },
  { id: 'c', name: 'Grove', x: 90, y: 300, owner: 'you', type: 'Defender', troops: 24 },
  { id: 'd', name: 'Ridge', x: 276, y: 66, owner: 'enemy', type: 'Production', troops: 20 },
  { id: 'e', name: 'Lookout', x: 278, y: 191, owner: 'neutral', type: 'Defender', troops: 32 },
  { id: 'f', name: 'Clearing', x: 275, y: 302, owner: 'you', type: 'Production', troops: 18 },
];
let cities, selected = null, mode = null, gesture = null, timers = [];
const byId = id => cities.find(city => city.id === id);
const tell = message => { $('#status').textContent = message; };
const schedule = (fn, delay) => timers.push(setTimeout(fn, delay));
const cityAt = element => element?.closest('[data-city]')?.dataset.city || null;
const focusCity = id => document.querySelector(`button[data-city="${id}"]`)?.focus({ preventScroll: true });
function phaseText(city) {
  return ({ ready: 'Plane ready · capacity 100', preparing: 'Preparing plane · illustrative 20s',
    outbound: 'Plane away · ground available', unloading: 'Docked · unloading', returning: 'Returning empty',
    turnaround: 'Turnaround · illustrative 10s' })[city.phase] || '';
}
function render() {
  // Stable city buttons preserve keyboard focus during status changes.
  for (const city of cities) {
    const button = document.querySelector(`button[data-city="${city.id}"]`);
    button.className = `city ${city.owner}`;
    button.querySelector('.dot').textContent = city.troops;
    button.querySelector('.badge').textContent = city.type === 'Airfield' ? '✈' : city.type === 'Defender' ? '◇' : '';
    button.setAttribute('aria-pressed', String(selected === city.id));
    button.setAttribute('aria-disabled', String(city.owner !== 'you' && !mode));
    button.setAttribute('aria-label', `${city.name}, ${city.owner === 'you' ? 'owned' : city.owner}, ${city.type}, ${city.troops} troops. ${phaseText(city)}${city.owner !== 'you' && !mode ? ' Cannot manage.' : ''}`);
    document.querySelector(`.region[data-city="${city.id}"]`).classList.toggle('selected', selected === city.id);
    document.querySelector(`.region[data-city="${city.id}"]`).classList.toggle('target', !!mode && selected !== city.id);
  }
  $('.match span').innerHTML = `<i></i> You · ${cities.filter(city => city.owner === 'you').length} cities`;
  const city = byId(selected);
  const active = city?.owner === 'you';
  $('#dock').hidden = !active;
  $('#empty').hidden = active;
  $('#hint').textContent = mode === 'fly' ? 'Tap any other city to fly · Cancel or Escape to exit'
    : mode === 'ground' ? 'Choose a same-bank city for ground dispatch · Escape to cancel'
      : 'Tap your city to manage · drag to send by ground';
  if (!active) return;
  $('#city-name').textContent = `${city.name} · ${city.type}`;
  $('#city-detail').textContent = `${city.troops} garrison troops · ${city.type === 'Production' ? 'Troop growth' : 'No troop growth'}`;
  const busy = ['outbound', 'unloading', 'returning'].includes(city.phase);
  for (const button of document.querySelectorAll('[data-type]')) {
    const type = button.dataset.type;
    const current = type === city.type;
    button.setAttribute('aria-pressed', String(current));
    button.disabled = current || busy || !!mode || city.troops <= prices[type];
    button.querySelector('small').textContent = current ? 'Current · no charge' : `${prices[type]} troops`;
    button.setAttribute('aria-describedby', 'reason');
  }
  $('#reason').textContent = mode ? 'Targeting active. Cancel before changing city type.'
    : busy ? 'Conversion unavailable while the plane is away. Ground orders still work.'
      : `Instant conversion; leave 1 troop. ${city.troops <= 30 ? 'Dimmed types need more troops.' : 'No refund when switching.'}`;
  $('#plane-status').textContent = mode ? 'Tap any other city to fly · Escape to cancel' : city.type === 'Airfield' ? phaseText(city)
    : city.type === 'Defender' ? 'Shields · capacity 3, recharge 10s (not simulated)' : 'Production · normal growth (not simulated)';
  $('#fly').hidden = city.type !== 'Airfield' || !!mode;
  $('#fly').disabled = city.phase !== 'ready' || city.troops < 2;
  $('#fly').title = city.phase !== 'ready' ? 'Plane must be ready' : 'Board up to 100; leave 1 troop';
  $('#cancel').hidden = !mode;
}
function close() {
  const old = selected;
  selected = null; mode = null;
  $('#route').setAttribute('hidden', '');
  render();
  if (old) focusCity(old);
}
function targetMode(next) {
  const city = byId(selected);
  if (!city || city.owner !== 'you') return;
  if (next === 'fly' && (city.phase !== 'ready' || city.troops < 2)) return;
  mode = next; render();
  tell(next === 'fly' ? `Fly from ${city.name}: tap a target. Up to 100 troops, leaving one behind. Simulated here.` : 'Choose a target for an ordinary ground order.');
  focusCity(cities.find(candidate => candidate.id !== selected).id);
}
function selectCity(id) {
  const city = byId(id);
  if (mode) {
    if (!city || city.id === selected) { tell('Choose a different city, or cancel.'); return; }
    if (mode === 'fly') launch(byId(selected), city);
    else groundOrder(byId(selected), city);
    return;
  }
  if (city?.owner !== 'you') {
    close(); tell(city ? `${city.name} is not owned. Conversion controls are unavailable.` : 'City controls dismissed.'); return;
  }
  selected = id; render();
  tell(`${city.name} selected. Choose a type to convert, or use ground dispatch${city.type === 'Airfield' ? ' or Fly' : ''}.`);
}
function groundOrder(source, target) {
  if (!source || source.owner !== 'you' || source.id === target?.id || !target) {
    mode = null; render(); tell('No ground order issued.'); return;
  }
  mode = null;
  if ((source.x < 180) !== (target.x < 180)) {
    render(); tell('Ground route blocked by the river. Fly can cross it. No troops spent.'); return;
  }
  if (source.troops < 2) { render(); tell('Not enough troops for ground dispatch.'); return; }
  const count = source.troops - 1;
  source.troops = 1;
  render();
  tell(`Ground order: ${count} troops from ${source.name} to ${target.name}. Drag preserved; travel/combat omitted.`);
}
function positionPlane(x, y, cargo) {
  const plane = $('#plane');
  plane.hidden = false; plane.style.left = `${x / 3.6}%`; plane.style.top = `${y / 3.6}%`;
  plane.querySelector('small').textContent = cargo ? String(cargo) : 'empty';
}
function launch(source, target) {
  if (source?.owner !== 'you' || source.phase !== 'ready' || source.troops < 2) return;
  mode = null;
  const load = Math.min(100, source.troops - 1);
  let cargo = load;
  source.troops -= cargo; source.phase = 'outbound'; render();
  positionPlane(source.x, source.y, cargo);
  const dx = source.x - target.x, dy = source.y - target.y;
  const length = Math.hypot(dx, dy);
  const dock = { x: target.x + dx / length * 27, y: target.y + dy / length * 27 };
  tell(`Illustrative flight to ${target.name}: ${load} boarded; ${source.troops} stay home.`);
  schedule(() => positionPlane(dock.x, dock.y, cargo), 40);
  schedule(() => {
    source.phase = 'unloading'; render();
    const pulse = () => {
      const batch = Math.min(5, cargo); cargo -= batch;
      if (target.owner === 'you') target.troops += batch;
      else if (batch > target.troops) { target.troops = batch - target.troops; target.owner = 'you'; }
      else target.troops -= batch;
      positionPlane(dock.x, dock.y, cargo); render();
      const button = document.querySelector(`button[data-city="${target.id}"]`);
      button.classList.remove('pulse'); void button.offsetWidth; button.classList.add('pulse');
      tell(`Dock & pulse · ${batch} delivered to ${target.name} · ${cargo} aboard. Combat simplified; shields omitted.`);
      if (cargo) schedule(pulse, 200);
      else {
        source.phase = 'returning'; render();
        schedule(() => { positionPlane(source.x, source.y, 0); tell('Delivery complete · returning empty.'); }, 350);
        schedule(() => {
          $('#plane').hidden = true; source.phase = 'turnaround'; render();
          tell('Home · turnaround illustrated, not a real game clock. Reset to replay.');
        }, 1500);
      }
    };
    pulse();
  }, 1100);
}
function reset() {
  timers.forEach(clearTimeout); timers = [];
  cities = seed.map(city => ({ ...city })); selected = 'a'; mode = null; gesture = null;
  $('#plane').hidden = true; $('#route').setAttribute('hidden', '');
  document.querySelectorAll('.pulse').forEach(el => el.classList.remove('pulse'));
  const state = $('#scenario').value;
  if (state === 'poor') cities[0].troops = 12;
  if (['ready', 'busy', 'preparing', 'returning', 'targeting'].includes(state)) selected = 'b';
  if (state === 'busy') cities[1].phase = 'outbound';
  if (state === 'preparing') cities[1].phase = 'preparing';
  if (state === 'returning') cities[1].phase = 'returning';
  if (state === 'lost') { cities[0].owner = 'enemy'; selected = null; }
  if (state === 'targeting') mode = 'fly';
  render(); tell(state === 'lost' ? 'Ownership lost: actionable selection cleared. Enemy taps cannot reopen it.' : 'Fake state restored. Confirmed initial rules; no live game simulation.');
}
// Create semantic keyboard controls with compact visuals and 44px hit areas.
$('#cities').innerHTML = seed.map(city => `<button class="city" data-city="${city.id}" style="left:${city.x / 3.6}%;top:${city.y / 3.6}%"><span class="dot"></span><span class="badge" aria-hidden="true"></span><span class="label" aria-hidden="true">${city.name}</span></button>`).join('');
$('#type-actions').innerHTML = Object.keys(prices).map(type => `<button data-type="${type}"><span>${type}</span><small></small></button>`).join('');
$('#type-actions').addEventListener('click', event => {
  const button = event.target.closest('[data-type]');
  if (!button || button.disabled) return;
  const city = byId(selected), type = button.dataset.type;
  if (!city || city.owner !== 'you' || mode || city.type === type || city.troops <= prices[type] || ['outbound', 'unloading', 'returning'].includes(city.phase)) return;
  city.troops -= prices[type]; city.type = type; city.phase = type === 'Airfield' ? 'preparing' : null;
  render(); tell(`${city.name} converted to ${type} for ${prices[type]} troops. Instant conversion simulated.`);
  focusCity(city.id);
});
$('#board').addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  const source = cityAt(event.target);
  gesture = { id: event.pointerId, source, x: event.clientX, y: event.clientY, moved: false };
  $('#board').setPointerCapture(event.pointerId);
});
$('#board').addEventListener('pointermove', event => {
  if (!gesture || gesture.id !== event.pointerId) return;
  gesture.moved ||= Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8;
  const source = byId(gesture.source);
  if (!gesture.moved || source?.owner !== 'you' || mode) return;
  const rect = $('#board').getBoundingClientRect(), route = $('#route');
  route.removeAttribute('hidden');
  route.setAttribute('x1', source.x); route.setAttribute('y1', source.y);
  route.setAttribute('x2', (event.clientX - rect.left) / rect.width * 360);
  route.setAttribute('y2', (event.clientY - rect.top) / rect.height * 360);
});
$('#board').addEventListener('pointerup', event => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const action = gesture; gesture = null;
  $('#board').releasePointerCapture(event.pointerId);
  $('#route').setAttribute('hidden', '');
  const target = cityAt(document.elementFromPoint(event.clientX, event.clientY));
  if (action.moved) {
    if (mode) { tell('Targeting uses a tap. Cancel first to send a ground drag.'); return; }
    selected = null; groundOrder(byId(action.source), byId(target)); render();
  } else if (!target) close();
  else selectCity(target);
});
$('#board').addEventListener('pointercancel', () => { gesture = null; $('#route').setAttribute('hidden', ''); });
$('#cities').addEventListener('click', event => {
  // Pointer activation is handled above; keyboard/screen-reader activation uses click.
  if (event.detail === 0) selectCity(cityAt(event.target));
});
$('#fly').onclick = () => targetMode('fly');
$('#cancel').onclick = () => { mode = null; render(); focusCity(selected); tell('Targeting cancelled. No troops boarded.'); };
$('#close').onclick = close;
$('#scenario').onchange = () => {
  const url = new URL(location.href); url.searchParams.set('state', $('#scenario').value);
  history.replaceState(null, '', url); reset();
};
$('#reset').onclick = reset;
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#board, #dock, .review')) close();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    if (mode) { mode = null; render(); focusCity(selected); tell('Targeting cancelled. No troops boarded.'); }
    else close();
  }
});
const requested = new URLSearchParams(location.search).get('state');
if ([...$('#scenario').options].some(option => option.value === requested)) $('#scenario').value = requested;
reset();
