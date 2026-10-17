import type { SimulationState } from './types';

export function evaluateRound(state: SimulationState): SimulationState {
  if (state.roundStatus !== 'playing') return state;
  const alive = new Set(state.territories.map(node => node.owner).filter(owner => owner !== 'neutral'));
  for (const transfer of [...state.transfers, ...state.arrivals]) {
    if (transfer.units > 0 && transfer.elapsedMs >= 0) alive.add(transfer.owner);
  }
  for (const plane of Object.values(state.aircraft ?? {})) {
    if (plane.cargo > 0 && (plane.phase === 'outbound' || plane.phase === 'unloading')) alive.add(plane.owner);
  }
  const player = alive.has('player');
  if (!player || alive.size <= 1) {
    const winner = alive.size === 1 ? [...alive][0] : undefined;
    return { ...state, roundStatus: player ? 'victory' : alive.size > 0 ? 'defeat' : 'draw',
      ...(state.relay ? { outcome: { reason: 'conquest' as const, ...(winner ? { winner } : {}) } } : {}) };
  }
  const winner = state.relay && Object.entries(state.relay.scoresMs).find(([,score]) => score >= state.relay!.targetMs)?.[0];
  return winner ? { ...state, roundStatus: winner === 'player' ? 'victory' : 'defeat', outcome: { reason: 'relay', winner } } : state;
}
