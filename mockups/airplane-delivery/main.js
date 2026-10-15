const canvases = [...document.querySelectorAll('canvas')];
const ctxs = canvases.map(c => { const ctx = c.getContext('2d'); ctx.scale(2,2); return ctx; });
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let paused = reduced, rate = 1, friendly = false, clocks = [0,0,0], last = performance.now();
const home = {x:53,y:190}, city = {x:278,y:114};
const teal = '#267c72', enemy = '#bd624e';
const lerp = (a,b,t) => a+(b-a)*t;
const clamp = t => Math.max(0,Math.min(1,t));
const ease = t => t*t*(3-2*t);
function position(i,u){
  if(i===0)return {x:228,y:139,angle:-.3};
  if(i===2)return {x:253,y:114,angle:0};
  const a=Math.PI+u*Math.PI*2/2;
  return {x:city.x+44*Math.cos(a),y:city.y+44*Math.sin(a),angle:a+Math.PI/2};
}
function plane(ctx,p,cargo){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle=teal;ctx.strokeStyle='#fcfcf8';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-9,-4);ctx.lineTo(-5,0);ctx.lineTo(-9,4);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(-5,-12);ctx.lineTo(-8,-12);ctx.lineTo(-5,0);ctx.lineTo(-8,12);ctx.lineTo(-5,12);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillStyle=teal;ctx.fillText(cargo ? String(cargo) : 'empty',p.x,p.y-19);}
function text(ctx,s,x,y,color='#738078',size=10){ctx.fillStyle=color;ctx.font=`${size}px system-ui`;ctx.textAlign='center';ctx.fillText(s,x,y);}
function town(ctx,p,count,color){ctx.beginPath();ctx.arc(p.x,p.y,14,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();text(ctx,String(count),p.x,p.y+4,'#fff',11);}
function draw(ctx,i,t){
 ctx.clearRect(0,0,360,270);ctx.fillStyle='#eef1e7';ctx.fillRect(0,0,360,270);
 // Quiet territory boundaries, with geography shared by every option.
 ctx.strokeStyle='#dce3d5';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,105);ctx.lineTo(110,123);ctx.lineTo(180,60);ctx.lineTo(360,52);ctx.moveTo(110,123);ctx.lineTo(125,270);ctx.moveTo(180,60);ctx.lineTo(230,0);ctx.stroke();
 ctx.fillStyle='#c8dade';ctx.beginPath();ctx.moveTo(141,0);ctx.bezierCurveTo(165,100,131,190,151,270);ctx.lineTo(169,270);ctx.bezierCurveTo(149,190,183,100,159,0);ctx.closePath();ctx.fill();
 ctx.fillStyle='#c1c6b8';ctx.beginPath();ctx.moveTo(167,232);ctx.lineTo(192,162);ctx.lineTo(218,232);ctx.closePath();ctx.fill();ctx.fillStyle='#d4d7ca';ctx.beginPath();ctx.moveTo(192,162);ctx.lineTo(191,232);ctx.lineTo(218,232);ctx.closePath();ctx.fill();
 const resolved=Array.from({length:20},(_,j)=>2+j*.2+.32).filter(at=>t>=at).length;
 const released=Math.max(0,Math.min(20,Math.floor((t-2)/.2)+1));
 const blocked=friendly?0:Math.min(3,resolved);
 const targetCount=friendly?20+resolved*5:resolved<=3?20:resolved<=7?20-(resolved-3)*5:(resolved-7)*5;
 const captured=!friendly&&resolved>7;
 const color=friendly||captured?teal:enemy;
 town(ctx,home,0,teal);text(ctx,'AIRFIELD',home.x,home.y+32);text(ctx,'HOME',home.x,home.y+45,'#8a948a',8);
 town(ctx,city,targetCount,color);text(ctx,friendly?'REINFORCEMENT':captured?'CAPTURED':'TARGET',city.x,city.y+31);
 const shields=friendly?0:3-blocked;
 for(let s=0;s<shields;s++){ctx.strokeStyle=enemy;ctx.lineWidth=2;ctx.beginPath();ctx.arc(city.x,city.y,20+s*4,-2.5,-.7);ctx.stroke();}
 const start=position(i,0),end=position(i,4.35);
 ctx.save();ctx.setLineDash([3,5]);ctx.strokeStyle='#267c7228';ctx.beginPath();ctx.moveTo(home.x,home.y);ctx.lineTo(start.x,start.y);ctx.stroke();ctx.restore();
 let p;
 if(t<2){const k=ease(clamp(t/2));p={x:lerp(home.x,start.x,k),y:lerp(home.y,start.y,k),angle:Math.atan2(start.y-home.y,start.x-home.x)};}
 else if(t<6.5)p=position(i,Math.min(4.35,t-2));
 else {const k=ease(clamp((t-6.5)/2));p={x:lerp(end.x,home.x,k),y:lerp(end.y,home.y,k),angle:Math.atan2(home.y-end.y,home.x-end.x)};}
 // Each visible group represents exactly one five-troop combat batch.
 for(let j=0;j<20;j++){
  const age=t-(2+j*.2),origin=position(i,j*.2);
  if(age>=0&&age<.32&&i!==2){const k=age/.32;for(let d=0;d<5;d++){const spread=(d-2)*3*Math.sin(k*Math.PI);ctx.fillStyle=teal;ctx.beginPath();ctx.arc(lerp(origin.x,city.x,k),lerp(origin.y,city.y,k)+spread,2.2,0,Math.PI*2);ctx.fill();}}
  const impact=age-.32;
  if(impact>=0&&impact<.19){const shielded=!friendly&&j<3;ctx.globalAlpha=1-impact/.19;ctx.strokeStyle=shielded?enemy:teal;ctx.lineWidth=2;ctx.beginPath();ctx.arc(city.x,city.y,17+impact*48,0,Math.PI*2);ctx.stroke();text(ctx,shielded?'BLOCKED':'+5',city.x,city.y-33,shielded?enemy:teal,10);ctx.globalAlpha=1;}
 }
 if(t<8.5)plane(ctx,p,t<2?100:100-released*5);
 else {ctx.strokeStyle=teal;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(home.x-5,home.y-25);ctx.lineTo(home.x-1,home.y-21);ctx.lineTo(home.x+6,home.y-29);ctx.stroke();}
 const phase=t<2?'Crossing river & mountain':t<6.5?`Unloading · ${100-released*5} aboard`:t<8.5?'Returning empty':'Home · ready for next trip';
 text(ctx,phase,180,250,teal,11);
 ctx.fillStyle='#dce4d7';ctx.fillRect(20,264,320,2);ctx.fillStyle=teal;ctx.fillRect(20,264,320*clamp(t/8.5),2);
}
const pauseButton=document.querySelector('#pause');
function syncPause(){pauseButton.textContent=paused?'Play':'Pause';pauseButton.setAttribute('aria-pressed',String(paused));}
syncPause();
if(reduced)clocks=[3,3,3];
pauseButton.onclick=()=>{paused=!paused;syncPause();};
document.querySelector('#replay').onclick=()=>{clocks=[0,0,0];paused=false;syncPause();};
document.querySelectorAll('.replay').forEach((b,i)=>b.onclick=()=>{clocks[i]=0;paused=false;syncPause();});
document.querySelector('#speed').onchange=e=>rate=Number(e.target.value);
document.querySelector('#target').onchange=e=>{friendly=e.target.value==='friendly';clocks=[0,0,0];};
function frame(now){const dt=Math.min((now-last)/1000,.1);last=now;if(!paused)clocks=clocks.map(t=>Math.min(9,t+dt*rate));ctxs.forEach((ctx,i)=>draw(ctx,i,clocks[i]));document.querySelector('#phase').textContent=paused?'Paused':clocks.every(t=>t>=8.5)?'Trip complete · replay to compare':'Playing';requestAnimationFrame(frame);}
requestAnimationFrame(frame);
