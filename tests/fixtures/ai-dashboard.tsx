import { MantineProvider } from '@mantine/core';
import { createRoot } from 'react-dom/client';

import { FieldCanvas } from '../../src/board/field-canvas';
import { DEFAULT_AI } from '../../src/game/ai/config';
import { createSimulation } from '../../src/game/state';
import type { Territory } from '../../src/game/types';
import { AppHeader } from '../../src/ui/app-header';
import { theme } from '../../src/ui/theme';
import '../../src/styles.css';

const territories: readonly Territory[] = [
  { id: 'enemy-home', owner: 'enemy', units: 4, x: 60, y: 100 },
  { id: 'neutral', owner: 'neutral', units: 50, x: 180, y: 240 },
  { id: 'player-home', owner: 'player', units: 40, x: 300, y: 380 },
];
const initialState = createSimulation(territories);

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} forceColorScheme="light">
    <main className="app-safe-area flex h-full min-h-0 w-full flex-col">
      <div className="app-viewport">
        <div className="app-shell app-shell--playing">
          <AppHeader />
          <section className="flex min-h-0 flex-1 flex-col">
            <FieldCanvas
              territories={territories}
              ai={DEFAULT_AI}
              initialState={initialState}
              initialPhase="running"
              autoStart
            />
          </section>
        </div>
      </div>
    </main>
  </MantineProvider>,
);
