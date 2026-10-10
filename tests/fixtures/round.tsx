import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { FieldCanvas } from '../../src/board/FieldCanvas';
import { TERRITORIES } from '../../src/board/map';
import { RIVER_MAP } from '../../src/board/riverMap';
import { FACTORY_MAP } from '../../src/board/factoryMap';
import { compileRoundSetup } from '../../src/game/upgrades/compile';
import { AppHeader } from '../../src/ui/AppHeader';
import { theme } from '../../src/ui/theme';
import '../../src/styles.css';

const params = new URLSearchParams(location.search);
const defeated = params.has('defeat');
const riverMap = params.has('foundry') ? FACTORY_MAP : params.has('bridges') ? RIVER_MAP : undefined;
const territories = riverMap ? riverMap.territories : params.has('passive') ? TERRITORIES : TERRITORIES.map(node => ({ ...node,
  owner: node.id === 'south' ? (defeated ? 'enemy' : 'player') as 'enemy' | 'player'
    : node.id === 'centre' ? 'enemy' as const : 'neutral' as const,
  units: node.id === 'south' ? 20 : node.id === 'centre' ? 1 : node.units,
}));

const setup = compileRoundSetup(territories, { player: [
  ...(params.has('industry') ? ['industry' as const] : []),
  ...(params.has('factory') ? ['factory' as const] : []),
  ...(params.has('watchtower') ? ['watchtower' as const] : []),
  ...(params.has('slow-zone') ? ['slow-zone' as const] : []),
] }, undefined, 0, {}, riverMap?.river);

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} forceColorScheme="light">
    <main className="app-safe-area mx-auto flex h-full min-h-0 w-full max-w-[496px] flex-col">
      <AppHeader />
      <section className="flex min-h-0 flex-1 flex-col">
        <FieldCanvas territories={setup.territories} rules={setup.rules} river={setup.river} ai={null} autoStart />
      </section>
    </main>
  </MantineProvider>,
);
