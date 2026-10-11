import type { MapSettings } from '../board/generateMap';

export function MapOptions({ settings, onChange }: { settings: MapSettings; onChange: (value: MapSettings) => void }) {
  function cities(value: number) { onChange({ ...settings, cities: Math.min(24, Math.max(6, value)) }); }
  return <>
    <div className="home-section-label">Your match</div>
    <div className="home-setting">
      <div><label htmlFor="city-count">Cities</label></div>
      <div className="home-stepper">
        <button type="button" aria-label="Fewer cities" disabled={settings.cities === 6} onClick={() => cities(settings.cities - 1)}>−</button>
        <output htmlFor="city-count">{settings.cities}</output>
        <button type="button" aria-label="More cities" disabled={settings.cities === 24} onClick={() => cities(settings.cities + 1)}>+</button>
      </div>
    </div>
    <input id="city-count" className="home-city-range" type="range" min={6} max={24} value={settings.cities} aria-label="Total cities" onChange={event => cities(Number(event.currentTarget.value))} />
    <div className="home-range-labels"><span>6 · compact</span><span>24 · expansive</span></div>
    <div className="home-setting home-enemy-setting"><div><span className="home-label">Enemies</span></div></div>
    <div className="home-segments" role="group" aria-label="Number of enemy factions">
      {[1, 2, 3, 4].map(value => <button type="button" key={value} aria-pressed={settings.enemies === value} onClick={() => onChange({ ...settings, enemies: value })}>{value}</button>)}
    </div>
    <div className="home-section-label home-features-label">On the field</div>
    {([{ id: 'industry', name: 'Industry', aria: 'Map industry' },
      { id: 'river', name: 'River & bridges', aria: 'River and bridges' },
      { id: 'mountains', name: 'Mountains', aria: 'Mountains' },
      { id: 'artillery', name: 'Artillery', aria: 'Artillery' },
      { id: 'watchtower', name: 'Watchtower', aria: 'Watchtower' },
      { id: 'slowZone', name: 'Slow Zone', aria: 'Slow Zone' }] as const).map(feature => <div className="home-feature" key={feature.id}>
      <div><span className="home-label">{feature.name}</span></div>
      <div className="home-segments" role="group" aria-label={feature.aria}>
        {[false, true].map(value => <button type="button" key={String(value)} aria-pressed={settings[feature.id] === value} onClick={() => onChange({ ...settings, [feature.id]: value })}>{value ? 'On' : 'Off'}</button>)}
      </div>
    </div>)}
  </>;
}
