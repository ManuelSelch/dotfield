import { cityType } from '../cityConversion';
import { availableUnits } from '../launch';
import { canRiverOrder } from '../river';
import { getFactionRules } from '../rules';
import { createRoute } from '../route';
import { PRODUCTION_AI } from './config';
import { AIRCRAFT_CAPACITY, AIR_DELIVERY_INTERVAL_MS, BATCH_SIZE } from '../settings';
import { canDirectTerrainOrder } from '../terrain/directOrder';
import type { Aircraft, SimulationState, TerritoryState } from '../types';

export function groundLegal(state: SimulationState, source: TerritoryState, target: TerritoryState): boolean {
  return source.id !== target.id && canRiverOrder(source, target, state.river)
    && canDirectTerrainOrder(source, target, state.terrain, getFactionRules(state, source.owner));
}

export function incomingThreat(state: SimulationState, cityId: string, factionId: string): boolean {
  return [...state.transfers, ...state.arrivals].some(t => t.targetId === cityId && t.owner !== factionId)
    || Object.values(state.aircraft ?? {}).some(p => p.targetId === cityId && p.owner !== factionId
      && p.cargo > 0 && (p.phase === 'outbound' || p.phase === 'unloading'));
}

export function remainingDeliveryMs(plane: Aircraft): number {
  if (plane.phase !== 'outbound' && plane.phase !== 'unloading') return 0;
  return Math.max(0, plane.durationMs - plane.elapsedMs)
    + Math.max(0, Math.ceil(plane.cargo / BATCH_SIZE) - (plane.phase === 'unloading' ? 1 : 0)) * AIR_DELIVERY_INTERVAL_MS;
}

export function hasBarrierOpportunity(state: SimulationState, source: TerritoryState, factionId: string): boolean {
  return state.territories.some(target => target.owner !== factionId && target.id !== source.id
    && target.units + (state.captureShields[target.id]?.remaining ?? 0) * BATCH_SIZE < AIRCRAFT_CAPACITY
    && !groundLegal(state, source, target));
}

/** Include already committed supplies, not reservations twice. A busy plane can
 * accumulate its next load, but never serve as an unbounded economic sink. */
export function airSupplyRoom(state: SimulationState, target: TerritoryState, factionId: string): number {
  if (target.owner !== factionId || cityType(target) !== 'airfield') return 0;
  const ground = [...state.transfers, ...state.arrivals].filter(t => t.targetId === target.id && t.owner === factionId)
    .reduce((sum, t) => sum + t.units, 0);
  const air = Object.values(state.aircraft ?? {}).filter(p => p.targetId === target.id && p.owner === factionId
    && (p.phase === 'outbound' || p.phase === 'unloading')).reduce((sum, p) => sum + p.cargo, 0);
  return Math.max(0, AIRCRAFT_CAPACITY + 1 - target.units - ground - air);
}

export function usefulAirSupply(state: SimulationState, source: TerritoryState, target: TerritoryState, factionId: string): boolean {
  return cityType(source) === 'production' && source.id !== target.id
    && airSupplyRoom(state, target, factionId) >= availableUnits(state, source.id) - 1
    && hasBarrierOpportunity(state, target, factionId);
}

/** A nearby available army is a risk, not an invented future order. Do not
 * commit the airfield's whole garrison when a legal short attack could erase it. */
export function safeAirDeparture(state: SimulationState, launched: SimulationState, homeId: string, factionId: string): boolean {
  const home = state.territories.find(c => c.id === homeId)!;
  const retained = launched.territories.find(c => c.id === homeId)!.units;
  return !state.territories.some(hostile => hostile.owner !== factionId && hostile.owner !== 'neutral'
    && availableUnits(state, hostile.id) - 1 > retained
    && groundLegal(state, hostile, home)
    && createRoute(hostile, home, getFactionRules(state, hostile.owner)).durationMs <= PRODUCTION_AI.threatTravelMs);
}

/** The original network home is irreplaceable; never treat its last reserves as
 * construction/cargo. No special resources or combat bonuses are introduced. */
export function keepsHomeReserve(state: SimulationState, proposed: SimulationState, factionId: string): boolean {
  if (!state.rules.factions[factionId]?.connectedDefense) return true;
  const homeId = state.homeCityIds?.[factionId];
  const before = state.territories.find(c => c.id === homeId);
  const after = proposed.territories.find(c => c.id === homeId);
  return !before || before.owner !== factionId || !!after && after.owner === factionId
    && after.units >= Math.min(before.units, 12);
}
