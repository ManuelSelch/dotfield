import { MantineProvider } from '@mantine/core';
import { createRoot } from 'react-dom/client';

import { ARTILLERY_MAP } from '../../src/board/artillery-map';
import { FACTORY_MAP } from '../../src/board/factory-map';
import { FieldCanvas } from '../../src/board/field-canvas';
import { seededRandom } from '../../src/board/generate-map';
import { TERRITORIES } from '../../src/board/map';
import type { FieldMap } from '../../src/board/maps';
import { RIVER_MAP } from '../../src/board/river-map';
import { resolveCombat } from '../../src/game/combat';
import { dispatchUnits } from '../../src/game/dispatch';
import { readSavedGame, writeSavedGame } from '../../src/game/persistence';
import { BASE_FACTION_RULES, createRules } from '../../src/game/rules';
import { createSimulation } from '../../src/game/state';
import { compileRoundSetup } from '../../src/game/upgrades/compile';
import { AppHeader } from '../../src/ui/app-header';
import { theme } from '../../src/ui/theme';
import '../../src/styles.css';

const params = new URLSearchParams(location.search);
const defeated = params.has('defeat');
const shieldBattle = params.has('shield-battle');
const riverMap: FieldMap | undefined = params.has('siege')
  ? ARTILLERY_MAP
  : params.has('foundry')
    ? FACTORY_MAP
    : params.has('bridges')
      ? RIVER_MAP
      : undefined;
const gunOwner = params.get('gun-owner');
const territories = shieldBattle
  ? [
      { id: 'home', owner: 'player', units: 36, x: 50, y: 320 },
      { id: 'target', owner: 'neutral', units: 2, x: 160, y: 100 },
      { id: 'enemy', owner: 'enemy', units: 21, x: 270, y: 100 },
    ]
  : riverMap
    ? riverMap.territories.map((city) =>
        city.id === 'artillery' && (gunOwner === 'player' || gunOwner === 'enemy')
          ? { ...city, owner: gunOwner }
          : city,
      )
    : params.has('passive')
      ? TERRITORIES
      : TERRITORIES.map((node) => ({
          ...node,
          owner:
            node.id === 'south'
              ? ((defeated ? 'enemy' : 'player') as 'enemy' | 'player')
              : node.id === 'centre'
                ? ('enemy' as const)
                : ('neutral' as const),
          units: node.id === 'south' ? 20 : node.id === 'centre' ? 1 : node.units,
        }));

const watchtowerHostIndex = Math.floor(seededRandom(19)() * territories.length);
const fieldFeatures = territories.map((city, index) => {
  const features = [...(city.features ?? [])];
  if (params.has('watchtower') && index === watchtowerHostIndex)
    features.push({
      id: `${city.id}:watchtower`,
      kind: 'watchtower' as const,
      range: 150,
      fireIntervalMs: 250,
    });
  if (params.has('slow-zone') && index === 6)
    features.push({
      id: `${city.id}:slow-zone`,
      kind: 'slow-zone' as const,
      radius: 150,
      speedMultiplier: 0.5,
    });
  return features.length ? { ...city, features } : city;
});
const restored = params.has('siege') ? readSavedGame() : null;
const baseline = params.has('no-growth')
  ? {
      factions: Object.fromEntries(
        ['player', 'enemy'].map((id) => [
          id,
          { unitsPerSecond: 0, travelSpeed: 35, batchIntervalMs: 600 },
        ]),
      ),
    }
  : undefined;
const setup = compileRoundSetup(
  fieldFeatures,
  {
    player: [
      ...(shieldBattle || params.has('capture-shield') ? ['capture-shield' as const] : []),
      ...(params.has('industry') ? ['industry' as const] : []),
      ...(params.has('factory') ? ['factory' as const] : []),
    ],
  },
  shieldBattle
    ? createRules({
        factions: {
          player: { ...BASE_FACTION_RULES, unitsPerSecond: 0 },
          enemy: { ...BASE_FACTION_RULES, unitsPerSecond: 0 },
        },
      })
    : baseline,
  {},
  riverMap?.river,
  riverMap?.terrain,
);

// Seed a completed capture through real combat, then fly four real five-dot hostile batches.
const initialState = shieldBattle
  ? dispatchUnits(
      resolveCombat({
        ...createSimulation(setup.territories, setup.rules),
        arrivals: [
          {
            id: 99,
            sourceId: 'home',
            targetId: 'target',
            owner: 'player',
            units: 14,
            formationSize: 14,
            dotSlots: Array.from({ length: 14 }, (_, i) => i),
            from: { x: 50, y: 320 },
            to: { x: 160, y: 100 },
            durationMs: 1,
            elapsedMs: 1,
          },
        ],
      }),
      'enemy',
      'target',
      'enemy',
    )
  : undefined;

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} forceColorScheme="light">
    <main className="app-safe-area mx-auto flex h-full min-h-0 w-full max-w-[496px] flex-col">
      <AppHeader />
      <section className="flex min-h-0 flex-1 flex-col">
        <FieldCanvas
          territories={setup.territories}
          rules={setup.rules}
          river={setup.river}
          terrain={setup.terrain}
          ai={null}
          autoStart
          initialState={restored?.state ?? initialState}
          initialPhase={restored?.phase ?? 'running'}
          onSnapshot={
            shieldBattle || params.has('siege')
              ? (state, phase) => {
                  if (phase !== 'ready')
                    writeSavedGame({ state, phase, territories: setup.territories, ai: null });
                }
              : undefined
          }
        />
      </section>
    </main>
  </MantineProvider>,
);
