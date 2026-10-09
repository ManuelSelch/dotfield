import { useState } from 'react';
import { MAPS } from './board/maps';
import { HomeScreen } from './ui/HomeScreen';
import { FieldCanvas } from './board/FieldCanvas';
import { AppHeader } from './ui/AppHeader';
import { FieldHeading } from './ui/FieldHeading';
import { AppFooter } from './ui/AppFooter';

export function App() {
  const [selectedMapId, setSelectedMapId] = useState(MAPS[0].id);
  const [playing, setPlaying] = useState(false);
  const map = MAPS.find(map => map.id === selectedMapId) ?? MAPS[0];
  return (
    <main className="app-safe-area mx-auto flex h-full min-h-0 w-full max-w-[496px] flex-col">
      <AppHeader />
      {playing ? <>
        <section className="flex min-h-0 flex-1 flex-col" aria-labelledby="field-title">
          <FieldHeading name={map.name} number={MAPS.indexOf(map) + 1} />
          <FieldCanvas territories={map.territories} onHome={() => setPlaying(false)} />
        </section>
        <AppFooter />
      </> : <HomeScreen map={map} onSelect={setSelectedMapId} onPlay={() => setPlaying(true)} />}
    </main>
  );
}
