import type { FactionRules } from '../types';
import type { FactoryFeature, WatchtowerFeature, SlowZoneFeature } from '../features/types';

export interface StatModifier {
  readonly kind: 'multiply-stat';
  readonly stat: Exclude<keyof FactionRules, 'captureShieldBatches'>;
  readonly multiplier: number;
}
export interface StartingFeatureEffect {
  readonly kind: 'attach-starting-feature';
  readonly feature: Omit<FactoryFeature, 'id' | 'beneficiaryId'> | Omit<WatchtowerFeature, 'id'>;
}
export interface RandomFeatureEffect {
  readonly kind: 'attach-random-feature';
  readonly feature: Omit<SlowZoneFeature, 'id'>;
}
export interface CaptureShieldEffect {
  readonly kind: 'capture-shield';
  readonly batches: number;
}
export type UpgradeEffect = StatModifier | StartingFeatureEffect | RandomFeatureEffect | CaptureShieldEffect;
interface UpgradeDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effects: readonly UpgradeEffect[];
}

export const UPGRADES = {
  industry: {
    id: 'industry', name: 'Industry', description: '+25% production · You only',
    effects: [{ kind: 'multiply-stat', stat: 'unitsPerSecond', multiplier: 1.25 }],
  },
  factory: {
    id: 'factory', name: 'Factory', description: '2× starting-city production · Follows ownership',
    effects: [{ kind: 'attach-starting-feature', feature: { kind: 'factory', productionMultiplier: 2 } }],
  },
  'slow-zone': {
    id: 'slow-zone', name: 'Slow Zone', description: '50% hostile speed within 90 units · Random city · Neutral slows everyone',
    effects: [{ kind: 'attach-random-feature', feature: { kind: 'slow-zone', radius: 90, speedMultiplier: 0.5 } }],
  },
  watchtower: {
    id: 'watchtower', name: 'Watchtower', description: 'Shoots up to 4 nearby enemy troops per second · Changes sides if captured',
    effects: [{ kind: 'attach-starting-feature', feature: { kind: 'watchtower', range: 72, fireIntervalMs: 250 } }],
  },
  'capture-shield': {
    id: 'capture-shield', name: 'Capture shield', description: 'New captures block 3 hostile batches · Refreshes on recapture',
    effects: [{ kind: 'capture-shield', batches: 3 }],
  },
} as const satisfies Record<string, UpgradeDefinition>;
export type UpgradeId = keyof typeof UPGRADES;
