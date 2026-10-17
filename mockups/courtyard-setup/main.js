import { layouts } from '../relay/layouts.js';
import { withCityCount } from '../relay/density.js';
const $ = id => document.getElementById(id);
let layout = 'courtyard';
let regular = { cities: 14, enemies: 2 };
let settings = { cities: 24, enemies: 1 };
const layoutNames = { open: 'Open field', river: 'River', mountains: 'Mountains', courtyard: 'Courtyard' };
const layoutDescriptions = {
 open: 'Open terrain · no river or mountains',
 river: 'A river with two paired bridge crossings · no mountains',
 mountains: 'A central ridge with flanking routes · no river',
 courtyard: 'Two courtyard entrances · flanking valleys · two river crossings',
};
function svg(tag, attrs, parent = $('map')) { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key,value] of Object.entries(attrs)) node.setAttribute(key,value);parent.append(node);return node; }
function cell(city, cities, river) {
 let poly = [{x:0,y:city.y<river[0]?0:river[1]},{x:420,y:city.y<river[0]?0:river[1]},{x:420,y:city.y<river[0]?river[0]:620},{x:0,y:city.y<river[0]?river[0]:620}];
 for (const other of cities) {
  if (city === other || (city.y<river[0]) !== (other.y<river[0])) continue;
  const dx=other.x-city.x,dy=other.y-city.y,limit=(other.x**2+other.y**2-city.x**2-city.y**2)/2;
  const side=p=>p.x*dx+p.y*dy-limit,out=[];
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],sa=side(a),sb=side(b);if(sa<=0)out.push(a);if((sa<=0)!==(sb<=0)){const t=sa/(sa-sb);out.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}}poly=out;
 }return poly.map(p=>`${p.x},${p.y}`).join(' ');
}
function draw(){
 const map=withCityCount(layouts[1],settings.cities),cities=map.cities.map(c=>({...c,owner:c.id==='home-player'?'player':c.id==='home-enemy'?'enemy':'neutral'}));
 $('map').replaceChildren();
 for(const c of cities)svg('polygon',{class:`region ${c.owner}`,points:cell(c,cities,map.river)});
 svg('rect',{class:'river-water',x:0,y:386,width:420,height:28});
 for(const x of map.bridges){svg('rect',{class:'bridge-deck',x:x-22,y:382,width:44,height:36,rx:3});svg('path',{class:'bridge-rail',d:`M${x-17} 384v32 M${x+17} 384v32`});}
 for(const [x,y,right,bottom] of map.mountains){const g=svg('g',{transform:`translate(${x} ${y}) scale(${(right-x)/100} ${(bottom-y)/100})`});svg('polygon',{class:'mountain-mass',points:'0,20 15,5 30,15 45,0 60,15 80,5 100,20 90,40 100,60 90,80 100,95 75,100 50,90 25,100 0,90 10,65 0,40'},g);svg('path',{class:'mountain-shadow',d:'M45 0L60 15 80 5 100 20 90 40 100 60 90 80 100 95 75 100 65 70 50 45 60 25Z'},g);svg('path',{class:'mountain-ridge',d:'M30 15l10 25-15 20 20 30 M60 15l-10 30 15 25-15 20'},g);}
 for(const c of cities){const g=svg('g',{transform:`translate(${c.x} ${c.y})`});svg('circle',{class:`city-disc ${c.owner}`,r:14},g);const t=svg('text',{class:`city-count ${c.owner==='neutral'?'neutral':''}`,y:1},g);t.textContent=c.owner==='neutral'?(c.factory?14:c.id==='relay'?18:10):36;if(c.factory&&$('factory').getAttribute('aria-pressed')==='true')svg('path',{class:'factory-mark',d:'M-8-22v-10l6 3v-5l7 4v-8h4v16z'},g);}
}
function refresh(){
 const courtyard=layout==='courtyard',min=courtyard?20:6;
 document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===layout)));
 $('cities').min=min;$('cities').value=settings.cities;$('count').textContent=settings.cities;$('minimum').textContent=`${min} · compact`;$('less').disabled=settings.cities<=min;$('more').disabled=settings.cities>=30;
 document.querySelectorAll('[data-enemies]').forEach(b=>{b.disabled=courtyard&&b.dataset.enemies!=='1';b.setAttribute('aria-pressed',String(Number(b.dataset.enemies)===settings.enemies));});
 $('layout-note').textContent=layoutDescriptions[layout];
 $('constraints').textContent=courtyard?'Courtyard requires 20–30 cities and one enemy. Its mountains and river crossings are included.':'This layout supports 6–30 cities and 1–4 enemies.';
 $('preview-count').textContent=`${settings.cities} cities · ${settings.enemies} ${settings.enemies===1?'enemy':'enemies'}`;
 $('standard-placeholder').hidden=courtyard;
 $('standard-placeholder').textContent=`${layoutNames[layout]}\n${layoutDescriptions[layout]}\nExisting generator · preview omitted in this controls study`;
 $('map').setAttribute('aria-label',courtyard?'Courtyard with multiple mountains and two river crossings':`${layoutNames[layout]} preview placeholder`);
 if(courtyard)draw();
}
document.querySelectorAll('[data-layout]').forEach(b=>b.addEventListener('click',()=>{if(layout===b.dataset.layout)return;const wasCourtyard=layout==='courtyard';if(!wasCourtyard)regular={...settings};layout=b.dataset.layout;if(layout==='courtyard')settings={cities:Math.max(20,settings.cities),enemies:1};else if(wasCourtyard)settings={...regular};refresh();}));
$('cities').addEventListener('input',e=>{settings.cities=Number(e.target.value);refresh();});
for(const[id,delta]of[['less',-1],['more',1]])$(id).onclick=()=>{settings.cities=Math.max(layout==='courtyard'?20:6,Math.min(30,settings.cities+delta));refresh();};
document.querySelectorAll('[data-enemies]').forEach(b=>b.onclick=()=>{settings.enemies=Number(b.dataset.enemies);refresh();});
for(const key of ['factory','slow'])$(key).onclick=()=>{$(key).setAttribute('aria-pressed',String($(key).getAttribute('aria-pressed')!=='true'));refresh();};
$('reroll').onclick=()=>{$('demo-status').textContent='Preview composition is fixed in this controls mockup. Production will use seeded variation.';};
$('play').onclick=()=>{$('demo-status').textContent=`Would start ${layoutNames[layout]} with ${settings.cities} cities. Gameplay is not implemented in this mockup.`;};
refresh();
