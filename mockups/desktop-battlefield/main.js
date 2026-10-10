import { layout } from '../bigger-map/geometry.js';

const cities = [
  ['north', 'enemy', 36, 180, 40],
  ['north-west', 'neutral', 8, 65, 100], ['north-east', 'neutral', 12, 295, 100],
  ['upper-west', 'neutral', 10, 115, 170], ['upper-east', 'neutral', 10, 245, 170],
  ['west', 'neutral', 8, 40, 240], ['centre', 'neutral', 20, 180, 240], ['east', 'neutral', 8, 320, 240],
  ['lower-west', 'neutral', 10, 115, 310], ['lower-east', 'neutral', 10, 245, 310],
  ['south-west', 'neutral', 12, 65, 380], ['south-east', 'neutral', 8, 295, 380],
  ['south', 'player', 36, 180, 440],
].map(([id, owner, units, x, y]) => ({ id, owner, units, x, y }));
const colors = {
  player: { region: '#dfebe3', fill: '#267c72', stroke: '#267c72', ink: '#fff' },
  enemy: { region: '#f0e3db', fill: '#bd624e', stroke: '#bd624e', ink: '#fff' },
  neutral: { region: '#eef1e9', fill: '#fcfcfa', stroke: '#bdc9ba', ink: '#404b46' },
};
const { cells } = layout(cities, 360, 480);
document.getElementById('board').innerHTML = cells.map((cell, i) => `<polygon points="${cell.map(p => `${p.x},${p.y}`).join(' ')}" fill="${colors[cities[i].owner].region}" stroke="#cbd5c6" stroke-width=".7"/>`).join('') + cities.map(city => {
  const color = colors[city.owner];
  return `<circle cx="${city.x}" cy="${city.y}" r="21" fill="${color.fill}" stroke="${color.stroke}" stroke-width="1.5"/><text x="${city.x}" y="${city.y}" text-anchor="middle" dominant-baseline="central" font-size="17" font-weight="600" fill="${color.ink}">${city.units}</text>`;
}).join('');
const pause = document.getElementById('pause');
const overlay = document.getElementById('overlay');
const resume = document.getElementById('resume');
function close() { overlay.hidden = true; pause.focus(); }
pause.addEventListener('click', () => { overlay.hidden = false; resume.focus(); });
resume.addEventListener('click', close);
document.getElementById('restart').addEventListener('click', close);
overlay.addEventListener('keydown', event => {
  if (event.key === 'Escape') { event.preventDefault(); close(); }
  if (event.key === 'Tab') {
    event.preventDefault();
    const restart = document.getElementById('restart');
    (document.activeElement === resume ? restart : resume).focus();
  }
});
if (new URLSearchParams(location.search).get('state') === 'paused') { overlay.hidden = false; resume.focus(); }
