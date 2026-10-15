import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { FieldCanvas } from '../../src/board/FieldCanvas';
import { createSimulation } from '../../src/game/state';
import { advanceWorldStep } from '../../src/game/worldStep';
import { createTerrain } from '../../src/game/terrain/terrain';
import { DEFAULT_AI } from '../../src/game/ai/config';
import type { Territory } from '../../src/game/types';
import { theme } from '../../src/ui/theme';
import '../../src/styles.css';
const conversion = new URLSearchParams(location.search).has('conversion');
const territories: readonly Territory[] = conversion ? [
  { id: 'enemy-home', owner: 'enemy', units: 50, x: 40, y: 430 },
  { id: 'enemy-rear', owner: 'enemy', units: 50, x: 40, y: 330 },
  { id: 'launch', owner: 'enemy', units: 90, x: 40, y: 50 },
  { id: 'target', owner: 'player', units: 12, x: 300, y: 50 },
] : [
  { id: 'launch', owner: 'enemy', units: 41, x: 40, y: 50, cityType: 'airfield' },
  { id: 'target', owner: 'player', units: 5, x: 300, y: 50 },
];
const terrain = createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 },
  barriers: [{ id: 'ridge', kind: 'mountain', bounds: { minX: 150, maxX: 180, minY: 0, maxY: 480 } }], crossings: [] });
const initial = createSimulation(territories, { unitsPerSecond: 0 }, undefined, terrain);
createRoot(document.getElementById('root')!).render(<MantineProvider theme={theme} forceColorScheme="light">
  <main className="app-safe-area mx-auto flex h-full min-h-0 max-w-[496px] flex-col">
    <FieldCanvas territories={territories} terrain={terrain} rules={initial.rules} ai={DEFAULT_AI}
      initialState={conversion ? initial : advanceWorldStep(initial, 20_000)} initialPhase="running" />
  </main>
</MantineProvider>);
