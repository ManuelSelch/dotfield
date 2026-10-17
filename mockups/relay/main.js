const states = {
  countdown: {you:0,enemy:0,owner:'neutral',units:18,time:'0:38',title:'Relay activates in 22s',hint:'Expand now. Be ready at the western crossing.',note:'<strong>Prepare:</strong> keep expanding, or spend troops to secure the relay before it activates? No points are earned yet.'},
  holding: {you:38,enemy:24,owner:'player',units:27,time:'1:42',title:'You are transmitting',hint:'Hold for 52 more seconds to win.',note:'<strong>Hold or expand:</strong> you lead on points, but the opponent controls the far bank. Reinforce the relay, or strike their production behind the ridge?'},
  urgent: {you:38,enemy:76,owner:'enemy',units:34,time:'2:34',title:'Interrupt within 14s',hint:'Enemy wins at 90. Capturing pauses their score.',note:'<strong>Change strategy:</strong> stop expanding. Stage an attack through the western crossing, or fly troops across the terrain to interrupt the enemy.'}
};
const variants=[['a','Compact scoreboard','A persistent, quiet HUD. Both scores and the immediate objective stay visible without covering the map.'],['b','Mission card','A stronger objective hierarchy. A small gold card explains what to do and why it matters right now.'],['c','Map-first beacon','A progress ring anchors urgency to the relay itself. Scores live in a compact inset at the foot of the map.']];
const params=new URLSearchParams(location.search);
let state=Object.hasOwn(states,params.get('state'))?params.get('state'):'countdown';
let routes=true;
let snapshot=null;
const ns='http://www.w3.org/2000/svg';
function el(tag,attrs,parent){const n=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;}
function scores(s){return `<div class="score-pair">${[['You',s.you,''],['Enemy',s.enemy,'enemy']].map(([name,n,c])=>`<div class="score ${c}"><div class="score-top"><span>${name}${(name==='You'&&s.owner==='player')||(name==='Enemy'&&s.owner==='enemy')?' · +1/s':''}</span><b>${n}<span style="font-weight:400"> / 90</span></b></div><div class="track"><div class="fill" style="width:${n/90*100}%"></div></div></div>`).join('')}</div>`;}
function citiesFor(s){return [
{id:'home-enemy',owner:'enemy',units:42,x:210,y:46},
{id:'upper-west',owner:'enemy',units:23,x:90,y:105},
{id:'upper-east',owner:'enemy',units:19,x:330,y:105},
{id:'bridge-north-west',owner:'enemy',units:31,x:65,y:145},
{id:'bridge-north-east',owner:'enemy',units:16,x:355,y:145},
{id:'relay',owner:s.owner,units:s.units,x:65,y:230},
{id:'bridge-south-east',owner:'neutral',units:10,x:355,y:230},
{id:'mid-west',owner:'player',units:36,x:75,y:325},
{id:'mid-east',owner:'neutral',units:11,x:345,y:325},
{id:'west-pass',owner:'player',units:21,x:75,y:435},
{id:'east-pass',owner:'player',units:18,x:345,y:435},
{id:'south-west',owner:'player',units:28,x:140,y:535},
{id:'south-east',owner:'player',units:46,x:280,y:535},
{id:'home-player',owner:'player',units:32,x:210,y:582}];}
function cell(city,cities){const top=city.y<178?0:216,bottom=city.y<178?178:620;let p=[{x:0,y:top},{x:420,y:top},{x:420,y:bottom},{x:0,y:bottom}];for(const other of cities){if(city===other||(city.y<178)!==(other.y<178))continue;const dx=other.x-city.x,dy=other.y-city.y,limit=(other.x**2+other.y**2-city.x**2-city.y**2)/2;const side=p=>p.x*dx+p.y*dy-limit;const clipped=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],sa=side(a),sb=side(b);if(sa<=0)clipped.push(a);if((sa<=0)!==(sb<=0)){const t=sa/(sa-sb);clipped.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}p=clipped;}return p.map(v=>`${v.x},${v.y}`).join(' ');}
function map(svg,s,id){
 const cities=citiesFor(s);
 for(const c of cities)el('polygon',{class:`region ${c.owner}`,points:cell(c,cities)},svg);
 el('path',{class:'river-water',d:'M0 178 C70 168 120 185 180 178 S300 185 420 175 L420 214 C340 207 290 223 220 215 S80 225 0 216 Z'},svg);
 for(const x of[65,355]){el('rect',{class:'bridge-deck',x:x-22,y:175,width:44,height:42,rx:3},svg);el('path',{class:'bridge-rail',d:`M${x-17} 177v38 M${x+17} 177v38`},svg);}
 el('polygon',{class:'mountain-mass',points:'157,275 177,252 196,268 217,240 237,268 260,250 282,282 271,310 289,337 275,364 291,397 273,421 281,448 259,475 240,490 216,475 195,493 174,473 148,481 137,450 148,425 129,398 143,375 128,347 143,326 133,298'},svg);
 el('polygon',{class:'mountain-shadow',points:'217,240 237,268 260,250 282,282 271,310 289,337 275,364 291,397 273,421 281,448 259,475 240,490 227,430 243,371 219,325'},svg);
 el('path',{class:'mountain-snow',d:'M217 240l-19 28 16-6 11 14 12-8 M260 250l-17 28 15-6 12 15 12-5'},svg);
 el('path',{class:'mountain-ridge',d:'M177 252l17 47-19 36 21 37-20 39 2 59 M237 268l-18 57 24 46-18 38 2 21-11 45 M143 326l17 20-17 29'},svg);
 if(routes){
 const legs=state==='countdown'?[['home-player','south-west'],['south-west','west-pass'],['west-pass','mid-west'],['mid-west','relay']]:state==='holding'?[['mid-west','relay'],['bridge-north-west','relay']]:[['mid-west','relay'],['bridge-north-west','relay']];
 for(const[a,b]of legs){const start=cities.find(c=>c.id===a),end=cities.find(c=>c.id===b);const len=Math.hypot(end.x-start.x,end.y-start.y),ux=(end.x-start.x)/len,uy=(end.y-start.y)/len;el('path',{class:'route-leg',style:start.owner==='enemy'?'stroke:#bd624e':'',d:`M${start.x+ux*21} ${start.y+uy*21}L${end.x-ux*26} ${end.y-uy*26}`},svg);for(let i=1;i<4;i++)el('circle',{class:'troop-dot',style:start.owner==='enemy'?'fill:#bd624e':'',r:2.2,cx:start.x+(end.x-start.x)*i/5,cy:start.y+(end.y-start.y)*i/5},svg);}
 if(state==='urgent'){el('path',{class:'air-route',d:'M280 535 Q390 280 65 230'},svg);const t=el('text',{class:'route-label',x:286,y:360},svg);t.textContent='AIRLIFT';}
 }
 for(const c of cities){const isRelay=c.id==='relay';const g=el('g',{transform:`translate(${c.x} ${c.y})`,...(isRelay?{class:'relay-hit',tabindex:0,role:'button','aria-label':'Relay. Switch between player and enemy control.'}:{})},svg);
 if(isRelay){el('circle',{class:'relay-ring',r:25},g);if(id==='c'&&state!=='countdown'){el('circle',{r:30,fill:'none',stroke:'#e2dcc5','stroke-width':3},g);el('circle',{class:'progress-ring',r:30,stroke:s.owner==='player'?'#267c72':'#bd624e','stroke-dasharray':`${(s.owner==='player'?s.you:s.enemy)/90*188.5} 188.5`},g);}const label=el('text',{class:'relay-label',x:0,y:-40},g);label.textContent='RELAY';el('path',{class:'relay-symbol',d:'M-5-32q5-8 10 0 M-9-35q9-13 18 0 M0-28v-5'},g);g.addEventListener('click',capture);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();capture();}});}
 el('circle',{class:`city-disc ${c.owner}`,r:14},g);const t=el('text',{class:`city-count ${c.owner==='neutral'?'neutral':''}`,y:1},g);t.textContent=c.units;
 if(c.id==='south-east'){el('path',{d:'M-6-23l12 0 M0-28v10 M-4-19l4-3 4 3',fill:'none',stroke:'#267c72','stroke-width':1.7},g);}
 }
}
function capture(){const previous=snapshot||states[state];state=state==='holding'?'urgent':'holding';snapshot={...states[state],you:previous.you,enemy:previous.enemy};render();}
function render(){const s={...(snapshot||states[state])};const remaining=90-(s.owner==='player'?s.you:s.enemy);if(state!=='countdown')s.title=s.owner==='player'?`You win in ${remaining}s`:`Interrupt within ${remaining}s`;params.set('state',state);history.replaceState(null,'',`${location.pathname}?${params}`);document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===state)));document.querySelector('.comparison').innerHTML=variants.map(([id,title,desc])=>{
 let hud=id==='a'?`<div class="status-line"><strong>${s.title}</strong><span>FIRST TO 90</span></div>${scores(s)}`:id==='b'?`<div class="objective-card"><div class="objective-title"><span>◉ Command Relay</span><span>${state==='countdown'?'22s':state==='holding'?`${remaining}s to win`:`${remaining}s to stop`}</span></div><div class="objective-subtitle">${s.title}</div>${scores(s)}</div>`:`<div class="status-line"><strong>${s.title}</strong><span class="big-time">${state==='countdown'?'22s':`${remaining}s`}</span></div>`;
 return `<article><h2 class="option-title"><span class="letter">${id.toUpperCase()}</span>${title}</h2><p class="option-description">${desc}</p><div class="phone ${id==='b'?'card-hud':id==='c'?'map-hud':''} ${state}"><div class="game-header"><span class="brand">dotfield</span><span>${s.time} · Ⅱ</span></div><div class="hud" aria-live="polite">${hud}</div><div class="field"><svg class="map" id="map-${id}" viewBox="0 0 420 620" role="group" aria-label="River with two paired bridges, a central mountain ridge, and the western-bank relay"></svg>${id==='c'?`<div class="map-callout"><div class="status-line"><strong>${s.owner==='neutral'?'Relay offline':s.owner==='player'?'You control the relay':'Enemy controls the relay'}</strong><span>90 TO WIN</span></div>${scores(s)}</div>`:''}</div><div class="city-strip"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V8l6 3V6l6 4V3h4v17ZM8 15v2m5-2v2m4-2v2"/></svg><span>Tap a city to convert · drag to send troops</span></div><div class="interaction"><button data-action="capture">${state==='holding'?'Simulate enemy capture':'Simulate your capture'}</button><button data-action="advance" ${state==='countdown'?'disabled':''}>+10s holding</button></div></div><p class="scenario-note">${s.note}</p></article>`;
 }).join('');for(const[id]of variants)map(document.querySelector(`#map-${id}`),s,id);document.querySelectorAll('[data-action="capture"]').forEach(b=>b.addEventListener('click',capture));document.querySelectorAll('[data-action="advance"]').forEach(b=>b.addEventListener('click',()=>{const key=s.owner==='player'?'you':'enemy';snapshot={...s,[key]:Math.min(89,s[key]+10)};render();}));}
document.querySelectorAll('[data-state]').forEach(b=>b.addEventListener('click',()=>{state=b.dataset.state;snapshot=null;render();}));document.querySelector('#routes-toggle').addEventListener('change',e=>{routes=e.target.checked;render();});render();
