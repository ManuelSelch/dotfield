import { maps } from './maps.js';
import { layout } from '../bigger-map/geometry.js';

const options = [
  ['industry', 'Industry', '+25% production · You only'],
  ['factory', 'Factory', '2× starting-city production · You only'],
  ['slow-zone', 'Slow Zone', '50% hostile speed within 90 units · Random city · Neutral slows everyone'],
  ['watchtower', 'Watchtower', 'Shoots up to 4 nearby enemy troops per second · Changes sides if captured'],
];
const selections = new Map();
const behaviors = new Map();
function upgradeMarkup(faction) {
  return options.map(([id, name, description]) => `<label class="upgrade"><input type="checkbox" data-faction="${faction}" data-upgrade="${id}" ${selections.get(`${faction}:${id}`) ? 'checked' : ''}/><span>${name}<small>${faction === 'player' ? description : description.replace('You only', 'This enemy only')}</small></span></label>`).join('');
}
document.getElementById('player-upgrades').innerHTML = upgradeMarkup('player');
const params = new URLSearchParams(location.search);
const requested = Number(params.get('map') ?? 1);
let selected = Number.isInteger(requested) && requested >= 1 && requested <= maps.length ? requested - 1 : 0;
const palette = {
  player: ['#dcece3','#267c72','#fff'], enemy: ['#f0e1d9','#bd624e','#fff'],
  'enemy-2': ['#e8e4f0','#7162a7','#fff'], neutral: ['#edf0e7','#fcfcfa','#404b46'],
};
function draw() {
  const nodes = maps[selected], { cells } = layout(nodes,360,480);
  const svg = document.getElementById('map');
  svg.setAttribute('aria-label', `Map ${selected + 1} preview`);
  svg.innerHTML = cells.map((points,i) => `<polygon points="${points.map(p => `${p.x},${p.y}`).join(' ')}" fill="${palette[nodes[i].owner][0]}" stroke="#d2dbce" stroke-width=".7"/>`).join('') + nodes.map(city => `<circle cx="${city.x}" cy="${city.y}" r="21" fill="${palette[city.owner][1]}" stroke="${city.owner === 'neutral' ? '#bdc9ba' : palette[city.owner][1]}" stroke-width="1.5"/><text x="${city.x}" y="${city.y}" text-anchor="middle" dominant-baseline="central" fill="${palette[city.owner][2]}" font-size="17" font-weight="600">${city.units}</text>`).join('');
  document.querySelector('.dots').innerHTML = maps.map((_,i) => `<i class="${i === selected ? 'active' : ''}"></i>`).join('');
  const enemies = [...new Set(nodes.map(n => n.owner).filter(owner => owner !== 'player' && owner !== 'neutral'))];
  document.getElementById('enemies').innerHTML = enemies.map(faction => `<section class="enemy"><label class="behavior">${faction} behavior <select data-enemy="${faction}" aria-label="${faction} AI behavior">${['balanced','aggressive','defensive'].map(value => `<option value="${value}" ${behaviors.get(faction) === value ? 'selected' : ''}>${value[0].toUpperCase()+value.slice(1)}</option>`).join('')}</select></label><div role="group" aria-label="${faction} upgrades">${upgradeMarkup(faction)}</div></section>`).join('');
}
function change(offset) { selected = (selected + offset + maps.length) % maps.length; draw(); }
document.querySelector('.previous').addEventListener('click', () => change(-1));
document.querySelector('.next').addEventListener('click', () => change(1));
document.querySelector('.map-panel').addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); change(event.key === 'ArrowLeft' ? -1 : 1); }
});
document.querySelector('.settings').addEventListener('change', event => {
  const input = event.target;
  if (input.dataset.upgrade) selections.set(`${input.dataset.faction}:${input.dataset.upgrade}`, input.checked);
  if (input.dataset.enemy) behaviors.set(input.dataset.enemy,input.value);
});
document.getElementById('play').addEventListener('click', () => {
  // No gameplay or persistence in this isolated layout review.
  document.getElementById('preview-status').textContent = 'Layout preview only; production Play behavior is unchanged.';
});
draw();
if (params.get('enemies') === 'open') document.getElementById('enemy-settings').open = true;
