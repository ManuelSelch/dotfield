const $ = id => document.getElementById(id);
const scenarios = {
  evaluating: { status:'Evaluating…', detail:t=>`Waiting for worker response · ${6+t}s elapsed`, age:8, snapshot:'Evaluation #42 · board snapshot 10s ago' },
  waiting: { status:'Waiting for next evaluation', detail:()=> 'Next check in 0.8s (illustrative)', age:0, frozen:true },
  'no-action': { status:'No action selected', detail:t=>`No action selected for ${18+t}s · ${10+Math.floor(t/2)} evaluations`, age:0, action:'No action selected', outcome:'No command issued', route:'', repeated:true, explanation:'No candidate passed feasibility and priority checks. Example: attacks could not capture their targets in the forecast.' },
  rejected: { status:'Waiting for next evaluation', detail:()=> 'Last selected command could not be applied', age:0, action:'Attack', outcome:'Rejected · command no longer valid', warning:true },
  error: { status:'Worker error', detail:()=> 'No new evaluation result received since the error', age:8, warning:true },
  paused: { status:'Paused', detail:()=> 'AI scheduling paused · result age frozen', age:8, frozen:true },
  finished: { status:'Finished', detail:()=> 'Round ended · no more evaluations expected', age:8, frozen:true },
  eliminated: { status:'Eliminated', detail:()=> 'No remaining cities or troops · no more evaluations expected', age:8, frozen:true },
  first: { status:'Evaluating…', detail:t=>`First evaluation · ${t}s elapsed`, first:true },
};
let started=Date.now();
const params=new URLSearchParams(location.search);
$('scenario').value=scenarios[params.get('state')] ? params.get('state') : 'evaluating';
function render(){
  const key=$('scenario').value,s=scenarios[key],t=Math.floor((Date.now()-started)/1000);
  $('status').textContent=s.status;
  $('detail').textContent=s.detail(t);
  $('status').style.color=s.warning ? '#a34836' : '';
  $('action').textContent=s.first ? 'No completed evaluation yet' : s.action ?? 'Attack';
  $('age').textContent=s.first ? '' : `${s.age+(s.frozen ? 0 : s.repeated ? t%2 : t)}s ago`;
  $('route').textContent=s.first ? '' : s.route ?? 'Enemy 1 · City #8 → You · City #11';
  $('outcome').textContent=s.first ? '' : s.outcome ?? 'Applied · command accepted at that time';
  $('outcome').classList.toggle('warning',!!s.warning);
  $('snapshot').textContent=s.first ? '' : s.repeated ? `Evaluation #${42+Math.floor(t/2)} · no action` : s.snapshot ?? 'Evaluation #42';
  $('explanation').textContent=s.explanation ?? 'Selected attack score: 88.4. Alternatives and blockers from this evaluation remain available here.';
  document.querySelector('details').hidden=!!s.first;
}
$('scenario').addEventListener('change',()=>{started=Date.now();history.replaceState(null,'',`?state=${$('scenario').value}`);render()});
render();setInterval(render,1000);
