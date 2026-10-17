const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const layoutNames = { open: 'Open field', river: 'River', mountains: 'Mountains', courtyard: 'Courtyard' };
const factions = [
  { id: 'player', name: 'You', color: '#267c72', tint: '#dcece3' },
  { id: 'enemy', name: 'Enemy 1', color: '#bd624e', tint: '#f0e3d9' },
  { id: 'enemy-2', name: 'Enemy 2', color: '#6685a5', tint: '#e0e8ed' },
  { id: 'enemy-3', name: 'Enemy 3', color: '#9277a2', tint: '#e9e2ec' },
  { id: 'enemy-4', name: 'Enemy 4', color: '#b08b49', tint: '#eee7d9' },
];
const roles = {
  production: { name: 'Production', cost: 10, path: 'M3 21V10l6 3V7l6 4V3h5v18ZM7 17v1m5-1v1m5-1v1' },
  defender: { name: 'Defender', cost: 20, path: 'M12 3l8 4v6c0 4-4 7-8 9-4-2-8-5-8-9V7Z' },
  airfield: { name: 'Airfield', cost: 30, path: 'M12 3v18m0-14 9 6v3l-9-3-9 3v-3Zm0 10 4 4H8Z' },
  watchtower: { name: 'Watchtower', cost: 30, path: 'M5 3v5h14V3m-7 0v5M7 8l-2 13h14L17 8M10 21v-5h4v5' },
  artillery: { name: 'Artillery', cost: 40, path: 'M5 14l13-8 3 4-13 8ZM8 18l-3 3m8-6 5 6M4 16a3 3 0 1 0 6 0' },
};
const views = ['home', 'countdown', 'neutral', 'holding', 'urgent', 'paused', 'result'];
let view = views.includes(params.get('state')) ? params.get('state') : 'home';
let layout = Object.hasOwn(layoutNames, params.get('layout')) ? params.get('layout') : Number(params.get('enemies')) > 1 ? 'open' : 'courtyard';
let enemies = layout === 'courtyard' ? 1 : Math.max(1, Math.min(4, Number(params.get('enemies')) || 2));
let count = [20, 24, 30].includes(Number(params.get('cities'))) ? Number(params.get('cities')) : 24;
let relay = params.has('relay') ? params.get('relay') === 'on' : view !== 'home';
let factory = params.get('factory') !== 'off', slow = params.get('slow') === 'on';
let selected = null, flying = false, generation = 0, owner, scores, elapsed, winner;
const conversions = new Map();
const participants = () => factions.slice(0, enemies + 1);
const info = id => factions.find(f => f.id === id) ?? { name: 'Neutral', color: '#9aa68f', tint: '#eef1e9' };
const clock = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
function preset(next) {
  view = next; selected = null; flying = false; conversions.clear(); winner = 'player';
  elapsed = next === 'countdown' ? 72 : next === 'urgent' ? 494 : next === 'result' ? 582 : 238;
  owner = ['home', 'countdown', 'neutral'].includes(next) ? 'neutral' : next === 'urgent' ? 'enemy' : 'player';
  scores = Object.fromEntries(factions.map((f, i) => [f.id, next === 'home' || next === 'countdown' ? 0 : [45, 19, 34, 11, 6][i]]));
  if (next === 'urgent') { scores.player = 112; scores.enemy = 165; }
  if (next === 'result') scores.player = 180;
}
preset(view);

