import type { FactionId } from '../types';

export interface FactoryFeature {
  readonly id: string;
  readonly kind: 'factory';
  readonly beneficiaryId: FactionId;
  readonly productionMultiplier: number;
}

export interface WatchtowerFeature {
  readonly id: string;
  readonly kind: 'watchtower';
  // Coverage is measured in the fixed 360×480 field coordinate system.
  readonly range: number;
  readonly fireIntervalMs: number;
}

export type TerritoryFeature = FactoryFeature | WatchtowerFeature;
