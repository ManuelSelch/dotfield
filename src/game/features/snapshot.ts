import type { Territory } from '@/game/types';

// Definitions are immutable; snapshot nested data at compiler/session boundaries.
export function snapshotTerritories(territories: readonly Territory[]): readonly Territory[] {
  const ids = new Set<string>();
  const cityIds = new Set<string>();
  return Object.freeze(
    territories.map((city) => {
      if (
        !city ||
        typeof city.id !== 'string' ||
        !city.id ||
        cityIds.has(city.id) ||
        typeof city.owner !== 'string' ||
        !city.owner ||
        !Number.isSafeInteger(city.units) ||
        city.units < 0 ||
        !Number.isFinite(city.x) ||
        !Number.isFinite(city.y) ||
        (city.cityType !== undefined &&
          !['production', 'defender', 'airfield', 'watchtower', 'artillery'].includes(
            city.cityType,
          ))
      )
        throw new RangeError('Invalid city definition.');

      cityIds.add(city.id);
      const kinds = new Set<string>();
      const features = city.features?.map((feature) => {
        const weaponFeature = feature.kind === 'watchtower' || feature.kind === 'artillery';
        if (!feature.id || ids.has(feature.id) || (kinds.has(feature.kind) && !weaponFeature))
          throw new RangeError('Duplicate or invalid city feature.');
        if (feature.kind === 'factory') {
          if (
            (feature.beneficiaryId !== undefined && !feature.beneficiaryId) ||
            !Number.isFinite(feature.productionMultiplier) ||
            feature.productionMultiplier <= 0
          )
            throw new RangeError('Invalid Factory definition.');
        } else if (feature.kind === 'watchtower' || feature.kind === 'artillery') {
          if (
            !Number.isFinite(feature.range) ||
            feature.range <= 0 ||
            !Number.isFinite(feature.fireIntervalMs) ||
            feature.fireIntervalMs <= 0
          )
            throw new RangeError('Invalid firing feature definition.');
        } else if (feature.kind === 'slow-zone') {
          if (
            !Number.isFinite(feature.radius) ||
            feature.radius <= 0 ||
            !Number.isFinite(feature.speedMultiplier) ||
            feature.speedMultiplier <= 0 ||
            feature.speedMultiplier >= 1
          )
            throw new RangeError('Invalid Slow Zone definition.');
        } else throw new RangeError('Unknown city feature.');
        ids.add(feature.id);
        if (!weaponFeature) kinds.add(feature.kind);
        return Object.freeze({ ...feature });
      });
      const legacyWeapons = city.features ?? [];
      // Explicit newer special roles take precedence. Legacy weapon attachments are
      // migrated into the city role; ambiguous old dual weapons choose Artillery.
      const cityType =
        city.cityType && city.cityType !== 'production'
          ? city.cityType
          : legacyWeapons.some((feature) => feature.kind === 'artillery')
            ? 'artillery'
            : legacyWeapons.some((feature) => feature.kind === 'watchtower')
              ? 'watchtower'
              : 'production';
      const retainedFeatures = features?.filter(
        (feature) => feature.kind !== 'watchtower' && feature.kind !== 'artillery',
      );
      return Object.freeze({
        ...city,
        cityType,
        ...(features ? { features: Object.freeze(retainedFeatures) } : {}),
      });
    }),
  );
}
