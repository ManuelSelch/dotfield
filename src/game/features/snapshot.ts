import type { Territory } from '../types';

// Definitions are immutable; snapshot nested data at compiler/session boundaries.
export function snapshotTerritories(territories: readonly Territory[]): readonly Territory[] {
  const ids = new Set<string>();
  return Object.freeze(territories.map(city => {
    const kinds = new Set<string>();
    const features = city.features?.map(feature => {
      if (!feature.id || ids.has(feature.id) || kinds.has(feature.kind)) throw new RangeError('Duplicate or invalid city feature.');
      if (feature.kind === 'factory') {
        if ((feature.beneficiaryId !== undefined && !feature.beneficiaryId) || !Number.isFinite(feature.productionMultiplier) || feature.productionMultiplier <= 0) {
          throw new RangeError('Invalid Factory definition.');
        }
      } else if (feature.kind === 'watchtower') {
        if (!Number.isFinite(feature.range) || feature.range <= 0
          || !Number.isFinite(feature.fireIntervalMs) || feature.fireIntervalMs <= 0) {
          throw new RangeError('Invalid Watchtower definition.');
        }
      } else if (feature.kind === 'slow-zone') {
        if (!Number.isFinite(feature.radius) || feature.radius <= 0
          || !Number.isFinite(feature.speedMultiplier) || feature.speedMultiplier <= 0 || feature.speedMultiplier >= 1) {
          throw new RangeError('Invalid Slow Zone definition.');
        }
      } else throw new RangeError('Unknown city feature.');
      ids.add(feature.id); kinds.add(feature.kind);
      return Object.freeze({ ...feature });
    });
    return Object.freeze({ ...city, ...(features ? { features: Object.freeze(features) } : {}) });
  }));
}
