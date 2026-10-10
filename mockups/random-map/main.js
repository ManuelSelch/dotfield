const $ = id => document.getElementById(id);
const settings = { cities: 12, enemies: 2, industry: 'on', river: 'on' };
const colors = ['#267c72', '#bd624e', '#a28b46', '#727bad', '#947188'];
let seed = 107, match;
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function makeMap() {
  const random = rng(++seed);
  const resolve = value => value === 'random' ? random() > .5 : value === 'on';
  const river = resolve(settings.river), industry = resolve(settings.industry);
  const cities = [], count = settings.cities;
  // Jittered rows are illustrative, not a production balance algorithm.
  const rows = Math.ceil(count / 3), columns = Math.ceil(count / rows);
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / columns), col = i % columns;
    let y = 42 + row * (396 / Math.max(1, rows - 1)) + (random() - .5) * 17;
    if (river && Math.abs(y - 240) < 43) y = y < 240 ? 195 : 285;
    cities.push({ x: 52 + col * (256 / Math.max(1, columns - 1)) + (random() - .5) * 28, y, faction: -1, factory: false });
  }
  const targets = [[.15,.88],[.85,.12],[.12,.12],[.88,.88],[.5,.5]];
  for (let f = 0; f <= settings.enemies; f++) {
    const [tx,ty] = targets[f];
    const chosen = cities.filter(c => c.faction < 0).sort((a,b) => Math.hypot(a.x-360*tx,a.y-480*ty)-Math.hypot(b.x-360*tx,b.y-480*ty))[0];
    chosen.faction = f;
  }
  if (industry) {
    const neutral = cities.filter(c => c.faction < 0);
    const n = Math.min(neutral.length, Math.max(1, Math.round(count / 6)));
    for (let i=0;i<n;i++) neutral.splice(Math.floor(random()*neutral.length),1)[0].factory = true;
  }
  const bridges = [];
  if (river) {
    const north = cities.filter(c => c.y < 240).sort((a,b)=>b.y-a.y).slice(0,columns).sort((a,b)=>a.x-b.x);
    const south = cities.filter(c => c.y > 240).sort((a,b)=>a.y-b.y).slice(0,columns).sort((a,b)=>a.x-b.x);
    for (const index of [0, Math.min(north.length,south.length)-1]) {
      if (index >= 0 && !bridges.some(b=>b.a===north[index])) bridges.push({a:north[index],b:south[index]});
    }
  }
  return { cities, river, industry, bridges, enemies: settings.enemies, seed };
}
function clip(poly, nx, ny, limit) {
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],da=a[0]*nx+a[1]*ny-limit,db=b[0]*nx+b[1]*ny-limit;
    if(da<=0)out.push(a);
    if((da<=0)!==(db<=0)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  return out;
}
function draw(map, target) {
  let html='<rect width="360" height="480" fill="#eef1e9"/>';
  for(const c of map.cities){
    const minY=map.river && c.y>240?254:0,maxY=map.river && c.y<240?226:480;
    let polygon=[[0,minY],[360,minY],[360,maxY],[0,maxY]];
    for(const other of map.cities){
      if(other===c || map.river && (other.y<240)!==(c.y<240))continue;
      const nx=other.x-c.x,ny=other.y-c.y;
      polygon=clip(polygon,nx,ny,(other.x**2+other.y**2-c.x**2-c.y**2)/2);
    }
    const fill=c.faction<0?'#e5eade':colors[c.faction];
    html+=`<polygon points="${polygon.map(p=>p.join(',')).join(' ')}" fill="${fill}" fill-opacity="${c.faction<0?1:.13}" stroke="#d0d9ca" stroke-width="1.2"/>`;
  }
  if(map.river){
    html+='<rect y="226" width="360" height="28" fill="#aec8cb"/>';
    for(const b of map.bridges){const x=(b.a.x+b.b.x)/2;html+=`<rect x="${x-17}" y="222" width="34" height="36" rx="3" fill="#ddd8bf" stroke="#87988a" stroke-width="1.5"/><path d="M${x-12} 224v32 M${x+12} 224v32" stroke="#9aa38d"/>`;}
  }
  for(const c of map.cities){
    const color=c.faction<0?'#9aa78e':colors[c.faction];
    html+=`<circle cx="${c.x}" cy="${c.y}" r="17" fill="${color}"/><text x="${c.x}" y="${c.y+4}" text-anchor="middle" fill="white" font-family="system-ui" font-size="11" font-weight="600">${c.faction<0?c.factory?14:8:36}</text>`;
    if(c.factory)html+=`<path d="M${c.x-7} ${c.y-24}v-8l5 3v-3l5 3v-7h3v12z" fill="#68785e"/>`;
  }
  target.innerHTML=html;
}
function description(map){return `${map.cities.length} cities · ${map.enemies} enemies · ${map.industry?'Industry':'No industry'} · ${map.river?map.bridges.length+' bridges':'No river'}`;}
function preview(){const map=makeMap();draw(map,$('map'));$('summary').innerHTML=description(map).split(' · ').map(text=>`<span>${text}</span>`).join('');}
function refresh(){
  $('cities').value=settings.cities;$('city-value').value=settings.cities;
  $('cities-down').disabled=settings.cities<=6;$('cities-up').disabled=settings.cities>=24;
  $('starting-note').textContent=`You + ${settings.enemies} ${settings.enemies===1?'enemy':'enemies'} · ${settings.cities-settings.enemies-1} neutral cities`;
  preview();
}
$('cities').addEventListener('input',e=>{settings.cities=Number(e.target.value);refresh();});
for(const [id,delta] of [['cities-down',-1],['cities-up',1]])$(id).onclick=()=>{settings.cities=Math.min(24,Math.max(6,settings.cities+delta));refresh();};
for(const key of ['enemies','industry','river'])$(key).addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  settings[key]=key==='enemies'?Number(button.dataset.value):button.dataset.value;
  for(const b of $(key).querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===button));
  refresh();
});
$('reroll').onclick=preview;
$('toggle-preview').onclick=()=>{const hide=!$('preview-content').hidden;$('preview-content').hidden=hide;$('toggle-preview').textContent=hide?'Show preview':'Hide preview';$('toggle-preview').setAttribute('aria-expanded',String(!hide));};
function newMatch(){match=makeMap();draw(match,$('match-map'));$('match-summary').textContent=description(match);$('match-status').textContent='';}
$('play').onclick=()=>{newMatch();$('setup').hidden=true;$('match').hidden=false;$('restart').focus();window.scrollTo(0,0);};
$('new-map').onclick=newMatch;
$('restart').onclick=()=>{draw(match,$('match-map'));$('match-status').textContent='Same layout. Back to the starting positions.';};
$('back').onclick=()=>{$('match').hidden=true;$('setup').hidden=false;$('play').focus();};
refresh();
