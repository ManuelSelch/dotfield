import { evaluateRound } from './outcome';
import { createRelay } from './relay';
import type { SimulationState, Territory } from './types';

export function restoreRelay(
  state: SimulationState,
  opening: readonly Territory[],
): SimulationState['relay'] {
  if (
    state.outcome !== undefined &&
    (state.roundStatus === 'playing' ||
      !state.outcome ||
      typeof state.outcome !== 'object' ||
      Array.isArray(state.outcome))
  )
    throw new RangeError('Invalid outcome.');
  const raw = state.relay;
  if (raw === undefined) {
    if (state.outcome !== undefined) throw new RangeError('Outcome without relay metadata.');
    return undefined;
  }
  if (!raw || typeof raw !== 'object') throw new RangeError('Invalid relay.');
  const definition = createRelay(raw, opening, Object.keys(state.rules.factions));
  if (
    !raw.scoresMs ||
    typeof raw.scoresMs !== 'object' ||
    Array.isArray(raw.scoresMs) ||
    Object.keys(raw.scoresMs).length !== Object.keys(definition.scoresMs).length
  )
    throw new RangeError('Invalid relay scores.');
  for (const [id, score] of Object.entries(raw.scoresMs))
    if (
      !Object.hasOwn(definition.scoresMs, id) ||
      typeof score !== 'number' ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > raw.targetMs
    )
      throw new RangeError('Invalid relay score.');

  if (
    Object.values(raw.scoresMs).reduce((a, b) => a + b, 0) >
      Math.max(0, state.elapsedMs - raw.activateAtMs) + 1e-6 ||
    Object.values(raw.scoresMs).filter((score) => score >= raw.targetMs).length > 1
  )
    throw new RangeError('Impossible relay progress.');
  const relay = { ...definition, scoresMs: Object.freeze({ ...raw.scoresMs }) };
  const expected = evaluateRound({ ...state, relay, outcome: undefined, roundStatus: 'playing' });
  if (
    expected.roundStatus !== state.roundStatus ||
    expected.outcome?.reason !== state.outcome?.reason ||
    expected.outcome?.winner !== state.outcome?.winner
  )
    throw new RangeError('Inconsistent relay outcome.');
  return Object.freeze(relay);
}
