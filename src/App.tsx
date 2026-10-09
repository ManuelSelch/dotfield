import { useState } from 'react';
import { MAPS } from './board/maps';
import { HomeScreen } from './ui/HomeScreen';
import { FieldCanvas } from './board/FieldCanvas';
import { AppHeader } from './ui/AppHeader';
import { compileRoundSetup, type RoundSetup } from './game/upgrades/compile';
import type { UpgradeId } from './game/upgrades/catalog';
import type { AiBehavior } from './game/ai/behaviors';

export function App() {
  const [selectedMapId, setSelectedMapId] = useState(MAPS[0].id);
  const [upgrades, setUpgrades] = useState<Readonly<Record<string, readonly UpgradeId[]>>>({ player: [] });
  const [aiBehaviors, setAiBehaviors] = useState<Readonly<Record<string, AiBehavior>>>({});
  const [setup, setSetup] = useState<RoundSetup | null>(null);
  const map = MAPS.find(map => map.id === selectedMapId) ?? MAPS[0];
  return (
    <main className="app-safe-area mx-auto flex h-full min-h-0 w-full max-w-[496px] flex-col">
      <AppHeader />
      {setup ? <>
        <section className="flex min-h-0 flex-1 flex-col">
          <FieldCanvas territories={setup.territories} rules={setup.rules} ai={setup.ai} onHome={() => setSetup(null)} />
        </section>
      </> : <HomeScreen map={map} onSelect={setSelectedMapId} upgrades={upgrades} onUpgrades={setUpgrades}
        aiBehaviors={aiBehaviors} onAiBehaviors={setAiBehaviors}
        onPlay={() => setSetup(compileRoundSetup(map.territories, upgrades, undefined, aiBehaviors))} />}
    </main>
  );
}
