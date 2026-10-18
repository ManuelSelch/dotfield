const aiPanel = document.getElementById('aiPanel');
const debugToggle = document.getElementById('debugToggle');

function setPanelVisible(visible) {
  aiPanel.style.display = visible ? 'block' : 'none';
  debugToggle.textContent = visible ? 'Hide AI debug' : 'Show AI debug';
  debugToggle.setAttribute('aria-expanded', String(visible));
}

debugToggle.addEventListener('click', () => {
  setPanelVisible(aiPanel.style.display === 'none');
});

setPanelVisible(true);
