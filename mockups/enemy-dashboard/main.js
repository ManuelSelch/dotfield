const stage = document.querySelector('.main-stage');
const panel = document.getElementById('aiPanel');
const toggle = document.getElementById('debugToggle');
const closeButton = document.getElementById('panelClose');
const backdrop = document.getElementById('dashboardBackdrop');
const title = document.getElementById('dashboardTitle');
const mobileLayout = window.matchMedia('(max-width: 760px)');

function syncAccessibility() {
  const mobile = mobileLayout.matches;
  panel.setAttribute('role', mobile ? 'dialog' : 'complementary');
  if (mobile) panel.setAttribute('aria-modal', 'true');
  else panel.removeAttribute('aria-modal');
}

function setPanelVisible(visible, { returnFocus = false } = {}) {
  panel.hidden = !visible;
  backdrop.hidden = !visible || !mobileLayout.matches;
  stage.classList.toggle('dashboard-open', visible);
  toggle.setAttribute('aria-expanded', String(visible));
  toggle.setAttribute('aria-label', `${visible ? 'Hide' : 'Show'} enemy dashboard`);
  syncAccessibility();

  if (visible && mobileLayout.matches) title.focus();
  if (!visible && returnFocus) toggle.focus();
}

toggle.addEventListener('click', () => setPanelVisible(panel.hidden));
closeButton.addEventListener('click', () => setPanelVisible(false, { returnFocus: true }));
backdrop.addEventListener('click', () => setPanelVisible(false, { returnFocus: true }));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !panel.hidden) setPanelVisible(false, { returnFocus: true });
});
mobileLayout.addEventListener('change', () => {
  if (!panel.hidden) setPanelVisible(true);
  else syncAccessibility();
});

syncAccessibility();
