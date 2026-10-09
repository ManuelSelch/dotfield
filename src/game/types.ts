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
  readonly durationMs: number;
  readonly elapsedMs: number;
}

export type RoundStatus = 'playing' | 'victory' | 'defeat' | 'draw';

export interface SimulationState {
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
}
