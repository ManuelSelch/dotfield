import type { Territory, CaptureShieldState, SimulationState, Aircraft } from '../game/types';
import { shieldRechargeSource } from '../game/features/networkShields';
import { AIRCRAFT_CAPACITY, ARTILLERY_FIRE_INTERVAL_MS, ARTILLERY_RANGE, DEFENDER_SHIELD_CAPACITY, WATCHTOWER_FIRE_INTERVAL_MS, WATCHTOWER_RANGE } from '../game/settings';

export function aircraftLabel(plane: Aircraft): string {
  const seconds = Math.ceil(Math.max(0, plane.durationMs - plane.elapsedMs) / 1000);
  switch (plane.phase) {
    case 'ready': return ` Plane ready; capacity ${AIRCRAFT_CAPACITY} troops.`;
    case 'preparing': return ` Plane preparing; ${seconds} seconds remaining.`;
    case 'turnaround': return ` Plane turnaround; ${seconds} seconds remaining.`;
    case 'outbound': return ` Plane outbound to ${plane.targetId}; ${plane.cargo} troops aboard, separate from the garrison.`;
    case 'unloading': return ` Plane docked at ${plane.targetId}, unloading; ${plane.cargo} troops aboard, separate from the garrison.`;
    case 'returning': return ` Plane returning empty to ${plane.homeId}; no troops aboard.`;
  }
}

export function featureLabels(city: Territory, shield?: CaptureShieldState, shieldCapacity?: number,
  state?: SimulationState): string {
  const type = city.cityType ?? 'production';
  const stored = shield ?? state?.captureShields[city.id];
  const identity = type === 'production' ? ' Production city.'
    : type === 'defender' ? ` Defender city; no troop growth. ${city.owner === 'neutral'
      ? 'Transit blocking inactive while neutral.'
      : 'Defender blocks hostile ground transit through its region; attack it or stage around it. Aircraft bypass the border.'}`
      : type === 'airfield' ? ' Airfield city; no troop growth.'
        : type === 'watchtower' ? ` Watchtower ${city.owner === 'neutral' ? 'inactive while neutral' : `controlled by ${city.owner}`}; no troop growth. Fires at hostile ground troops within ${WATCHTOWER_RANGE} units, up to ${(1000 / WATCHTOWER_FIRE_INTERVAL_MS).toFixed(0)} per second.`
          : ` Artillery ${city.owner === 'neutral' ? 'inactive while neutral' : `controlled by ${city.owner}`}; no troop growth. Fires at enemy garrisons within ${ARTILLERY_RANGE} units, up to ${(1000 / ARTILLERY_FIRE_INTERVAL_MS).toFixed(0)} shots per second; mountains block shots.`;
  const active = state ? shieldRechargeSource(state, city.id) : undefined;
  const capacity = active?.capacity ?? (type === 'defender' && city.owner !== 'neutral'
    ? Math.max(DEFENDER_SHIELD_CAPACITY, shieldCapacity ?? 0) : shieldCapacity ?? 0);
  const defender = active?.source === 'defender' || (!active && type === 'defender' && city.owner !== 'neutral');
  const plane = state?.aircraft?.[city.id];
  return identity + (state?.relay?.cityId === city.id ? ' Relay objective; ownership earns holding progress after activation, regardless of city role.' : '') + (plane ? aircraftLabel(plane) : '') + (city.features ?? []).map(feature => {
    switch (feature.kind) {
      case 'factory': return ` Factory ${city.owner !== 'neutral' && type === 'production' ? 'active' : 'inactive'} (${feature.productionMultiplier}× production).`;
      case 'slow-zone': return ` Slow Zone controlled by ${city.owner}, ${Math.round(feature.speedMultiplier * 100)}% speed within ${feature.radius} units for ${city.owner === 'neutral' ? 'all traveling groups' : 'hostile traveling groups'}.`;
      case 'artillery': return ` Artillery ${city.owner === 'neutral' ? 'inactive' : `controlled by ${city.owner}`}, nearest hostile garrison within ${feature.range} units, one defender every ${feature.fireIntervalMs} ms. Mountains block shots; troops must capture cities.`;
      case 'watchtower': return ` Watchtower controlled by ${city.owner}, firing within ${feature.range} units every ${feature.fireIntervalMs} ms (up to ${(1000 / feature.fireIntervalMs).toFixed(1)} shots/second).`;
    }
  }).join('') + (type !== 'production' && city.features?.some(f => f.kind === 'factory')
    ? ' Factory troop production is suspended on this city type.' : '') + (capacity
    ? ` ${defender ? 'Defender' : 'Defensive Network'} shields: ${stored?.remaining ?? 0} stored (capacity ${capacity}); one recharges every 10 seconds ${defender ? 'independently of network connectivity' : 'while connected'}. Each blocks one hostile troop-arrival batch.`
    : type === 'defender' && city.owner === 'neutral'
      ? ` Defender shields: ${stored?.remaining ?? 0} stored (capacity 0); recharge inactive while neutral.`
    : stored ? stored.remaining
      ? ` Shields: ${stored.remaining} active ${stored.remaining === 1 ? 'charge' : 'charges'}; each blocks one hostile troop-arrival batch.`
      : ' Shields depleted.' : '');
}
