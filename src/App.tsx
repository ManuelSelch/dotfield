import { useCallback, useMemo, useRef, useState } from 'react';
import { generateMap, enemyIds, newMapSeed } from './board/generateMap';
import { HomeScreen } from './ui/HomeScreen';
import { FieldCanvas } from './board/FieldCanvas';
import { ConnectionBadge } from './ui/ConnectionBadge';
import type { AppUpdates } from './pwa/appUpdates';
import { AppHeader } from './ui/AppHeader';
import { compileRoundSetup, type RoundSetup } from './game/upgrades/compile';
import { clearSavedGame, readSavedGame, writeSavedGame } from './game/persistence';
import { normalizeMatchPreferences, readMatchPreferences, writeMatchPreferences, type GeneratedMatch, type MatchPreferences } from './game/matchPreferences';
import { createSnapshotSaver } from './game/snapshotSaver';

type ActiveSetup = RoundSetup & { readonly generated?: GeneratedMatch };
export function App({ updates }: { updates: AppUpdates }) {
  const [saved, setSaved] = useState(() => readSavedGame());
  const [preferences, setPreferences] = useState(() => saved?.generated ? normalizeMatchPreferences(saved.generated.preferences) : readMatchPreferences());
  const [previewSeed, setPreviewSeed] = useState(newMapSeed);
  const [setup, setSetup] = useState<ActiveSetup | null>(() => saved ? {
    territories: saved.territories, river: saved.state.river, terrain: saved.state.terrain, relay: saved.state.relay,
    rules: saved.state.rules, ai: saved.ai ?? {}, generated: saved.generated,
  } : null);
  const lastSeed = useRef(saved?.generated?.seed ?? previewSeed);
  const preview = useMemo(() => generateMap(preferences.map, previewSeed), [preferences.map, previewSeed]);
  const saveSnapshot = useMemo(() => createSnapshotSaver((state, phase) => {
    if (setup) writeSavedGame({ state, territories: setup.territories, ai: setup.ai, phase, generated: setup.generated });
  }), [setup]);
  const leaveGame = useCallback(() => { clearSavedGame(); setSaved(null); setSetup(null); }, []);
  function changePreferences(value: MatchPreferences) {
    setPreferences(value); writeMatchPreferences(value);
  }
  function nextSeed() {
    const seed = newMapSeed();
    lastSeed.current = seed === lastSeed.current ? (seed + 1) >>> 0 : seed;
    return lastSeed.current;
  }
  function startPreviewGame(preferences: MatchPreferences) {
    const active = ['player', ...enemyIds(preferences.map.enemies)];
    const upgrades = Object.fromEntries(Object.entries(preferences.upgrades).filter(([id]) => active.includes(id)));
    const behaviors = Object.fromEntries(Object.entries(preferences.aiBehaviors).filter(([id]) => active.includes(id)));
    const compiled = compileRoundSetup(preview.territories, upgrades, undefined, behaviors, preview.river, preview.terrain);
    clearSavedGame(); setSaved(null);
    setSetup({ ...compiled, relay: preview.relay, generated: { seed: preview.seed, preferences } });
  }
  return <>
    <main className="app-safe-area flex h-full min-h-0 w-full flex-col">
      <div className="app-viewport">
        <div className={`app-shell${setup ? ' app-shell--playing' : ' app-shell--home'}`}>
          <AppHeader><ConnectionBadge updates={updates} playing={!!setup} /></AppHeader>
          {setup ? <section className="flex min-h-0 flex-1 flex-col">
            <FieldCanvas key={setup.generated?.seed ?? 'restored'} territories={setup.territories} river={setup.river} terrain={setup.terrain} relay={setup.relay} rules={setup.rules} ai={setup.ai}
              initialState={saved?.state} initialPhase={saved?.phase} onSnapshot={saveSnapshot} onHome={leaveGame} />
          </section> : <HomeScreen map={preview} preferences={preferences} onChange={changePreferences}
            onReroll={() => setPreviewSeed(nextSeed())} onPlay={() => startPreviewGame(preferences)} />}
        </div>
      </div>
    </main>
  </>;
}
