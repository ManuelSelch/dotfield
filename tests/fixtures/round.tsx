import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { FieldCanvas } from '../../src/board/FieldCanvas';
import { TERRITORIES } from '../../src/board/map';
import { AppHeader } from '../../src/ui/AppHeader';
import { AppFooter } from '../../src/ui/AppFooter';
import { FieldHeading } from '../../src/ui/FieldHeading';
import { theme } from '../../src/ui/theme';
import '../../src/styles.css';

const params = new URLSearchParams(location.search);
const defeated = params.has('defeat');
const territories = params.has('passive') ? TERRITORIES : TERRITORIES.map(node => ({ ...node,
  owner: node.id === 'south' ? (defeated ? 'enemy' : 'player') as 'enemy' | 'player'
    : node.id === 'centre' ? 'enemy' as const : 'neutral' as const,
  units: node.id === 'south' ? 20 : node.id === 'centre' ? 1 : node.units,
}));

createRoot(document.getElementById('root')!).render(
  <MantineProvider theme={theme} forceColorScheme="light">
    <main className="app-safe-area mx-auto flex h-full min-h-0 w-full max-w-[496px] flex-col">
      <AppHeader />
      <section className="flex min-h-0 flex-1 flex-col">
        <FieldHeading />
        <FieldCanvas territories={territories} ai={null} autoStart />
      </section>
      <AppFooter />
    </main>
  </MantineProvider>,
);
