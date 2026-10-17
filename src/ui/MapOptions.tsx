import { useRef } from 'react';
import type { MapLayout, MapSettings } from '../board/generateMap';
import { layoutOf, MAP_LAYOUTS, selectLayout } from '../board/layoutSettings';
import { TogglePill } from './TogglePill';

export function MapOptions({ settings, onChange }: { settings: MapSettings; onChange: (value: MapSettings) => void }) {
  const previous = useRef<MapSettings | null>(null);
  const layout = layoutOf(settings), courtyard = layout === 'courtyard', minimum = courtyard ? 20 : 6;
  function changeLayout(value: MapLayout) {
    if (value === layout) return;
    if (!courtyard) previous.current = settings;
    const restored = courtyard && previous.current
      ? { ...settings, cities: previous.current.cities, enemies: previous.current.enemies } : settings;
    onChange(selectLayout(restored, value));
  }
  function cities(value: number) { onChange({ ...settings, cities: Math.min(30, Math.max(minimum, value)) }); }
  return <>
    <div className="home-section-label">Your match</div>
    <div className="home-setting"><span className="home-label">Layout</span></div>
    <div className="home-segments home-layouts" role="group" aria-label="Map layout">
      {(Object.entries(MAP_LAYOUTS) as [MapLayout, string][]).map(([value, label]) => <button type="button" key={value}
        aria-pressed={layout === value} onClick={() => changeLayout(value)}>{label}</button>)}
    </div>
    {courtyard && <p className="home-layout-note">Courtyard requires 20–30 cities and one enemy. River and mountains included.</p>}
    <div className="home-setting">
      <div><label htmlFor="city-count">Cities</label></div>
      <div className="home-stepper">
        <button type="button" aria-label="Fewer cities" disabled={settings.cities === minimum} onClick={() => cities(settings.cities - 1)}>−</button>
        <output htmlFor="city-count">{settings.cities}</output>
        <button type="button" aria-label="More cities" disabled={settings.cities === 30} onClick={() => cities(settings.cities + 1)}>+</button>
      </div>
    </div>
    <input id="city-count" className="home-city-range" type="range" min={minimum} max={30} value={settings.cities} aria-label="Total cities" onChange={event => cities(Number(event.currentTarget.value))} />
    <div className="home-range-labels"><span>{minimum} · compact</span><span>30 · expansive</span></div>
    <div className="home-setting home-enemy-setting"><div><span className="home-label">Enemies</span></div></div>
    <div className="home-segments" role="group" aria-label="Number of enemy factions">
      {[1, 2, 3, 4].map(value => <button type="button" key={value} disabled={courtyard && value !== 1} aria-pressed={settings.enemies === value} onClick={() => onChange({ ...settings, enemies: value })}>{value}</button>)}
    </div>
    <div className="home-section-label home-features-label">On the field</div>
    <div className="home-feature-toggles">
      {([{ id: 'industry', name: 'Factory', aria: 'Factory' },
        { id: 'slowZone', name: 'Slow Zone', aria: 'Slow Zone' }] as const).map(feature => <TogglePill key={feature.id} label={feature.aria} pressed={settings[feature.id]}
        onClick={() => onChange({ ...settings, [feature.id]: !settings[feature.id] })} />)}
      <TogglePill label="Relay" pressed={settings.relay ?? false} onClick={() => onChange({ ...settings, relay: !settings.relay })} />
    </div>
    {settings.relay && <p className="home-relay-note">Activates at 2:00 · hold for 3:00 total</p>}
  </>;
}
