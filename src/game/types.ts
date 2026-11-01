import type { TerritoryFeature } from './features/types';
import type { River } from './river';
import type { Terrain } from './terrain/types';

export type FactionId = string;
export type Owner = FactionId | 'neutral';
export type Faction = FactionId;

export type CityType = 'production' | 'defender' | 'airfield' | 'watchtower' | 'artillery';
export type AircraftPhase =
  'preparing' | 'ready' | 'outbound' | 'unloading' | 'returning' | 'turnaround';
export interface Aircraft {
  readonly homeId: string;
  readonly owner: FactionId;
  readonly tripId: number;
  readonly phase: AircraftPhase;
  readonly cargo: number;
  readonly targetId?: string;
  readonly position: Point;
  readonly from: Point;
  readonly to: Point;
  readonly elapsedMs: number;
  readonly durationMs: number;
}
export interface AirDelivery {
  readonly homeId: string;
  readonly tripId: number;
  readonly targetId: string;
  readonly owner: FactionId;
  readonly units: number;
  readonly atMs: number;
  readonly result: 'blocked' | 'reinforced' | 'defended' | 'captured';
}

export interface Territory {
  readonly cityType?: CityType;
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
  /** Enables city-count-based defense for cities connected to this faction's home. */
  readonly connectedDefense?: boolean;
}
export interface SimulationRules {
  readonly factions: Readonly<Record<FactionId, FactionRules>>;
}
export type RulesInput = GrowthRules | SimulationRules;

export interface Point {
  readonly x: number;
  readonly y: number;
}

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

export interface NetworkShieldTimer {
  readonly owner: Owner;
  readonly elapsedMs: number;
  /** Optional for legacy timers; prevents carrying progress across a changed recharge policy. */
  readonly capacity?: number;
  readonly source?: 'defender' | 'network';
  readonly resetAtMs?: number;
}

export interface WeaponTimer {
  readonly owner: Owner;
  readonly elapsedMs: number;
}

export interface ArtilleryShot {
  readonly sourceId: string;
  readonly targetId: string;
  readonly owner: FactionId;
  readonly firedAtMs: number;
}

export interface SimulationState {
  readonly relay?: import('./relay').RelayState;
  readonly outcome?: { readonly reason: 'relay' | 'conquest'; readonly winner?: FactionId };
  readonly aircraft?: Readonly<Record<string, Aircraft>>;
  readonly nextAircraftTripId?: number;
  /** Committed delivery feedback, retained for one simulation second. */
  readonly airDeliveries?: readonly AirDelivery[];
  readonly terrain?: Terrain;
  /** Shared per-city firing cadence for Watchtower and Artillery roles. */
  readonly weaponTimers?: Readonly<Record<string, WeaponTimer>>;
  /** Legacy save fields, read only during persistence migration. */
  readonly artilleryTimers?: Readonly<Record<string, WeaponTimer>>;
  readonly watchtowerElapsedMs?: Readonly<Record<string, number>>;
  readonly artilleryShots?: readonly ArtilleryShot[];
  readonly river?: River;
  readonly roundStatus: RoundStatus;
  readonly aiNextDecisionMs: number | null;
  readonly aiDecisionDeadlines: Readonly<Record<FactionId, number>>;
  readonly elapsedMs: number;
  readonly territories: readonly TerritoryState[];
  /** Original city for each faction, stable through capture and save/restore. */
  readonly homeCityIds?: Readonly<Record<FactionId, string>>;
  readonly rules: SimulationRules;
  readonly transfers: readonly Transfer[];
  readonly arrivals: readonly Transfer[];
  readonly nextTransferId: number;
  readonly captureShields: Readonly<Record<string, CaptureShieldState>>;
  /** Partial per-city recharge progress for Defensive Network shields. */
  readonly networkShieldTimers?: Readonly<Record<string, NetworkShieldTimer>>;
}
