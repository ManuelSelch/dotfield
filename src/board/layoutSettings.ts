import type { MapLayout, MapSettings } from './generateMap';

export const MAP_LAYOUTS: Readonly<Record<MapLayout, string>> = {
  open: 'Open field', river: 'River', mountains: 'Mountains', courtyard: 'Courtyard',
};
/** Legacy combined geography stays supported in round saves; Home migrates to Mountains. */
export function layoutOf(settings: MapSettings): MapLayout {
  return settings.layout ?? (settings.mountains ? 'mountains' : settings.river ? 'river' : 'open');
}
export function selectLayout(settings: MapSettings, layout: MapLayout): MapSettings {
  return { ...settings, layout, river: layout === 'river' || layout === 'courtyard',
    mountains: layout === 'mountains' || layout === 'courtyard',
    ...(layout === 'courtyard' ? { cities: Math.max(20, settings.cities), enemies: 1 } : {}) };
}
