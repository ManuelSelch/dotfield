import { createRules } from '../rules';
import type { FactionId, FactionRules, SimulationRules, Territory } from '../types';
import { UPGRADES, type UpgradeId, type UpgradeEffect } from './catalog';
import { snapshotTerritories } from '../features/snapshot';

export type UpgradeSelection = Readonly<Partial<Record<FactionId, readonly UpgradeId[]>>>;
export interface RoundSetup {
  readonly territories: readonly Territory[];
  readonly rules: SimulationRules;
}

// The UI (and later progression) supplies IDs; the simulation receives only resolved rules.
export function compileRoundSetup(territories: readonly Territory[], selection: UpgradeSelection,
  baseline: SimulationRules = createRules()): RoundSetup {
  for (const id of Object.keys(selection)) {
    if (!Object.hasOwn(baseline.factions, id)) throw new RangeError(`Unknown faction ${id}.`);
  }
  let seed = snapshotTerritories(territories);
  const factions = Object.fromEntries(Object.entries(baseline.factions).map(([id, base]) => {
    const rules: { -readonly [K in keyof FactionRules]: FactionRules[K] } = { ...base };
    for (const upgradeId of [...new Set(selection[id] ?? [])].sort()) {
      if (!Object.hasOwn(UPGRADES, upgradeId)) throw new RangeError(`Unknown upgrade ${upgradeId}.`);
      const effects: readonly UpgradeEffect[] = UPGRADES[upgradeId].effects;
      for (const effect of effects) {
        if (effect.kind === 'multiply-stat') {
          if (!Number.isFinite(effect.multiplier) || effect.multiplier <= 0) throw new RangeError('Invalid stat multiplier.');
          rules[effect.stat] *= effect.multiplier;
        } else {
          const host = seed.find(city => city.owner === id);
          if (!host) throw new RangeError(`No starting city for faction ${id}.`);
          const feature = { ...effect.feature, id: `${host.id}:${effect.feature.kind}:${id}`, beneficiaryId: id };
          seed = seed.map(city => city === host ? { ...city, features: [...(city.features ?? []), feature] } : city);
        }
      }
    }
    return [id, rules];
  }));
  return Object.freeze({
    territories: snapshotTerritories(seed),
    rules: createRules({ factions }),
  });
}
