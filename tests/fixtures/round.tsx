import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { FieldCanvas } from '../../src/board/FieldCanvas';
import { TERRITORIES } from '../../src/board/map';
import { RIVER_MAP } from '../../src/board/riverMap';
import { FACTORY_MAP } from '../../src/board/factoryMap';
import { compileRoundSetup } from '../../src/game/upgrades/compile';
import { createSimulation } from '../../src/game/state';
import { writeSavedGame } from '../../src/game/persistence';
import { resolveCombat } from '../../src/game/combat';
import { dispatchUnits } from '../../src/game/dispatch';
import { BASE_FACTION_RULES, createRules } from '../../src/game/rules';
import { AppHeader } from '../../src/ui/AppHeader';
import { theme } from '../../src/ui/theme';
import '../../src/styles.css';

const params = new URLSearchParams(location.search);
const defeated = params.has('defeat');
const riverMap = params.has('foundry') ? FACTORY_MAP : params.has('bridges') ? RIVER_MAP : undefined;
const shieldBattle = params.has('shield-battle');
const territories = shieldBattle ? [
  { id: 'home', owner: 'player', units: 36, x: 50, y: 320 },
  { id: 'target', owner: 'neutral', units: 2, x: 160, y: 100 },
  { id: 'enemy', owner: 'enemy', units: 21, x: 270, y: 100 },
] : riverMap ? riverMap.territories : params.has('passive') ? TERRITORIES : TERRITORIES.map(node => ({ ...node,
  owner: node.id === 'south' ? (defeated ? 'enemy' : 'player') as 'enemy' | 'player'
    : node.id === 'centre' ? 'enemy' as const : 'neutral' as const,
  units: node.id === 'south' ? 20 : node.id === 'centre' ? 1 : node.units,
}));

const setup = compileRoundSetup(territories, { player: [
  ...(shieldBattle || params.has('capture-shield') ? ['capture-shield' as const] : []),
  ...(params.has('industry') ? ['industry' as const] : []),
  ...(params.has('factory') ? ['factory' as const] : []),
  ...(params.has('watchtower') ? ['watchtower' as const] : []),
  ...(params.has('slow-zone') ? ['slow-zone' as const] : []),
] }, shieldBattle ? createRules({ factions: {
  player: { ...BASE_FACTION_RULES, unitsPerSecond: 0 }, enemy: { ...BASE_FACTION_RULES, unitsPerSecond: 0 },
} }) : undefined, 0, {}, riverMap?.river);

// Seed a completed capture through real combat, then fly four real five-dot hostile batches.
const initialState = shieldBattle ? dispatchUnits(resolveCombat({
  ...createSimulation(setup.territories, setup.rules),
  arrivals: [{ id: 99, sourceId: 'home', targetId: 'target', owner: 'player', units: 14,
    formationSize: 14, dotSlots: Array.from({ length: 14 }, (_, i) => i),
    from: { x: 50, y: 320 }, to: { x: 160, y: 100 }, durationMs: 1, elapsedMs: 1 }],
}), 'enemy', 'target', 'enemy') : undefined;

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} forceColorScheme="light">
    <main className="app-safe-area mx-auto flex h-full min-h-0 w-full max-w-[496px] flex-col">
      <AppHeader />
      <section className="flex min-h-0 flex-1 flex-col">
        <FieldCanvas territories={setup.territories} rules={setup.rules} river={setup.river} ai={null} autoStart initialState={initialState} initialPhase="running"
          onSnapshot={shieldBattle ? (state, phase) => {
            if (phase !== 'ready') writeSavedGame({ state, phase, territories: setup.territories, ai: null });
          } : undefined} />
      </section>
    </main>
  </MantineProvider>,
);
