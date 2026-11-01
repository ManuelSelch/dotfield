import { useCallback, useMemo, useRef, useState } from 'react';

import { FieldCanvas } from './board/field-canvas';
import { generateMap, enemyIds, newMapSeed } from './board/generate-map';
import {
  normalizeMatchPreferences,
  readMatchPreferences,
  writeMatchPreferences,
  type GeneratedMatch,
  type MatchPreferences,
} from './game/match-preferences';
import { clearSavedGame, readSavedGame, writeSavedGame } from './game/persistence';
import { createSnapshotSaver } from './game/snapshot-saver';
import { compileRoundSetup, type RoundSetup } from './game/upgrades/compile';
import type { AppUpdates } from './pwa/app-updates';
import { AppHeader } from './ui/app-header';
import { BotEditorEntry } from './ui/bot-editor-entry';
import { ConnectionBadge } from './ui/connection-badge';
import { HomeScreen } from './ui/home-screen';

type ActiveSetup = RoundSetup & { readonly generated?: GeneratedMatch };
export function App({ updates }: { updates: AppUpdates }) {
  const [editor, setEditor] = useState<{ enemy: string; name: string } | null>(null);
  const [saved, setSaved] = useState(() => readSavedGame());
  const [preferences, setPreferences] = useState(() =>
    saved?.generated
      ? normalizeMatchPreferences(saved.generated.preferences)
      : readMatchPreferences(),
  );
  const [previewSeed, setPreviewSeed] = useState(newMapSeed);
  const [setup, setSetup] = useState<ActiveSetup | null>(() =>
    saved
      ? {
          territories: saved.territories,
          river: saved.state.river,
          terrain: saved.state.terrain,
          relay: saved.state.relay,
          rules: saved.state.rules,
          ai: saved.ai ?? {},
          generated: saved.generated,
        }
      : null,
  );
  const lastSeed = useRef(saved?.generated?.seed ?? previewSeed);
  const preview = useMemo(
    () => generateMap(preferences.map, previewSeed),
    [preferences.map, previewSeed],
  );
  const saveSnapshot = useMemo(
    () =>
      createSnapshotSaver((state, phase) => {
        if (setup)
          writeSavedGame({
            state,
            territories: setup.territories,
            ai: setup.ai,
            phase,
            generated: setup.generated,
          });
      }),
    [setup],
  );
  const leaveGame = useCallback(() => {
    clearSavedGame();
    setSaved(null);
    setSetup(null);
  }, []);
  function changePreferences(value: MatchPreferences) {
    setPreferences(value);
    writeMatchPreferences(value);
  }
  function nextSeed() {
    const seed = newMapSeed();
    lastSeed.current = seed === lastSeed.current ? (seed + 1) >>> 0 : seed;
    return lastSeed.current;
  }
  function startPreviewGame(preferences: MatchPreferences) {
    const active = ['player', ...enemyIds(preferences.map.enemies)];
    const upgrades = Object.fromEntries(
      Object.entries(preferences.upgrades).filter(([id]) => active.includes(id)),
    );
    const behaviors = Object.fromEntries(
      Object.entries(preferences.aiBehaviors).filter(([id]) => active.includes(id)),
    );
    const compiled = compileRoundSetup(
      preview.territories,
      upgrades,
      undefined,
      behaviors,
      preview.river,
      preview.terrain,
    );
    clearSavedGame();
    setSaved(null);
    setSetup({ ...compiled, relay: preview.relay, generated: { seed: preview.seed, preferences } });
  }
  return (
    <>
      <main className="app-safe-area flex h-full min-h-0 w-full flex-col">
        <div className="app-viewport">
          <div className={`app-shell${setup ? ' app-shell--playing' : ' app-shell--home'}`}>
            <AppHeader>
              <ConnectionBadge updates={updates} playing={!!setup} editing={!!editor} />
            </AppHeader>
            {setup ? (
              <section className="flex min-h-0 flex-1 flex-col">
                <FieldCanvas
                  key={setup.generated?.seed ?? 'restored'}
                  territories={setup.territories}
                  river={setup.river}
                  terrain={setup.terrain}
                  relay={setup.relay}
                  rules={setup.rules}
                  ai={setup.ai}
                  initialState={saved?.state}
                  initialPhase={saved?.phase}
                  onSnapshot={saveSnapshot}
                  onHome={leaveGame}
                />
              </section>
            ) : editor ? (
              <BotEditorEntry
                key={editor.enemy}
                enemy={editor.enemy}
                name={editor.name}
                onClose={() => setEditor(null)}
              />
            ) : (
              <HomeScreen
                onEditLogic={(enemy, name) => setEditor({ enemy, name })}
                map={preview}
                preferences={preferences}
                onChange={changePreferences}
                onReroll={() => setPreviewSeed(nextSeed())}
                onPlay={() => startPreviewGame(preferences)}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
