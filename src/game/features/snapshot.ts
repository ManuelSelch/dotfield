import type { Territory } from '../types';

// Definitions are immutable; snapshot nested data at compiler/session boundaries.
export function snapshotTerritories(territories: readonly Territory[]): readonly Territory[] {
  const ids = new Set<string>();
  return Object.freeze(territories.map(city => {
    const kinds = new Set<string>();
    const features = city.features?.map(feature => {
      if (!feature.id || ids.has(feature.id) || kinds.has(feature.kind)) throw new RangeError('Duplicate or invalid city feature.');
      if (feature.kind !== 'factory' || !feature.beneficiaryId
        || !Number.isFinite(feature.productionMultiplier) || feature.productionMultiplier <= 0) {
        throw new RangeError('Invalid Factory definition.');
      }
      ids.add(feature.id); kinds.add(feature.kind);
      return Object.freeze({ ...feature });
    });
    return Object.freeze({ ...city, ...(features ? { features: Object.freeze(features) } : {}) });
  }));
}
