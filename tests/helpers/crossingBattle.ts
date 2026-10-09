import { createSimulation } from '../../src/game/state';
import { dispatchUnits } from '../../src/game/dispatch';

export function createCrossingBattle() {
  let state = createSimulation([
    { id: 'player-source', owner: 'player', units: 6, x: 90, y: 240 },
    { id: 'enemy-source', owner: 'enemy', units: 2, x: 270, y: 240 },
  ], { unitsPerSecond: 0 });
  state = dispatchUnits(state, 'player-source', 'enemy-source');
  return dispatchUnits(state, 'enemy-source', 'player-source', 'enemy');
}
