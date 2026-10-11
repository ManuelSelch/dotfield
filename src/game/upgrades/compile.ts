import { BASE_FACTION_RULES, createRules } from '../rules';
import type { FactionId, FactionRules, SimulationRules, Territory } from '../types';
import { UPGRADES, type UpgradeId, type UpgradeEffect } from './catalog';
import { snapshotTerritories } from '../features/snapshot';
import { resolveAiBehavior, type AiBehavior } from '../ai/behaviors';
import type { AiConfig } from '../ai/config';
import { createRiver, type River } from '../river';
import { createTerrain } from '../terrain/terrain';
import type { Terrain } from '../terrain/types';

export type UpgradeSelection = Readonly<Partial<Record<FactionId, readonly UpgradeId[]>>>;
export interface RoundSetup {
  readonly terrain?: Terrain;
  readonly river?: River;
  readonly territories: readonly Territory[];
  readonly rules: SimulationRules;
  readonly ai: Readonly<Partial<Record<FactionId, AiConfig>>>;
}

// The UI (and later progression) supplies IDs; the simulation receives only resolved rules.
export function compileRoundSetup(territories: readonly Territory[], selection: UpgradeSelection,
  baseline?: SimulationRules,
  behaviors: Readonly<Partial<Record<FactionId, AiBehavior>>> = {}, river?: River, terrain?: Terrain): RoundSetup {
  const factionIds = [...new Set(['player', ...territories.map(city => city.owner)
    .filter((id): id is string => id !== 'neutral')])];
  const baseRules = baseline ?? createRules({ factions: Object.fromEntries(factionIds.map(id => [id, { ...BASE_FACTION_RULES }])) });
  for (const id of Object.keys(behaviors)) {
    if (id === 'player' || !factionIds.includes(id)) throw new RangeError(`Unknown AI faction ${id}.`);
  }
  for (const id of Object.keys(selection)) {
    if (!Object.hasOwn(baseRules.factions, id)) throw new RangeError(`Unknown faction ${id}.`);
  }
  let seed = snapshotTerritories(territories);
  const factions = Object.fromEntries(Object.entries(baseRules.factions).map(([id, base]) => {
    const rules: { -readonly [K in keyof FactionRules]: FactionRules[K] } = { ...base };
    for (const upgradeId of [...new Set(selection[id] ?? [])].sort()) {
      if (!Object.hasOwn(UPGRADES, upgradeId)) throw new RangeError(`Unknown upgrade ${upgradeId}.`);
      const effects: readonly UpgradeEffect[] = UPGRADES[upgradeId].effects;
      for (const effect of effects) {
        if (effect.kind === 'multiply-stat') {
          if (!Number.isFinite(effect.multiplier) || effect.multiplier <= 0) throw new RangeError('Invalid stat multiplier.');
          rules[effect.stat] *= effect.multiplier;
        } else if (effect.kind === 'capture-shield') {
          rules.captureShieldBatches = effect.batches;
        } else if (effect.kind === 'connected-defense') {
          rules.connectedDefense = true;
        } else {
          const host = seed.find(city => city.owner === id);
          if (!host) throw new RangeError(`No eligible city for faction ${id}.`);
          if (host.features?.some(feature => feature.kind === 'factory')) continue;
          const feature = { ...effect.feature, id: `${host.id}:${effect.feature.kind}:${id}` };
          seed = seed.map(city => city === host ? { ...city, features: [...(city.features ?? []), feature] } : city);
        }
      }
    }
    return [id, rules];
  }));
  return Object.freeze({
    ...(terrain ? { terrain: createTerrain(terrain) } : {}),
    ...(river ? { river: createRiver(river, seed) } : {}),
    territories: snapshotTerritories(seed),
    rules: createRules({ factions }),
    ai: Object.freeze(Object.fromEntries(factionIds.filter(id => id !== 'player')
      .map(id => [id, resolveAiBehavior(behaviors[id])]))),
  });
}
