import type { River } from './river';
import type { Terrain } from './terrain/types';
import type { TerritoryFeature } from './features/types';

export type FactionId = string;
export type Owner = FactionId | 'neutral';
export type Faction = FactionId;

export interface Territory {
  readonly id: string;
  readonly owner: Owner;
  readonly units: number;
  readonly x: number;
  readonly y: number;
  readonly features?: readonly TerritoryFeature[];
}

export interface TerritoryState extends Territory {
  // Accumulated unit-milliseconds, below 1000. Rendering uses whole units only.
  readonly growthRemainder: number;
}

export interface GrowthRules {
  readonly unitsPerSecond: number;
}

// Configurations and ownership are keyed by stable identity.
export interface FactionRules extends GrowthRules {
  readonly travelSpeed: number;
  readonly batchIntervalMs: number;
  // Optional in authored/legacy inputs; normalized to zero by createRules.
  readonly captureShieldBatches?: number;
}
export interface SimulationRules {
  readonly factions: Readonly<Record<FactionId, FactionRules>>;
}
export type RulesInput = GrowthRules | SimulationRules;

export interface Point { readonly x: number; readonly y: number }

export interface Transfer {
  readonly id: number;
  readonly sourceId: string;
  readonly targetId: string;
  readonly owner: FactionId;
  readonly units: number;
  readonly formationSize: number;
  readonly dotSlots: readonly number[];
  readonly from: Point;
  readonly to: Point;
  // Unslowed route duration; immutable during flight.
  readonly durationMs: number;
  // Signed launch delay, then actual flight age (not distance progress).
  readonly elapsedMs: number;
  // Distance expressed in base-speed milliseconds; absent on legacy constant-speed flights.
  readonly traveledMs?: number;
}

export type RoundStatus = 'playing' | 'victory' | 'defeat' | 'draw';

export interface CaptureShieldState {
  readonly remaining: number;
  readonly blockedAt?: number;
  readonly blockedFrom?: number;
}

export interface ArtilleryShot {
  readonly sourceId: string;
  readonly targetId: string;
  readonly owner: FactionId;
  readonly firedAtMs: number;
}

export interface SimulationState {
  readonly terrain?: Terrain;
  // Optional for legacy saves created before Artillery existed.
  readonly artilleryTimers?: Readonly<Record<string, { readonly owner: Owner; readonly elapsedMs: number }>>;
  readonly artilleryShots?: readonly ArtilleryShot[];
  readonly river?: River;
  readonly roundStatus: RoundStatus;
  readonly aiNextDecisionMs: number | null;
  readonly aiDecisionDeadlines: Readonly<Record<FactionId, number>>;
  readonly elapsedMs: number;
  readonly territories: readonly TerritoryState[];
  readonly rules: SimulationRules;
  readonly transfers: readonly Transfer[];
  readonly arrivals: readonly Transfer[];
  readonly nextTransferId: number;
  readonly watchtowerElapsedMs: Readonly<Record<string, number>>;
  readonly captureShields: Readonly<Record<string, CaptureShieldState>>;
}
