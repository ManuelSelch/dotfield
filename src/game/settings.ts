import type { GrowthRules } from './types';

// Prototype tuning values, not permanent balance decisions.
export const GROWTH_RULES: GrowthRules = { unitsPerSecond: 1 };
export const SIMULATION_STEP_MS = 50;
export const TERRITORY_RADIUS = 29;
export const BATCH_SIZE = 5;
export const BATCH_INTERVAL_MS = 600;
export const TRAVEL_SPEED = 35; // Map-coordinate units per second, independent of screen size.
