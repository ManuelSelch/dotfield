import { FieldCanvas } from './board/FieldCanvas';

export function App() {
  return (
    <main className="app">
      <header className="header">
        <h1><span className="brand-mark" aria-hidden="true" />dotfield</h1>
        <span className="preview-badge">Growth preview</span>
      </header>

      <section className="field" aria-labelledby="field-title">
        <div className="field-heading">
          <div>
            <p className="eyebrow">FIRST FIELD</p>
            <h2 id="field-title">Room to grow.</h2>
          </div>
          <span className="field-number" aria-hidden="true">01</span>
        </div>
        <FieldCanvas />
      </section>

      <footer className="footer">
        <ul className="legend" aria-label="Factions">
          <li><span className="legend-marker player" aria-hidden="true" />You</li>
          <li><span className="legend-marker neutral" aria-hidden="true" />Neutral</li>
          <li><span className="legend-marker enemy" aria-hidden="true" />Opponent</li>
        </ul>
        <p>Growth preview · attacks come next.</p>
      </footer>
    </main>
  );
}
