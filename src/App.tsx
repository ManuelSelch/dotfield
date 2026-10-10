import { useCallback, useMemo, useState } from 'react';
import { MAPS } from './board/maps';
import { HomeScreen } from './ui/HomeScreen';
import { FieldCanvas } from './board/FieldCanvas';
import { OfflineNotice } from './ui/OfflineNotice';
import { AppHeader } from './ui/AppHeader';
import { compileRoundSetup, type RoundSetup } from './game/upgrades/compile';
import type { UpgradeId } from './game/upgrades/catalog';
import type { AiBehavior } from './game/ai/behaviors';
import { clearSavedGame, readSavedGame, writeSavedGame } from './game/persistence';
import { createSnapshotSaver } from './game/snapshotSaver';

export function App() {
  const [saved, setSaved] = useState(() => readSavedGame());
  const [selectedMapId, setSelectedMapId] = useState(MAPS[0].id);
  const [upgrades, setUpgrades] = useState<Readonly<Record<string, readonly UpgradeId[]>>>({ player: [] });
  const [aiBehaviors, setAiBehaviors] = useState<Readonly<Record<string, AiBehavior>>>({});
  const [setup, setSetup] = useState<RoundSetup | null>(() => saved ? {
    territories: saved.territories,
    rules: saved.state.rules,
    ai: saved.ai ?? {},
  } : null);
  const saveSnapshot = useMemo(() => createSnapshotSaver((state, phase) => {
    if (setup) writeSavedGame({ state, territories: setup.territories, ai: setup.ai, phase });
  }), [setup]);
  const leaveGame = useCallback(() => { clearSavedGame(); setSaved(null); setSetup(null); }, []);
  const map = MAPS.find(map => map.id === selectedMapId) ?? MAPS[0];
  return (
    <>
      <OfflineNotice />
      <main className="app-safe-area flex h-full min-h-0 w-full flex-col">
        <div className="app-viewport">
          <div className={`app-shell${setup ? ' app-shell--playing' : ' app-shell--home'}`}>
            <AppHeader />
            {setup ? <section className="flex min-h-0 flex-1 flex-col">
              <FieldCanvas territories={setup.territories} rules={setup.rules} ai={setup.ai} initialState={saved?.state} initialPhase={saved?.phase} onSnapshot={saveSnapshot} onHome={leaveGame} />
            </section> : <HomeScreen map={map} onSelect={setSelectedMapId} upgrades={upgrades} onUpgrades={setUpgrades}
              aiBehaviors={aiBehaviors} onAiBehaviors={setAiBehaviors}
              onPlay={() => {
                clearSavedGame();
                setSaved(null);
                setSetup(compileRoundSetup(map.territories, upgrades, undefined, Math.random(), aiBehaviors));
              }} />}
          </div>
        </div>
      </main>
    </>
  );
}
