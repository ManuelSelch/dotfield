import { createRules } from '../rules';
import type { FactionId, FactionRules, SimulationRules, Territory } from '../types';
import { UPGRADES, type UpgradeId, type StatModifier } from './catalog';

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
  const factions = Object.fromEntries(Object.entries(baseline.factions).map(([id, base]) => {
    const rules: { -readonly [K in keyof FactionRules]: FactionRules[K] } = { ...base };
    for (const upgradeId of [...new Set(selection[id] ?? [])].sort()) {
      if (!Object.hasOwn(UPGRADES, upgradeId)) throw new RangeError(`Unknown upgrade ${upgradeId}.`);
      const effects: readonly StatModifier[] = UPGRADES[upgradeId].effects;
      for (const effect of effects) {
        if (!Number.isFinite(effect.multiplier) || effect.multiplier <= 0) throw new RangeError('Invalid stat multiplier.');
        rules[effect.stat] *= effect.multiplier;
      }
    }
    return [id, rules];
  }));
  return Object.freeze({
    territories: Object.freeze(territories.map(city => Object.freeze({ ...city }))),
    rules: createRules({ factions }),
  });
}
