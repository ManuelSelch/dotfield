import type { FactionId } from '../types';

export interface FactoryFeature {
  readonly id: string;
  readonly kind: 'factory';
  // Bonus follows the original beneficiary, not the city's current captor.
  readonly beneficiaryId: FactionId;
  readonly productionMultiplier: number;
}

// Extend this discriminated union when another territory mechanic is implemented.
export type TerritoryFeature = FactoryFeature;
