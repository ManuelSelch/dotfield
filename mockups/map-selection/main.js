const maps = [
  [{x:180,y:40,o:'enemy',n:36},{x:65,y:100,n:8},{x:295,y:100,n:12},{x:115,y:170,n:10},{x:245,y:170,n:10},{x:40,y:240,n:8},{x:180,y:240,n:20},{x:320,y:240,n:8},{x:115,y:310,n:10},{x:245,y:310,n:10},{x:65,y:380,n:12},{x:295,y:380,n:8},{x:180,y:440,o:'player',n:36}],
  [{x:180,y:40,o:'enemy',n:36},...[70,180,290].map((x,i)=>({x,y:110,n:[8,12,8][i]})),...[55,145,235,325].map((x,i)=>({x,y:190,n:[10,12,12,10][i]})),...[70,180,290].map((x,i)=>({x,y:270,n:[12,20,12][i]})),...[55,145,235,325].map((x,i)=>({x,y:350,n:[10,12,12,10][i]})),{x:180,y:440,o:'player',n:36}],
  [{x:70,y:40,o:'enemy',n:36},{x:250,y:90,n:10},{x:80,y:150,n:8},{x:260,y:190,n:12},{x:180,y:240,n:20},{x:100,y:290,n:12},{x:280,y:330,n:8},{x:110,y:390,n:10},{x:290,y:440,o:'player',n:36}],
  [{x:180,y:40,o:'enemy',n:36},...[70,180,290].map((x,i)=>({x,y:95,n:10+i})),...[45,110,180,250,315].map((x,i)=>({x,y:165,n:8+i%3*2})),...[45,110,180,250,315].map((x,i)=>({x,y:235,n:10+i%3*2})),...[70,180,290].map((x,i)=>({x,y:305,n:10+i})),...[70,180,290].map((x,i)=>({x,y:375,n:9+i})),{x:180,y:440,o:'player',n:36}]
];
const colors = {player:'#267c72',enemy:'#bd624e',neutral:'#404b46'};
const mapSvg = document.querySelector('#map');
const dots = [...document.querySelectorAll('.dots i')];
const dotWrap = document.querySelector('.dots');
let selected = 0;
function half(a,b) {
  const mx=(a.x+b.x)/2,my=(a.y+b.y)/2,dx=b.x-a.x,dy=b.y-a.y;
  return {x:dx,y:dy,c:dx*mx+dy*my};
}
function clip(poly,line) {
  const {x,y,c}=line,val=p=>x*p[0]+y*p[1]-c,out=[];
  for(let i=0;i<poly.length;i++) { const a=poly[i],b=poly[(i+1)%poly.length],va=val(a),vb=val(b); if(va<=0)out.push(a); if((va<0&&vb>0)||(va>0&&vb<0)){const t=va/(va-vb);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);} }
  return out;
}
function draw() {
  const data=maps[selected];
  const cells=data.map((city,i)=>{
    const polygon=data.reduce((p,other,j)=>j===i?p:clip(p,half(city,other)),[[0,0],[360,0],[360,480],[0,480]]);
    const fill=city.o==='player'?'#dce9df':city.o==='enemy'?'#f0e1d9':'#edf0e7';
    return `<polygon points="${polygon.map(p=>p.join(',')).join(' ')}" fill="${fill}" stroke="#d2dbce" stroke-width="1"/>`;
  }).join('');
  mapSvg.innerHTML=`${cells}${data.map(c=>`<circle cx="${c.x}" cy="${c.y}" r="15" fill="${colors[c.o||'neutral']}"/><text x="${c.x}" y="${c.y+4}" text-anchor="middle" fill="white" font-size="10" font-family="system-ui">${c.n}</text>`).join('')}`;
  mapSvg.setAttribute('aria-label',`Map ${selected+1} preview`);
  dots.forEach((dot,i)=>dot.classList.toggle('active',i===selected));
  dotWrap.setAttribute('aria-label',`Selected map ${selected+1} of ${maps.length}`);
}
function change(delta) { selected=(selected+delta+maps.length)%maps.length; draw(); }
document.querySelector('.previous').addEventListener('click',()=>change(-1));
document.querySelector('.next').addEventListener('click',()=>change(1));
document.addEventListener('keydown',event=>{
  if(event.key==='ArrowLeft')change(-1);
  if(event.key==='ArrowRight')change(1);
});
draw();
