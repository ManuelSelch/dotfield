import { BASE_FACTION_RULES, createRules } from '../rules';
import type { FactionId, FactionRules, SimulationRules, Territory } from '../types';
import { UPGRADES, type UpgradeId, type UpgradeEffect } from './catalog';
import { snapshotTerritories } from '../features/snapshot';
import { resolveAiBehavior, type AiBehavior } from '../ai/behaviors';
import type { AiConfig } from '../ai/config';
import { createRiver, type River } from '../river';

export type UpgradeSelection = Readonly<Partial<Record<FactionId, readonly UpgradeId[]>>>;
export interface RoundSetup {
  readonly river?: River;
  readonly territories: readonly Territory[];
  readonly rules: SimulationRules;
  readonly ai: Readonly<Partial<Record<FactionId, AiConfig>>>;
}

// The UI (and later progression) supplies IDs; the simulation receives only resolved rules.
export function compileRoundSetup(territories: readonly Territory[], selection: UpgradeSelection,
  baseline?: SimulationRules,
  placementOrBehaviors: number | Readonly<Partial<Record<FactionId, AiBehavior>>> = 0,
  behaviorInput: Readonly<Partial<Record<FactionId, AiBehavior>>> = {}, river?: River): RoundSetup {
  const placementChoice = typeof placementOrBehaviors === 'number' ? placementOrBehaviors : 0;
  const behaviors = typeof placementOrBehaviors === 'number' ? behaviorInput : placementOrBehaviors;
  if (!Number.isFinite(placementChoice) || placementChoice < 0 || placementChoice >= 1) throw new RangeError('Placement choice must be in [0, 1).');
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
        } else {
          const host = effect.kind === 'attach-random-feature'
            ? seed[Math.floor(placementChoice * seed.length)] : seed.find(city => city.owner === id);
          if (!host) throw new RangeError(`No eligible city for faction ${id}.`);
          if (effect.feature.kind === 'factory' && host.features?.some(feature => feature.kind === 'factory')) continue;
          const feature = { ...effect.feature, id: `${host.id}:${effect.feature.kind}:${id}` };
          seed = seed.map(city => city === host ? { ...city, features: [...(city.features ?? []), feature] } : city);
        }
      }
    }
    return [id, rules];
  }));
  return Object.freeze({
    ...(river ? { river: createRiver(river, seed) } : {}),
    territories: snapshotTerritories(seed),
    rules: createRules({ factions }),
    ai: Object.freeze(Object.fromEntries(factionIds.filter(id => id !== 'player')
      .map(id => [id, resolveAiBehavior(behaviors[id])]))),
  });
}
