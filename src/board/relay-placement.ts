import { RELAY_TIMING, type RelayDefinition } from '@/game/relay';
import type { River } from '@/game/river';
import { canRiverOrder } from '@/game/river';
import { BASE_FACTION_RULES } from '@/game/rules';
import { canDirectTerrainOrder } from '@/game/terrain/direct-order';
import type { Terrain } from '@/game/terrain/types';
import type { Territory } from '@/game/types';

/** Prefer central neutral territory, penalizing unequal legal staging distances.
 * Geography and opening ownership never change to accommodate the objective. */
export function placeRelay(
  cities: readonly Territory[],
  river?: River,
  terrain?: Terrain,
  courtyard = false,
): RelayDefinition {
  if (courtyard) return Object.freeze({ cityId: 'courtyard', ...RELAY_TIMING });
  const edges = new Map(
    cities.map((a) => [
      a.id,
      cities.filter(
        (b) =>
          b !== a &&
          canRiverOrder(a, b, river) &&
          canDirectTerrainOrder(a, b, terrain, BASE_FACTION_RULES),
      ),
    ]),
  );
  const distances = cities
    .filter((c) => c.owner !== 'neutral')
    .map((home) => {
      const d = new Map(cities.map((c) => [c.id, c === home ? 0 : Infinity]));
      const remaining = new Set(cities);
      while (remaining.size) {
        const a = [...remaining].sort((a, b) => d.get(a.id)! - d.get(b.id)!)[0];
        remaining.delete(a);
        if (!Number.isFinite(d.get(a.id))) break;
        for (const b of edges.get(a.id)!)
          d.set(b.id, Math.min(d.get(b.id)!, d.get(a.id)! + Math.hypot(b.x - a.x, b.y - a.y)));
      }
      return d;
    });
  const rank = (city: Territory) => {
    const approaches = distances.map((d) => d.get(city.id)!);
    return (
      Math.hypot(city.x - 180, city.y - 240) +
      (Math.max(...approaches) - Math.min(...approaches)) * 0.25
    );
  };
  const host = cities
    .filter((c) => c.owner === 'neutral' && Number.isFinite(rank(c)))
    .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id))[0];
  if (!host) throw new RangeError('No reachable neutral relay city.');
  return Object.freeze({ cityId: host.id, ...RELAY_TIMING });
}
