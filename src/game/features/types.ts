import type { FactionId } from '@/game/types';

export interface FactoryFeature {
  readonly id: string;
  readonly kind: 'factory';
  // Legacy saves may include the original beneficiary; production now follows ownership.
  readonly beneficiaryId?: FactionId;
  readonly productionMultiplier: number;
}

export interface WatchtowerFeature {
  readonly id: string;
  readonly kind: 'watchtower';
  // Coverage is measured in the fixed 360×480 field coordinate system.
  readonly range: number;
  readonly fireIntervalMs: number;
}

export interface SlowZoneFeature {
  readonly id: string;
  readonly kind: 'slow-zone';
  readonly radius: number;
  readonly speedMultiplier: number;
}

export interface ArtilleryFeature {
  readonly id: string;
  readonly kind: 'artillery';
  readonly range: number;
  readonly fireIntervalMs: number;
}

export type TerritoryFeature =
  FactoryFeature | WatchtowerFeature | SlowZoneFeature | ArtilleryFeature;
