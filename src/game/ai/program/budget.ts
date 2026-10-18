import type { SimulationState } from '../../types';
import { BATCH_SIZE } from '../../settings';
import { PROGRAM_LIMITS as L, ProgramBudgetError } from './limits';

/** Per-decision counters plus conservative admission of each observed/projected
 * world. No wall-clock interruption and no promise of a security sandbox.
 */
export class ExecutionBudget {
  private capabilities = 0;
  private forecasts = 0;
  private commands = 0;
  private iterations = 0;
  private work = 0;
  reset() { this.capabilities = this.forecasts = this.commands = this.iterations = this.work = 0; }
  capability(state: SimulationState) {
    if (++this.capabilities > L.capabilities) throw new ProgramBudgetError('Capability budget exceeded.');
    this.checkWorld(state);
  }
  forecast() { if (++this.forecasts > L.forecasts) throw new ProgramBudgetError('Forecast budget exceeded.'); }
  chosen(count: number) { if (count > L.chosenSources) throw new ProgramBudgetError('Chosen-source limit exceeded; sources were not truncated.'); }
  checkWorld(state: SimulationState) {
    if (state.territories.length > L.cities || state.transfers.length > L.transfers || state.arrivals.length > L.transfers
      || Object.keys(state.aircraft ?? {}).length > L.cities || Object.keys(state.rules.factions).length > L.factions
      || !Number.isFinite(state.elapsedMs) || state.territories.some(c => !Number.isFinite(c.units) || c.units < 0 || c.units > L.cityUnits || (c.features?.length ?? 0) > L.featuresPerCity)) {
      throw new ProgramBudgetError('World size/unit admission exceeded. Custom execution stopped.');
    }
  }
  /** Used by forecastBattle AND every internal world-step iteration, including
   * aircraft/weapon/relay splitting which can otherwise bypass an outer cap.
   */
  readonly worldStep = (state: SimulationState) => {
    this.checkWorld(state);
    const groups = state.transfers.length + state.arrivals.length;
    this.work += state.territories.length + groups * groups;
    if (++this.iterations > L.worldIterations || this.work > L.worldWork) throw new ProgramBudgetError('Forecast world-work budget exceeded.');
  };
  dispatch(state: SimulationState, sourceId: string, command = false) {
    this.checkWorld(state);
    const source = state.territories.find(c => c.id === sourceId);
    const retained = state.transfers.filter(t => t.sourceId !== sourceId || t.owner !== source?.owner || t.elapsedMs >= 0).length;
    const added = Math.ceil(Math.max(0, (source?.units ?? 1) - 1) / BATCH_SIZE);
    if (retained + added > L.transfers) throw new ProgramBudgetError('Projected dispatch exceeds transfer admission. No order issued.');
    if (command && ++this.commands > L.commands) throw new ProgramBudgetError('Command budget exceeded. No additional order issued.');
  }
}
