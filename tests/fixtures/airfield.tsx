import { MantineProvider } from '@mantine/core';
import { createRoot } from 'react-dom/client';

import { FieldCanvas } from '../../src/board/field-canvas';
import { RIVER_MAP } from '../../src/board/river-map';
import { readSavedGame, writeSavedGame } from '../../src/game/persistence';
import { createRules, BASE_FACTION_RULES } from '../../src/game/rules';
import { createSimulation } from '../../src/game/state';
import { createTerrain } from '../../src/game/terrain/terrain';
import type { Territory } from '../../src/game/types';
import { advanceWorldStep } from '../../src/game/world-step';
import { AppHeader } from '../../src/ui/app-header';
import { theme } from '../../src/ui/theme';
import '../../src/styles.css';

const production = new URLSearchParams(location.search).get('scenario') === 'production';
const territories: readonly Territory[] = RIVER_MAP.territories.map((city) =>
  city.id === 'south'
    ? { ...city, units: 131, cityType: production ? 'production' : 'airfield' }
    : city.id === 'north'
      ? { ...city, units: 20 }
      : city,
);
const rules = createRules({
  factions: Object.fromEntries(
    ['player', 'enemy'].map((id) => [id, { ...BASE_FACTION_RULES, unitsPerSecond: 0 }]),
  ),
});
const terrain = createTerrain({
  bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 },
  barriers: [
    { id: 'ridge', kind: 'mountain', bounds: { minX: 150, maxX: 210, minY: 270, maxY: 310 } },
  ],
  crossings: [],
});
let initial = createSimulation(territories, rules, RIVER_MAP.river, terrain);
if (!production) initial = advanceWorldStep(initial, 20_000);
initial = { ...initial, captureShields: { north: { remaining: 3 } } };
const restored = readSavedGame();
createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} forceColorScheme="light">
    <main className="app-safe-area mx-auto flex h-full min-h-0 w-full max-w-[496px] flex-col">
      <AppHeader />
      <section className="flex min-h-0 flex-1 flex-col">
        <FieldCanvas
          territories={territories}
          rules={rules}
          river={RIVER_MAP.river}
          terrain={terrain}
          ai={null}
          initialState={restored?.state ?? initial}
          initialPhase={restored?.phase ?? 'running'}
          onSnapshot={(state, phase) => {
            if (phase !== 'ready') writeSavedGame({ state, phase, territories, ai: null });
          }}
        />
      </section>
    </main>
  </MantineProvider>,
);
