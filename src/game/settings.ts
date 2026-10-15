import type { GrowthRules } from './types';

// Prototype tuning values, not permanent balance decisions.
export const CITY_CONVERSION_COST = Object.freeze({ production: 10, defender: 20, airfield: 30, watchtower: 30, artillery: 40 });
export const WATCHTOWER_RANGE = 150;
export const WATCHTOWER_FIRE_INTERVAL_MS = 250;
export const ARTILLERY_RANGE = 150;
export const ARTILLERY_FIRE_INTERVAL_MS = 1000 / 3;
export const DEFENDER_SHIELD_CAPACITY = 3;
export const AIRCRAFT_CAPACITY = 100;
export const AIRCRAFT_PREPARATION_MS = 20_000;
export const AIRCRAFT_TURNAROUND_MS = 10_000;
export const AIRCRAFT_SPEED_MULTIPLIER = 2;
export const AIR_DELIVERY_INTERVAL_MS = 200;
export const AIR_DELIVERY_FEEDBACK_MS = 1_000;
export const GROWTH_RULES: GrowthRules = { unitsPerSecond: 1 };
export const CITY_PRODUCTION_LIMIT = 50; // Reinforcements may exceed this limit.
export const SIMULATION_STEP_MS = 50;
export const TERRITORY_RADIUS = 14;
export const DOT_RADIUS = 3; // Board units; rendering scales the same geometry.
export const DOT_SPACING = 8;
export const BATCH_SIZE = 5;
export const BATCH_INTERVAL_MS = 600;
export const TRAVEL_SPEED = 35; // Map-coordinate units per second, independent of screen size.