// Fake, deterministic geometry. Courtyard follows the production recipe's logical
// scale; other layouts are packing illustrations, NOT a replacement generator.
function mapData() {
  let cities, mountains = [], water = null, bridges = [];
  if (layout === 'courtyard') {
    const anchors = [
      ['home-player', 65, 575, 'player'], ['home-enemy', 355, 575, 'enemy'],
      ['supply-west', 80, 495], ['supply-east', 340, 495], ['bridge-south-west', 65, 445], ['bridge-south-east', 355, 445],
      ['bridge-north-west', 65, 355], ['bridge-north-east', 355, 355], ['entrance-south', 210, 345], ['courtyard', 210, 245],
      ['entrance-north', 210, 130], ['valley-west', 65, 235], ['valley-east', 355, 235], ['economy-west', 75, 85], ['economy-east', 345, 85],
      ['upper-link', 210, 35],
    ];
    const pairs = [[160, 445], [150, 555], [30, 155], [130, 145], [130, 35], [140, 335], [30, 295]];
    const rotated = [...pairs.slice(generation % pairs.length), ...pairs.slice(0, generation % pairs.length)];
    for (const [x, y] of rotated.slice(0, (count - anchors.length) / 2)) anchors.push([`extra-${x}-${y}-west`, x, y], [`extra-${x}-${y}-east`, 420 - x, y]);
    cities = anchors.map(([id, x, y, faction = 'neutral']) => ({ id, x: x * 360 / 420, y: y * 480 / 620, owner: faction }));
    mountains = [[115, 180, 165, 300], [255, 180, 305, 300], [185, 465, 235, 610]].map(([a,b,c,d]) => [a*360/420,b*480/620,c*360/420,d*480/620]);
    water = [386 * 480 / 620, 414 * 480 / 620]; bridges = [65 * 360 / 420, 355 * 360 / 420];
  } else {
    const grid = [40,115,190,290,365,440].flatMap((y, row) => [35,107,180,253,325].map((x,col) => ({ id: `city-${row}-${col}`, x, y, owner: 'neutral' })));
    const required = [25,29,0,4,15,12,11,13,16,18];
    cities = [...required, ...grid.map((_,i) => i).filter(i => !required.includes(i))].slice(0,count).map(i => ({ ...grid[i] }));
    participants().forEach((f, i) => { cities[i].owner = f.id; cities[i].id = `home-${f.id}`; });
    if (layout === 'mountains') {
      mountains = [[163,145,197,335]];
      cities.forEach(c => { if (c.x === 180 && c.y > 130 && c.y < 350) c.x = 143; });
    }
    if (layout === 'river') { water = [225,255]; bridges = [107,253]; }
  }
  const relayCity = layout === 'courtyard' ? cities.find(c => c.id === 'courtyard') : cities.filter(c => c.owner === 'neutral').sort((a,b) => Math.hypot(a.x-180,a.y-240)-Math.hypot(b.x-180,b.y-240) || a.id.localeCompare(b.id))[0];
  cities = cities.map(c => {
    const isRelay = c.id === relayCity.id;
    const faction = isRelay && relay && view !== 'home' ? owner : c.owner;
    const overridden = conversions.get(c.id);
    return { ...c, owner: faction, isRelay: isRelay && relay, role: overridden?.role ?? 'production',
      units: overridden?.units ?? (faction === 'neutral' ? 10 : isRelay ? 64 : 36),
      factory: factory && (layout === 'courtyard' ? c.id.startsWith('economy-') : ['city-0-1', 'city-0-3'].includes(c.id)) };
  });
  return { cities, mountains, water, bridges, relayId: relayCity.id };
}
function svg(tag, attrs, parent) {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  parent.append(element); return element;
}
function cell(city, cities, water) {
  const north = !water || city.y < water[0];
  let poly = [{x:0,y:north?0:water[1]},{x:360,y:north?0:water[1]},{x:360,y:water&&north?water[0]:480},{x:0,y:water&&north?water[0]:480}];
  for (const other of cities) {
    if (city === other || water && north !== (other.y < water[0])) continue;
    const dx=other.x-city.x,dy=other.y-city.y,limit=(other.x**2+other.y**2-city.x**2-city.y**2)/2;
    const side=p=>p.x*dx+p.y*dy-limit, out=[];
    for(let i=0;i<poly.length;i++) { const a=poly[i],b=poly[(i+1)%poly.length],sa=side(a),sb=side(b); if(sa<=0)out.push(a); if((sa<=0)!==(sb<=0)){const t=sa/(sa-sb);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});} }
    poly=out;
  }
  return poly.map(p=>`${p.x},${p.y}`).join(' ');
}
function drawMap(target, interactive = false) {
  target.replaceChildren();
  const {cities,mountains,water,bridges} = mapData();
  for (const c of cities) {
    const region = svg('polygon', { class:'region', fill:info(c.owner).tint, points:cell(c,cities,water) }, target);
    if (interactive) region.addEventListener('click', () => selectCity(c));
  }
  if (water) {
    svg('rect', {class:'river',x:0,y:water[0],width:360,height:water[1]-water[0]}, target);
    for(const x of bridges) { svg('rect',{class:'bridge',x:x-32,y:water[0]-4,width:64,height:water[1]-water[0]+8,rx:3},target); svg('path',{class:'rail',d:`M${x-26} ${water[0]-2}v${water[1]-water[0]+4} M${x+26} ${water[0]-2}v${water[1]-water[0]+4}`},target); }
  }
  for (const [left,top,right,bottom] of mountains) {
    const g = svg('g',{transform:`translate(${left} ${top}) scale(${(right-left)/100} ${(bottom-top)/100})`},target);
    svg('polygon',{class:'mountain',points:'0,20 15,5 30,15 45,0 60,15 80,5 100,20 90,40 100,60 90,80 100,95 75,100 50,90 25,100 0,90 10,65 0,40'},g);
    svg('path',{class:'shadow',d:'M45 0L60 15 80 5 100 20 90 40 100 60 90 80 100 95 75 100 65 70 50 45 60 25Z'},g);
    svg('path',{class:'ridge',d:'M30 15l10 25-15 20 20 30 M60 15l-10 30 15 25-15 20'},g);
  }
  if (slow) svg('circle',{cx:cities[2].x,cy:cities[2].y,r:90,fill:'#b6c6ae',opacity:'.12','pointer-events':'none'},target);
  for (const c of cities) {
    const g = svg('g',{class:`map-city ${selected === c.id ? 'selected':''}`,transform:`translate(${c.x} ${c.y})`,...(interactive ? {tabindex:0,role:'button','aria-label':`${c.isRelay?'Relay, ':''}${info(c.owner).name}, ${roles[c.role].name}, ${c.units} troops`} : {})},target);
    if(c.isRelay) {
      svg('circle',{class:'relay-ring',r:22},g);
      const label = svg('text',{class:'relay-label',y:-29},g); label.textContent='RELAY';
    }
    svg('circle',{class:'city-disc',r:14,fill:c.owner==='neutral'?'#fcfcfa':info(c.owner).color,stroke:info(c.owner).color},g);
    const text = svg('text',{class:'city-text',y:1,fill:c.owner==='neutral'?'#465246':'white'},g); text.textContent=c.units;
    if(c.factory) svg('path',{class:'factory-badge',d:'M-9-18v-8l5 3v-5l6 4v-8h4v14Z'},g);
    if(c.role!=='production') { const badge=svg('g',{transform:'translate(11 -14) scale(.45)'},g);svg('circle',{r:15,fill:'#fcfcf8',stroke:'#b9c8b4'},badge);svg('path',{d:roles[c.role].path,transform:'translate(-12 -12)',fill:'none',stroke:info(c.owner).color,'stroke-width':2},badge); }
    if(interactive) { g.addEventListener('click',()=>selectCity(c));g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectCity(c);}}); }
  }
}
function selectCity(c) {
  if(['paused','result'].includes(view)) return;
  if (flying) { flying=false; $('notice').textContent=`Illustrative flight to ${c.isRelay?'the relay':c.id}; no aircraft simulation runs.`; render(); return; }
  selected = c.owner === 'player' ? c.id : null;
  $('notice').textContent=selected ? `${c.isRelay?'Relay':'City'} selected. Conversion keeps its relay identity; costs are simulated.` : 'Only your cities expose conversion controls. Use Simulate capture to change relay ownership.';
  render();
}
function renderHome() {
  $('home').innerHTML=`<div class="settings"><h2>Layout</h2><div class="layouts">${Object.entries(layoutNames).map(([id,name])=>`<button data-layout="${id}" aria-pressed="${layout===id}">${name}</button>`).join('')}</div>
    <div class="setting"><label for="cities">Cities</label><select id="cities">${[20,24,30].map(n=>`<option ${n===count?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="setting">Enemies</div><div class="segments" aria-label="Enemy count">${[1,2,3,4].map(n=>`<button data-enemies="${n}" aria-pressed="${enemies===n}" ${layout==='courtyard'&&n!==1?'disabled':''}>${n}</button>`).join('')}</div>
    <p class="hint">${layout==='courtyard'?'Courtyard requires 20–30 cities and one enemy.':'Other layouts retain 6–30 cities in production; this study shows dense 20/24/30 presets.'}</p>
    <div class="field-settings"><h2>On the field</h2>${[['factory','Factory',factory,''],['slow','Slow Zone',slow,''],['relay','Relay',relay,'Activates at 2:00 · hold for 3:00 total']].map(([key,name,on,desc])=>`<div class="toggle-row"><div class="toggle-label">${name}${desc?`<small>${desc}</small>`:''}</div><div class="segments" role="group" aria-label="${name}"><button data-toggle="${key}" data-value="off" aria-pressed="${!on}">Off</button><button data-toggle="${key}" data-value="on" aria-pressed="${on}">On</button></div></div>`).join('')}</div>
    <details><summary>Your upgrades / Enemy settings</summary><p class="hint">Existing controls unchanged; omitted from this study.</p></details><div class="actions"><button id="reroll">Reroll</button><button id="play" class="primary">Play</button></div></div>
    <aside class="preview"><div class="preview-header"><span>PREVIEW</span><span>${count} cities · ${enemies} ${enemies===1?'enemy':'enemies'}</span></div><div class="preview-frame"><svg id="preview-map" viewBox="0 0 360 480" role="img" aria-label="${layoutNames[layout]} preview${relay?' with a central relay':''}"></svg></div><div class="preview-badges"><span>${layoutNames[layout]}</span>${relay?'<span>Relay · 2:00 / 180s</span>':''}</div><p class="hint">${relay?(layout==='courtyard'?'The courtyard city is the relay.':'A central neutral city is the relay. This illustrative selection does not prove balanced access.'):'Conquest rules · Relay is Off'}</p></aside>`;
  drawMap($('preview-map'));
  document.querySelectorAll('[data-layout]').forEach(b=>b.onclick=()=>{layout=b.dataset.layout;if(layout==='courtyard')enemies=1;render();});
  $('cities').onchange=e=>{count=Number(e.target.value);render();};
  document.querySelectorAll('[data-enemies]').forEach(b=>b.onclick=()=>{enemies=Number(b.dataset.enemies);render();});
  document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>{const on=b.dataset.value==='on';if(b.dataset.toggle==='relay')relay=on;if(b.dataset.toggle==='factory')factory=on;if(b.dataset.toggle==='slow')slow=on;render();});
  $('reroll').onclick=()=>{generation++;render();$('notice').textContent=layout==='courtyard'?'Illustrative alternate expansion pairs. Production will use the seeded generator.':'Regular-layout geometry is fixed in this mockup; no real reroll runs.';};
  $('play').onclick=()=>{preset('countdown');render();$('app').scrollIntoView({block:'start'});$('notice').textContent=relay?'Fake countdown state. Use the review controls to change match moments.':'Conquest-only mock match. Relay HUD and objective marker are absent.';};
}
function renderHud() {
  $('hud').hidden=!relay;
  $('hud').className=`hud ${view}`;
  const active=elapsed>=120;
  let title=!active?`Relay activates in ${clock(120-elapsed)}`:owner==='neutral'?'Relay active · neutral':owner==='player'?`You win in ${180-scores.player}s`:`${info(owner).name} wins in ${180-scores[owner]}s`;
  if(view==='paused')title='Paused · holding progress frozen';
  if(view==='result')title=`${info(winner).name} completed the relay`;
  $('hud').innerHTML=`<div class="hud-title"><strong>${title}</strong><span>HOLD 180s TOTAL</span></div><div class="score-grid ${enemies>1?'many':''}">${participants().map(f=>`<div class="score" style="--faction:${f.color}" aria-label="${f.name}: ${scores[f.id]} of 180 holding seconds${owner===f.id?', relay holder':''}"><div class="score-line"><span>${f.name}${owner===f.id&&active&&!['paused','result'].includes(view)?' · +1/s':''}</span><b>${scores[f.id]}<em> /180</em></b></div><div class="track"><div class="fill" style="width:${scores[f.id]/180*100}%"></div></div></div>`).join('')}</div>`;
}
function renderStrip() {
  const c=mapData().cities.find(c=>c.id===selected&&c.owner==='player');
  const inactive=['paused','result'].includes(view);
  if(!c||inactive) { $('city-strip').innerHTML=`<span class="empty">${view==='paused'?'Resume to manage cities':view==='result'?'Round complete':'Tap a city to convert · drag to send troops'}</span>`;return; }
  $('city-strip').innerHTML=Object.entries(roles).map(([key,r])=>`<button class="role-button" data-role="${key}" aria-label="${r.name}${c.role===key?', current role':`, ${r.cost} troops`}" title="${r.name}${c.role===key?' · Current':` · ${r.cost} troops`}" aria-pressed="${c.role===key}" ${c.role!==key&&c.units<=r.cost?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${r.path}"/></svg><small>${c.role===key?'Current':r.cost}</small></button>`).join('')+(c.role==='airfield'?`<button id="fly" class="fly" aria-pressed="${flying}">${flying?'Cancel':'Fly'}</button>`:'');
  document.querySelectorAll('[data-role]').forEach(b=>b.onclick=()=>{const role=b.dataset.role;if(role!==c.role)conversions.set(c.id,{role,units:c.units-roles[role].cost});flying=false;render();$('notice').textContent=`${c.isRelay?'Relay':'City'} is now ${roles[role].name}. Objective identity and scores are unchanged. Mock conversion only.`;});
  if($('fly'))$('fly').onclick=()=>{flying=!flying;render();$('notice').textContent=flying?'Pick any destination. Illustrative targeting only.':'Flight targeting cancelled.';};
}
function renderOverlay() {
  const shown=['paused','result'].includes(view);$('overlay').hidden=!shown;if(!shown)return;
  $('overlay').innerHTML=view==='paused'?`<div class="overlay-card"><h2>Paused</h2><p>${relay?'Relay clock and holding progress are paused.':'The match is paused.'}</p><div class="actions"><button id="resume" class="primary">Resume</button><button id="back-home">Home</button></div></div>`:`<div class="overlay-card"><h2>${winner==='player'?'Victory':'Defeat'}</h2><div class="actions"><button id="replay" class="primary">Play again</button><button id="back-home">Home</button></div></div>`;
  if($('resume'))$('resume').onclick=()=>{view=elapsed<120?'countdown':owner==='neutral'?'neutral':'holding';render();};
  if($('replay'))$('replay').onclick=()=>{preset('countdown');render();};
  $('back-home').onclick=()=>{preset('home');render();};
}
function render() {
  const home=view==='home';$('home').hidden=!home;$('match').hidden=home;$('view').value=view;
  $('capture').disabled=!relay||home||['paused','result'].includes(view);
  $('advance').disabled=$('capture').disabled||elapsed<120||owner==='neutral';
  $('select-relay').disabled=!relay||['paused','result'].includes(view);
  if(home)renderHome();
  else { $('match-time').textContent=clock(elapsed);renderHud();drawMap($('field'),true);renderStrip();renderOverlay(); }
  for(const [key,value] of Object.entries({state:view,layout,enemies,cities:count,relay:relay?'on':'off',factory:factory?'on':'off',slow:slow?'on':'off'}))params.set(key,String(value));
  history.replaceState(null,'',`${location.pathname}?${params}`);
}
$('view').onchange=e=>{const next=e.target.value;if(next!=='home')relay=true;preset(next);render();};
$('capture').onclick=()=>{const ids=['neutral',...participants().map(f=>f.id)];owner=ids[(ids.indexOf(owner)+1)%ids.length];selected=null;conversions.delete(mapData().relayId);render();$('notice').textContent='Simulated capture. Every faction keeps its accumulated holding progress.';};
$('advance').onclick=()=>{const earned=Math.min(15,180-scores[owner]);scores[owner]+=earned;elapsed+=earned;if(scores[owner]===180){winner=owner;view='result';}render();};
$('select-relay').onclick=()=>{if(view==='home'){relay=true;preset('holding');}owner='player';selected=mapData().relayId;render();$('app').scrollIntoView({block:'start'});};
$('pause').onclick=()=>{if(view==='result')return;view=view==='paused'?(elapsed<120?'countdown':owner==='neutral'?'neutral':'holding'):'paused';render();};
$('brand').onclick=e=>{e.preventDefault();preset('home');render();};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){selected=null;flying=false;render();}});
render();
