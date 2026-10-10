// Isolated deterministic design demonstration, not the game simulation.
const svg = document.querySelector('#field'), hint = document.querySelector('#hint');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const requested = new URLSearchParams(location.search).get('state');
const initialOwner = ['player', 'enemy', 'neutral'].includes(requested) ? requested : 'player';
document.querySelector(`[data-state="${initialOwner}"]`).setAttribute('aria-current', 'page');
const seeds = [
  { id:'north', x:180,y:50,owner:'enemy',count:36 },
  { id:'west', x:65,y:125,owner:'neutral',count:8 },
  { id:'east', x:290,y:125,owner:'enemy',count:12 },
  { id:'near', x:180,y:170,owner:'enemy',count:4 },
  { id:'blocked', x:258,y:215,owner:'enemy',count:12 },
  { id:'artillery', x:180,y:240,owner:initialOwner,count:18 },
  { id:'friendly', x:112,y:270,owner:'player',count:10 },
  { id:'neutral', x:245,y:300,owner:'neutral',count:8 },
  { id:'rear', x:65,y:370,owner:'player',count:12 },
  { id:'flank', x:290,y:375,owner:'neutral',count:8 },
  { id:'south', x:180,y:430,owner:'player',count:36 },
];
let cities, paused=false, clock=0, last=null, flash=null;
const mountain={x:211,y:205,w:20,h:32};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const artillery=()=>cities.find(c=>c.id==='artillery');
function node(tag,attrs,parent,text) { const n=document.createElementNS('http://www.w3.org/2000/svg',tag); for(const [k,v] of Object.entries(attrs)) n.setAttribute(k,v); if(text!==undefined)n.textContent=text; parent.append(n); return n; }
function cell(city) {
  let poly=[{x:0,y:0},{x:360,y:0},{x:360,y:480},{x:0,y:480}];
  for(const other of cities.filter(c=>c!==city)) {
    const dx=other.x-city.x,dy=other.y-city.y,limit=(other.x**2+other.y**2-city.x**2-city.y**2)/2;
    const score=p=>p.x*dx+p.y*dy-limit,next=[];
    for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],sa=score(a),sb=score(b);if(sa<=0)next.push(a);if((sa<=0)!==(sb<=0)){const t=sa/(sa-sb);next.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}poly=next;
  }return poly.map(p=>`${p.x},${p.y}`).join(' ');
}
function blocked(a,b) {
  // Sample the direct shot for this fixed rectangular mock terrain only.
  for(let t=0;t<=1;t+=.01){const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(x>=mountain.x&&x<=mountain.x+mountain.w&&y>=mountain.y&&y<=mountain.y+mountain.h)return true;}return false;
}
function target() { const a=artillery(); if(a.owner==='neutral')return null;return cities.filter(c=>c!==a&&c.owner!=='neutral'&&c.owner!==a.owner&&c.count>0&&distance(a,c)<=90&&!blocked(a,c)).sort((b,c)=>distance(a,b)-distance(a,c)||b.id.localeCompare(c.id))[0]; }
function render() {
  for(const id of ['regions','terrain','coverage','cities','shots'])document.querySelector(`#${id}`).replaceChildren();
  const a=artillery(),t=target();
  for(const c of cities) node('polygon',{points:cell(c),class:`cell ${c.owner}`},document.querySelector('#regions'));
  const terrain=document.querySelector('#terrain');
  node('rect',{x:mountain.x,y:mountain.y,width:mountain.w,height:mountain.h,rx:2,class:'mountain'},terrain);
  node('path',{d:'M214 229l7-17 7 17M218 219l3 3 3-3',class:'mountain-glyph'},terrain);
  node('circle',{cx:a.x,cy:a.y,r:90,class:`range ${a.owner}`},document.querySelector('#coverage'));
  for(const c of cities) {
    const g=node('g',{class:`city ${c.owner}`,transform:`translate(${c.x} ${c.y})`},document.querySelector('#cities'));
    node('title',{},g,`${c.id}: ${c.owner}, ${c.count} troops${c===a?', Artillery range 90':''}`);
    if(c===t)node('circle',{r:19,class:'target-ring'},g);
    node('circle',{r:14,class:'core'},g);node('text',{x:0,y:0},g,c.count);
    if(c===a){const badge=node('g',{transform:'translate(14 -14)'},g);node('circle',{r:5,class:'badge'},badge);node('path',{d:'M-3 1l5-3 1 1-5 3M-3 2h5M-1 2v1M2 2v1',class:'cannon'},badge);}
  }
  hint.textContent=paused?'Preview paused':a.owner==='neutral'?'Neutral Artillery is inactive · capture to activate':t?`Range 90 · nearest hostile garrison · 1 defender every 2s`:'No eligible targets · zero troops does not mean capture';
  document.querySelector('#fire').disabled=paused||!t;
  if(flash){const layer=document.querySelector('#shots'),b=flash.target,d=distance(a,b),dx=(b.x-a.x)/d,dy=(b.y-a.y)/d;
    if(!reducedMotion) node('line',{x1:a.x+dx*14,y1:a.y+dy*14,x2:b.x-dx*14,y2:b.y-dy*14,class:`shot ${a.owner}`},layer);
    node('circle',{cx:b.x,cy:b.y,r:18,class:'impact'},layer);node('text',{x:b.x,y:b.y-25,class:'loss'},layer,'−1');}
}
function fire() { const t=target();if(paused||!t)return;t.count--;flash={target:t,remaining:300};render(); }
function reset(){cities=seeds.map(c=>({...c}));clock=0;flash=null;render();}
document.querySelector('#fire').onclick=()=>{clock=0;fire();};
document.querySelector('#capture').onclick=()=>{const a=artillery();a.owner=a.owner==='player'?'enemy':'player';clock=0;flash=null;render();};
document.querySelector('#reset').onclick=reset;
document.querySelector('#pause').onclick=()=>{paused=!paused;const b=document.querySelector('#pause');b.textContent=paused?'▶':'Ⅱ';b.setAttribute('aria-label',paused?'Resume preview':'Pause preview');render();};
function frame(now){const dt=last===null?0:Math.min(50,now-last);last=now;if(!paused&&!document.hidden){clock+=dt;if(flash){flash.remaining-=dt;if(flash.remaining<=0){flash=null;render();}}if(clock>=2000){clock=0;fire();}}requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
