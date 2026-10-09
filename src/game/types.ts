export type Owner = 'player' | 'enemy' | 'neutral';

export interface Territory {
  readonly id: string;
  readonly owner: Owner;
  readonly units: number;
  readonly x: number;
  readonly y: number;
}

export interface TerritoryState extends Territory {
  // Accumulated unit-milliseconds, below 1000. Rendering uses whole units only.
  readonly growthRemainder: number;
}

export interface GrowthRules {
  readonly unitsPerSecond: number;
}

export interface SimulationState {
  readonly elapsedMs: number;
  readonly territories: readonly TerritoryState[];
  readonly rules: GrowthRules;
}
