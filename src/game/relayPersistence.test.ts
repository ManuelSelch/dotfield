import { describe, expect, it } from 'vitest';
import { createSession } from './session';
import { createSimulation } from './state';
import { advanceRound } from './round';
import { readSavedGame, writeSavedGame, type SavedGame } from './persistence';
import { defaultMatchPreferences, readMatchPreferences, writeMatchPreferences } from './matchPreferences';
import type { Territory } from './types';
const cities: Territory[] = [{ id: 'home', owner: 'player', units: 20, x: 60, y: 60 },
  { id: 'relay', owner: 'player', units: 20, x: 180, y: 240 }, { id: 'enemy', owner: 'enemy', units: 20, x: 300, y: 420 }];
const relay = { cityId: 'relay', activateAtMs: 120000, targetMs: 180000 };
function save(): SavedGame { return { territories: cities, ai: null, phase: 'paused',
  state: advanceRound(createSimulation(cities, undefined, undefined, undefined, relay), 120123.5) }; }
function restore(value: unknown) { return readSavedGame({ getItem: () => JSON.stringify(value) }); }

describe('relay persistence and lifecycle', () => {
  it('round-trips fractional holding without catch-up and resets the exact objective on restart', () => {
    let raw = '';
    const original = save();
    writeSavedGame(original, { setItem: (_,value) => { raw = value; } });
    const restored = readSavedGame({ getItem: () => raw })!;
    expect(restored.state.relay).toEqual(original.state.relay);
    const session = createSession(cities, null, undefined, { initialState: restored.state, initialPhase: restored.phase });
    expect(session.frame(999999).relay?.scoresMs.player).toBe(123.5);
    session.restart();
    expect(session.state.elapsedMs).toBe(0);
    expect(session.state.relay).toEqual({ ...relay, scoresMs: { player: 0, enemy: 0 } });
  });
  it('freezes activation and holding during pause and hidden time', () => {
    const session = createSession(cities, null, undefined, { relay });
    session.start();session.frame(0);session.pause();session.frame(300000);
    expect(session.state.elapsedMs).toBe(0);
    session.resume();session.setHidden(true);session.frame(600000);
    expect(session.state.relay?.scoresMs.player).toBe(0);
  });
  it('restores a terminal relay result without awarding more points', () => {
    const original = save();
    const terminal = { ...original, state: advanceRound(original.state, 300000) };
    const restored = restore(terminal)!;
    expect(restored.state.outcome).toEqual({ reason: 'relay', winner: 'player' });
    expect(restored.state.elapsedMs).toBe(300000);
  });
  type MutableSave = { state: { relay: { cityId: string; targetMs: number; scoresMs: Record<string, number> }; outcome?: unknown; elapsedMs: number } };
  it.each([
    (s: MutableSave) => { s.state.relay.cityId = 'missing'; },
    (s: MutableSave) => { s.state.relay.targetMs = -1; },
    (s: MutableSave) => { s.state.relay.scoresMs.player = 999999; },
    (s: MutableSave) => { s.state.relay.scoresMs.enemy = -1; },
    (s: MutableSave) => { s.state.relay.scoresMs.invented = 1; },
    (s: MutableSave) => { delete s.state.relay.scoresMs.enemy; },
    (s: MutableSave) => { s.state.relay.scoresMs.player = 180000; },
    (s: MutableSave) => { s.state.outcome = { reason: 'relay', winner: 'enemy' }; },
    (s: MutableSave) => { s.state.outcome = 'invalid'; },
    (s: MutableSave) => { s.state.elapsedMs = 0; },
  ])('rejects corrupt relay metadata rather than silently changing victory rules (%#)', corrupt => {
    const value = JSON.parse(JSON.stringify(save()));corrupt(value);
    expect(restore(value)).toBeNull();
  });
  it('does not infer Relay from legacy city IDs or generated metadata', () => {
    const original = save();
    const { relay: _, ...legacy } = original.state;
    expect(restore({ ...original, state: legacy })?.state.relay).toBeUndefined();
  });
  it('persists the optional field toggle and accepts missing legacy flags', () => {
    const preferences = defaultMatchPreferences();
    let raw = '';
    writeMatchPreferences({ ...preferences, map: { ...preferences.map, relay: true } }, { setItem: (_,s) => { raw = s; } });
    expect(readMatchPreferences({ getItem: () => raw }).map.relay).toBe(true);
    expect(readMatchPreferences({ getItem: () => JSON.stringify(preferences) }).map.relay ?? false).toBe(false);
  });
});
