import type { CaptureShieldState, SimulationState } from '../types';

export const CAPTURE_SHIELD_FLASH_MS = 650;

export function consumeShield(shield: CaptureShieldState, elapsedMs: number): CaptureShieldState {
  return {
    remaining: shield.remaining - 1,
    blockedAt: elapsedMs,
    // Multiple arrivals at the same simulation instant flash all consumed arcs.
    blockedFrom: shield.blockedAt === elapsedMs ? shield.blockedFrom : shield.remaining,
  };
}

// Missing runtime is a pre-upgrade save, not a fresh capture. Never grant charges during restore.
export function restoreCaptureShields(state: SimulationState): SimulationState['captureShields'] {
  const runtime = state.captureShields ?? {};
  if (typeof runtime !== 'object' || runtime === null || Array.isArray(runtime)) throw new RangeError('Invalid Capture shield runtime.');
  for (const [id, shield] of Object.entries(runtime)) {
    const city = state.territories.find(city => city.id === id);
    const factionRules = city && city.owner !== 'neutral' ? state.rules.factions[city.owner] : undefined;
    const maximum = Math.max(factionRules?.captureShieldBatches ?? 0, factionRules?.connectedDefense ? 3 : 0);
    if (!city || city.owner === 'neutral' || maximum === 0 || !shield || typeof shield !== 'object'
      || !Number.isInteger(shield.remaining) || shield.remaining < 0 || shield.remaining > maximum
      || ((shield.blockedAt === undefined) !== (shield.blockedFrom === undefined))
      || (shield.blockedAt !== undefined && (!Number.isFinite(shield.blockedAt) || shield.blockedAt < 0 || shield.blockedAt > state.elapsedMs))
      || (shield.blockedFrom !== undefined && (!Number.isInteger(shield.blockedFrom) || shield.blockedFrom <= shield.remaining || shield.blockedFrom > maximum))) {
      throw new RangeError('Invalid Capture shield runtime.');
    }
  }
  return Object.fromEntries(Object.entries(runtime).map(([id, shield]) => [id, { ...shield }]));
}
