const regions=document.querySelector('#regions'),cities=document.querySelector('#cities');
const points={capital:[64,114],a:[137,87],b:[206,119],frontL:[105,180],frontC:[178,176],frontR:[249,178],island:[309,132],enemyL:[59,303],enemyC:[173,313],enemyR:[302,305],neutral:[301,83]};
const edges=[['capital','a'],['a','b'],['capital','frontL'],['a','frontL'],['a','frontC'],['b','frontC'],['b','frontR'],['frontL','frontC'],['frontC','frontR'],['frontR','island'],['enemyL','frontL'],['enemyC','frontC'],['enemyR','frontR'],['neutral','island']];
const baseOwned=new Set(['capital','a','b','frontL','frontC','frontR','island']);
const enemy=new Set(['enemyL','enemyC','enemyR']);
const labels={capital:'HOME',a:'NORTH',b:'EAST',frontL:'WEST',frontC:'GATE',frontR:'EAST',island:'OUTPOST',enemyL:'RED',enemyC:'RED',enemyR:'RED',neutral:'NEUTRAL'};
const ns='http://www.w3.org/2000/svg';
function node(tag,attrs={},text=''){const el=document.createElementNS(ns,tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text)el.textContent=text;return el}
function draw(){regions.replaceChildren();cities.replaceChildren();
 const owned=new Set(baseOwned), queue=['capital'];while(queue.length){const id=queue.shift();for(const [a,b]of edges){const other=a===id?b:b===id?a:null;if(other&&!owned.has(other)&&baseOwned.has(other)){owned.add(other);queue.push(other)}}}
 const count=owned.size, shields=count>=7?3:count>=4?2:count>=2?1:0;
 document.querySelector('#tier').textContent=shields?`Tier ${shields} · ${shields} shields max`:'No network shields';
 document.querySelector('#count').textContent='1 shield recharges every 10 seconds';
 // Abstract territory polygons; the stronger perimeter is drawn once around the union.
 const cells={capital:'42,89 95,88 112,122 88,151 40,140',a:'96,70 156,66 165,104 131,126 94,104',b:'157,76 221,89 226,128 190,145 164,108',frontL:'68,145 110,128 139,153 129,198 75,207 47,177',frontC:'133,129 190,145 212,176 190,211 133,204 126,164',frontR:'194,137 243,145 271,178 250,211 195,211 213,175',island:'259,105 319,100 331,145 282,163 253,143'};
 for(const [id,poly]of Object.entries(cells))regions.append(node('polygon',{points:poly,class:`region ${owned.has(id)?'player':'neutral'}`}));
 for(const [id,[x,y]]of Object.entries(points)){const isOwned=owned.has(id),isEnemy=enemy.has(id),cls=isOwned?'player':isEnemy?'enemy':'neutral';const g=node('g');g.append(node('circle',{cx:x,cy:y,r:id==='capital'?15:13,class:`city ${cls}`}));g.append(node('text',{x,y:y+1,class:'city-count'},id==='capital'?'36':isOwned?'18':isEnemy?'30':'8'));g.append(node('text',{x,y:y+25,class:'label'},labels[id]));if(id==='capital')g.append(node('circle',{cx:x,cy:y,r:4,class:'city-capital'}));
   if(isOwned&&shields){const sx=x+9, sy=y-12, scale=.62;g.append(node('path',{d:'M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3',transform:`translate(${sx},${sy}) scale(${scale})`,class:'tier-shield'}));g.append(node('text',{x:sx+12*scale,y:sy+15*scale,class:'tier-number'},String(shields)));}
   cities.append(g);
 }
}
draw();
