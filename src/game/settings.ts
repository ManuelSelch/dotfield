import type { GrowthRules } from './types';

// Prototype tuning values, not permanent balance decisions.
export const GROWTH_RULES: GrowthRules = { unitsPerSecond: 1 };
export const CITY_PRODUCTION_LIMIT = 50; // Reinforcements may exceed this limit.
export const SIMULATION_STEP_MS = 50;
export const TERRITORY_RADIUS = 17;
export const DOT_RADIUS = 3.8; // Board units; rendering scales the same geometry.
export const DOT_SPACING = 10;
export const BATCH_SIZE = 5;
export const BATCH_INTERVAL_MS = 600;
export const TRAVEL_SPEED = 35; // Map-coordinate units per second, independent of screen size.
