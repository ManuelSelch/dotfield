const $ = selector => document.querySelector(selector);
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let serial = 0;
const node = (type, properties = {}) => ({ id: `block-${++serial}`, type, ...properties });
const group = (type, children = [], properties = {}) => node(type, { children, ...properties });
const kinds = {
  selector: ['control', 'Try in order', 'First successful branch wins'],
  sequence: ['control', 'Do in order', 'All steps must succeed'],
  retry: ['control', 'Retry', 'Try again after a failed attempt'],
  target: ['select', 'Select city', 'Choose a target, without sending troops'],
  sources: ['select', 'Select sources', 'Find eligible friendly cities'],
  clear: ['select', 'Clear set', 'Start a fresh chosen-source set'],
  next: ['select', 'Next city', 'Advance through the candidate list'],
  add: ['select', 'Add to set', 'Keep a city once, in chosen order'],
  plan: ['plan', 'Plan capture', 'Forecast exactly the chosen sources'],
  execute: ['execute', 'Execute plan', 'Send accepted waves, then wait for capture'],
  call: ['call', 'Call tactic', 'Run shared steps with an argument'],
};
function initial() {
  serial = 0;
  return {
    main: { id: 'main', name: 'Main', root: group('selector', [node('call', { tactic: 'capture', kind: 'neutral' }), node('call', { tactic: 'capture', kind: 'enemy' })]) },
    capture: { id: 'capture', name: 'Capture', parameter: 'kind', root: group('sequence', [
      node('target', { query: '$kind' }), node('sources', { minimum: 6 }), node('clear'),
      group('retry', [node('next'), node('add'), node('plan', { seconds: 15 })], { attempts: 4 }), node('execute'),
    ], { cleanup: true }) },
  };
}
let definitions = initial();
const query = new URLSearchParams(location.search);
if (query.get('state') === 'empty') definitions.main.root.children = [];
if (query.get('state') === 'error') definitions.main.root.children[1].tactic = 'missing';
let active = query.get('script') === 'capture' ? 'capture' : 'main';
let selected = definitions[active].root.id, dirty = false, codeView = false;
let toastTimer;
const walk = (root, fn, parent = null) => { fn(root, parent); root.children?.forEach(child => walk(child, fn, root)); };
function find(id) { let found; for (const definition of Object.values(definitions)) walk(definition.root, (n, parent) => { if (n.id === id) found = { n, parent }; }); return found; }
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200); }
function markDirty() { dirty = true; $('#save-status').textContent = 'Unsaved changes'; }
function switchScript(id) { active = id; selected = definitions[id].root.id; render(); }
const slot = name => `<span class="slot">${esc(name)}</span>`;
const number = (n, key, value, min, max, label) => `<input type="number" data-field="${key}" data-id="${n.id}" value="${value}" min="${min}" max="${max}" aria-label="${label}">`;
function selectField(n, key, value, options, label) { return `<select data-field="${key}" data-id="${n.id}" aria-label="${label}">${options.map(([id, title]) => `<option value="${esc(id)}" ${id === value ? 'selected' : ''}>${esc(title)}</option>`).join('')}</select>`; }
function header(n) {
  const title = `<span class="block-title">${kinds[n.type][1]}</span>`;
  switch (n.type) {
    case 'selector': return `${title}<span class="branch-caption">first that works</span>`;
    case 'sequence': return title;
    case 'retry': return `${title}${number(n, 'attempts', n.attempts, 1, 16, 'Maximum planning attempts')}<span>attempts</span>`;
    case 'target': return `${title}${selectField(n, 'query', n.query, [...(definitions[active].parameter ? [['$kind', 'argument: kind']] : []), ['neutral', 'neutral'], ['enemy', 'enemy']], 'Target ownership')}<span>nearest reachable</span><span class="soft-arrow">→</span>${slot('target')}`;
    case 'sources': return `${title}<span>for</span>${slot('target')}<span>min.</span>${number(n, 'minimum', n.minimum, 1, 100, 'Minimum dispatchable army')}<span class="soft-arrow">→</span>${slot('candidates')}`;
    case 'clear': return `${title}${slot('chosen')}`;
    case 'next': return `${title}<span>from</span>${slot('candidates')}<span class="soft-arrow">→</span>${slot('source')}`;
    case 'add': return `${title}${slot('source')}<span>to</span>${slot('chosen')}`;
    case 'plan': return `${title}<span>with</span>${slot('chosen')}<span>within</span>${number(n, 'seconds', n.seconds, 1, 60, 'Capture horizon in seconds')}<span>s</span><span class="soft-arrow">→</span>${slot('plan')}`;
    case 'execute': return `${title}${slot('plan')}`;
    case 'call': {
      const tactic = definitions[n.tactic];
      return `<span class="call-mark">↗</span><span class="block-title">${esc(tactic?.name ?? 'Missing tactic')}</span>${tactic?.parameter ? selectField(n, 'kind', n.kind ?? 'enemy', [['neutral', 'neutral cities'], ['enemy', 'enemy cities']], 'Tactic target kind') : ''}${tactic ? `<button class="open-tactic" data-open="${n.tactic}">Open tactic ↗</button>` : ''}`;
    }
  }
}
function renderNode(n) {
  const [category, , description] = kinds[n.type];
  return `<div class="node ${category} ${selected === n.id ? 'selected' : ''}" data-node="${n.id}" role="group" tabindex="0" draggable="true" aria-label="${esc(kinds[n.type][1])}"><div class="node-header"><span class="grip" aria-hidden="true">⠿</span>${header(n)}</div>${n.children ? `<div class="children" data-drop="${n.id}">${n.children.length ? n.children.map(renderNode).join('') : '<div class="empty-drop">＋ Add or drop a block here</div>'}</div>${n.cleanup ? '<div class="container-foot">On exit · release plan memory. Issued troops continue.</div>' : ''}` : n.type === 'call' ? `<div class="node-description">${esc(description)}${definitions[n.tactic]?.parameter ? ' · one shared definition' : ''}</div>` : ''}</div>`;
}
function paletteButton(type, label, tactic) {
  const category = kinds[type][0];
  return `<button class="palette-block ${category}" draggable="true" data-prototype="${type}" ${tactic ? `data-tactic="${tactic}"` : ''}><span>${type === 'call' ? '↗' : '⋮'}</span><span>${esc(label)}</span><span class="palette-plus" aria-hidden="true">＋</span></button>`;
}
function renderPalette() {
  $('#palette').innerHTML = `<div class="palette-group"><h3>Flow</h3>${['selector', 'sequence', 'retry'].map(t => paletteButton(t, kinds[t][1])).join('')}</div><div class="palette-group"><h3>Cities & memory</h3>${['target', 'sources', 'clear', 'next', 'add'].map(t => paletteButton(t, kinds[t][1])).join('')}</div><div class="palette-group"><h3>Plans</h3>${['plan', 'execute'].map(t => paletteButton(t, kinds[t][1])).join('')}</div><div class="palette-group"><h3>Your tactics</h3>${Object.values(definitions).filter(d => d.id !== 'main').map(d => paletteButton('call', d.name, d.id)).join('')}</div>`;
}
function issues() {
  const errors = [];
  function check(id, path = []) {
    if (path.includes(id)) { errors.push('A tactic cannot call itself, even indirectly.'); return; }
    const definition = definitions[id];
    if (!definition) { errors.push('A call points to a missing tactic.'); return; }
    walk(definition.root, n => {
      if (n.children && !n.children.length) errors.push(`${definition.name}: add a block to the empty group.`);
      if (n.type === 'call') check(n.tactic, [...path, id]);
    });
  }
  Object.keys(definitions).forEach(id => check(id));
  return [...new Set(errors)];
}
function mdsl() {
  const emit = (n, depth, context, path) => {
    const pad = '    '.repeat(depth), s = name => JSON.stringify(`${context.prefix}_${name}`);
    const action = (method, args) => `${pad}action [${method}, ${args.join(', ')}]`;
    if (n.type === 'call') {
      if (!definitions[n.tactic] || path.includes(n.tactic)) return `${pad}// Invalid tactic reference`;
      return `${pad}// ${definitions[n.tactic].name}(${n.kind ?? ''})\n${emit(definitions[n.tactic].root, depth, { kind: n.kind, prefix: n.id.replaceAll('-', '_') }, [...path, n.tactic])}`;
    }
    if (n.children) {
      const open = n.type === 'retry' ? `retry [${n.attempts}]` : n.type + (n.cleanup ? ` exit(ReleasePlan, ${s('plan')})` : '');
      const inner = n.children.map(c => emit(c, depth + (n.type === 'retry' ? 2 : 1), context, path)).join('\n');
      return `${pad}${open} {\n${n.type === 'retry' ? `${pad}    sequence {\n${inner}\n${pad}    }` : inner}\n${pad}}`;
    }
    switch (n.type) {
      case 'target': return action('SelectCity', [JSON.stringify(n.query === '$kind' ? context.kind ?? 'enemy' : n.query), '"nearest-reachable"', s('target')]);
      case 'sources': return action('SelectSources', [s('target'), n.minimum, s('candidates')]);
      case 'clear': return action('ClearSet', [s('chosen')]);
      case 'next': return action('NextCity', [s('candidates'), s('source')]);
      case 'add': return action('AddToSet', [s('chosen'), s('source')]);
      case 'plan': return action('PlanCapture', [s('target'), s('chosen'), n.seconds * 1000, s('plan')]);
      case 'execute': return action('ExecutePlan', [s('plan')]);
    }
  };
  const definition = definitions[active];
  return `root {\n${emit(definition.root, 1, { kind: active === 'capture' ? 'enemy' : undefined, prefix: active }, [active])}\n}`;
}
function render() {
  const definition = definitions[active];
  $('#scripts').innerHTML = Object.values(definitions).map(d => `<button class="script-tab ${d.id === active ? 'active' : ''} ${d.id !== 'main' ? 'call-tab' : ''}" data-script="${d.id}" aria-pressed="${d.id === active}"><span class="tab-icon">${d.id === 'main' ? '◉' : '↗'}</span>${esc(d.name)}</button>`).join('');
  $('#script-name').textContent = definition.name;
  $('#script-description').textContent = active === 'main' ? 'The entry point for this enemy.' : 'Shared steps, defined once.';
  $('#parameters').hidden = !definition.parameter;
  $('#parameters').innerHTML = '<span>Argument</span><span class="parameter-pill">kind : city ownership</span><span>Provided by each call: neutral or enemy.</span>';
  $('#stage').innerHTML = `<div class="start-label"><span class="start-dot"></span>${active === 'main' ? 'When choosing a plan' : `Define ${esc(definition.name)}`}</div>${renderNode(definition.root)}<p class="after-tree">${active === 'main' ? 'Try neutral expansion first. If it fails, try an enemy capture.<br>A running tactic keeps its place until it completes or fails.' : active === 'capture' ? 'Each failed forecast adds one more source on a later decision.<br>The planner never chooses extra cities on its own.' : 'Add shared steps here, then call this tactic from Main.'}</p>`;
  $('#stage').hidden = codeView;
  $('#code-panel').hidden = !codeView;
  $('#code').textContent = mdsl();
  $('#blocks-view').classList.toggle('active', !codeView); $('#blocks-view').setAttribute('aria-pressed', String(!codeView));
  $('#code-view').classList.toggle('active', codeView); $('#code-view').setAttribute('aria-pressed', String(codeView));
  const entry = find(selected);
  $('#selection-label').textContent = entry ? `${kinds[entry.n.type][1]}${entry.n.children ? ' · add blocks inside this group' : ' · add blocks after this step'}` : 'Select a block to edit or move it.';
  $('#selection-actions').hidden = !entry?.parent || codeView;
  if (entry?.parent) {
    $('#move-up').disabled = entry.parent.children.indexOf(entry.n) === 0;
    $('#move-down').disabled = entry.parent.children.indexOf(entry.n) === entry.parent.children.length - 1;
  }
  const errors = issues();
  $('#validation').textContent = errors.length ? `◌ ${errors[0]}` : '✓ Structure looks complete · mock check only';
  $('#validation').classList.toggle('invalid', errors.length > 0);
  $('#save').disabled = errors.length > 0;
  renderPalette();
}
function prototype(type, tactic) {
  if (['selector', 'sequence', 'retry'].includes(type)) return group(type, [], type === 'retry' ? { attempts: 4 } : {});
  return node(type, { ...(type === 'target' ? { query: definitions[active].parameter ? '$kind' : 'enemy' } : {}), ...(type === 'sources' ? { minimum: 6 } : {}), ...(type === 'plan' ? { seconds: 15 } : {}), ...(type === 'call' ? { tactic: tactic ?? 'capture', kind: 'enemy' } : {}) });
}
function insert(n, targetId = selected) {
  const target = find(targetId) ?? find(definitions[active].root.id);
  if (target.n.children) target.n.children.push(n);
  else target.parent.children.splice(target.parent.children.indexOf(target.n) + 1, 0, n);
  selected = n.id; markDirty(); render(); $('#library').classList.remove('open');
}
$('#palette').addEventListener('click', event => {
  const button = event.target.closest('[data-prototype]'); if (!button) return;
  insert(prototype(button.dataset.prototype, button.dataset.tactic));
});
$('#scripts').addEventListener('click', event => { const button = event.target.closest('[data-script]'); if (button) switchScript(button.dataset.script); });
$('#stage').addEventListener('click', event => {
  const open = event.target.closest('[data-open]'); if (open) { switchScript(open.dataset.open); return; }
  if (event.target.closest('select,input')) return;
  const block = event.target.closest('[data-node]'); if (block) { selected = block.dataset.node; render(); }
});
$('#stage').addEventListener('change', event => {
  const input = event.target.closest('[data-field]'); if (!input) return;
  if (input.type === 'number' && !input.checkValidity()) { toast(`Choose a value from ${input.min} to ${input.max}.`); render(); return; }
  const entry = find(input.dataset.id);
  entry.n[input.dataset.field] = input.type === 'number' ? Number(input.value) : input.value;
  markDirty(); render();
});
for (const [button, direction] of [['#move-up', -1], ['#move-down', 1]]) $(button).onclick = () => {
  const { n, parent } = find(selected); if (!parent) return;
  const index = parent.children.indexOf(n), destination = index + direction;
  if (destination < 0 || destination >= parent.children.length) return;
  [parent.children[index], parent.children[destination]] = [parent.children[destination], parent.children[index]];
  markDirty(); render();
};
function remove() { const entry = find(selected); if (!entry?.parent) return; entry.parent.children.splice(entry.parent.children.indexOf(entry.n), 1); selected = entry.parent.id; markDirty(); render(); }
$('#remove').onclick = remove;
$('#blocks-view').onclick = () => { codeView = false; render(); };
$('#code-view').onclick = () => { codeView = true; render(); };
$('#open-library').onclick = () => $('#library').classList.add('open');
$('#close-library').onclick = () => $('#library').classList.remove('open');
$('#reset').onclick = () => { definitions = initial(); active = 'main'; selected = definitions.main.root.id; dirty = false; $('#save-status').textContent = 'Example strategy'; render(); toast('Example restored.'); };
$('#save').onclick = () => { dirty = false; $('#save-status').textContent = 'Draft marked saved'; toast('Mock save only. Changes remain in this tab, not in the game.'); };
$('#new-tactic').onclick = () => { $('#tactic-name').value = ''; $('#name-error').textContent = ''; $('#tactic-dialog').showModal(); };
$('#cancel-tactic').onclick = () => $('#tactic-dialog').close();
$('#tactic-form').onsubmit = event => {
  event.preventDefault(); const name = $('#tactic-name').value.trim();
  if (!name || Object.values(definitions).some(d => d.name.toLowerCase() === name.toLowerCase())) { $('#name-error').textContent = 'Choose a unique tactic name.'; return; }
  const id = `tactic-${++serial}`; definitions[id] = { id, name, root: group('sequence') };
  $('#tactic-dialog').close(); markDirty(); switchScript(id); toast('New shared tactic. Add steps from Blocks.');
};
function startDrag(event, payload) { event.dataTransfer.setData('application/x-dotfield-block', JSON.stringify(payload)); event.dataTransfer.effectAllowed = payload.id ? 'move' : 'copy'; }
$('#palette').addEventListener('dragstart', event => { const button = event.target.closest('[data-prototype]'); if (button) startDrag(event, { type: button.dataset.prototype, tactic: button.dataset.tactic }); });
$('#stage').addEventListener('dragstart', event => {
  if (event.target.closest('button,select,input')) { event.preventDefault(); return; }
  const block = event.target.closest('[data-node]');
  if (!block || !find(block.dataset.node)?.parent) { event.preventDefault(); return; }
  startDrag(event, { id: block.dataset.node });
});
$('#stage').addEventListener('dragover', event => {
  if (!Array.from(event.dataTransfer.types).includes('application/x-dotfield-block')) return;
  event.preventDefault(); document.querySelectorAll('.drop-over').forEach(n => n.classList.remove('drop-over'));
  const target = event.target.closest('[data-node]'); target?.classList.add('drop-over');
});
$('#stage').addEventListener('drop', event => {
  const raw = event.dataTransfer.getData('application/x-dotfield-block'); if (!raw) return;
  event.preventDefault();
  const targetId = event.target.closest('[data-node]')?.dataset.node ?? definitions[active].root.id;
  let payload; try { payload = JSON.parse(raw); } catch { return; }
  if (payload.id) {
    const entry = find(payload.id); if (!entry?.parent || payload.id === targetId) { render(); return; }
    let containsTarget = false; walk(entry.n, n => { if (n.id === targetId) containsTarget = true; });
    if (containsTarget) { toast('A group cannot go inside itself.'); render(); return; }
    entry.parent.children.splice(entry.parent.children.indexOf(entry.n), 1); insert(entry.n, targetId);
  } else if (kinds[payload.type]) insert(prototype(payload.type, definitions[payload.tactic] ? payload.tactic : undefined), targetId);
});
document.addEventListener('dragend', () => document.querySelectorAll('.drop-over').forEach(n => n.classList.remove('drop-over')));
document.addEventListener('keydown', event => {
  if (event.target.closest('input,select,textarea') || $('#tactic-dialog').open) return;
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-node]')) {
    event.preventDefault(); selected = event.target.dataset.node; render();
    document.querySelector(`[data-node="${selected}"]`)?.focus({ preventScroll: true }); return;
  }
  if (event.key === 'Escape') $('#library').classList.remove('open');
  if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); remove(); }
});
render();
