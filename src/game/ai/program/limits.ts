/** Admission for native custom programs, not the trusted handwritten MDSL path.
 * Source-format limits alone cannot bound forecasting; work is charged inside
 * actual forecast/world iterations too. These are NOT a wall-clock guarantee.
 */
export const PROGRAM_LIMITS = Object.freeze({
  bytes: 256 * 1024,
  nodes: 128,
  depth: 12,
  attempts: 8,
  minimumArmy: 999,
  analysisVisits: 4096,
  horizonMs: 15000,
  chosenSources: 8,
  capabilities: 64,
  forecasts: 4,
  commands: 1,
  callDepth: 4,
  worldIterations: 2048,
  worldWork: 100000,
  cities: 24,
  transfers: 128,
  cityUnits: 1024,
  factions: 5,
  featuresPerCity: 8,
});
export class ProgramBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgramBudgetError';
  }
}
