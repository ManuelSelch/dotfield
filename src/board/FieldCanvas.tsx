import { useRef } from 'react';
import { CityControls } from './CityControls';
import { cityType } from '../game/cityConversion';
import { AIRCRAFT_CAPACITY, CITY_CONVERSION_COST } from '../game/settings';
import { shieldRechargeSource } from '../game/features/networkShields';
import { useBoardSession } from './useBoardSession';
import { SessionControls, SessionNavigationControls } from '../ui/SessionControls';
import { TroopCompositionBar } from '../ui/TroopCompositionBar';
import { TransferDetails } from './TransferDetails';
import { TERRITORIES } from './map';
import { TerritoryDetails } from './TerritoryDetails';
import { RoundResult } from '../ui/RoundResult';
import { RegionControls } from './RegionControls';
import type { RulesInput, SimulationState, Territory } from '../game/types';
import type { SessionPhase } from '../game/session';
import { DEFAULT_AI, type AiConfig } from '../game/ai/config';
import type { AiConfigurations } from '../game/ai/tick';
import type { River } from '../game/river';
import type { Terrain } from '../game/terrain/types';
import { connectedTerritoryIds } from '../game/connectedTerritories';
import { connectedDefenseCapacities, connectedDefenseTierForSize } from '../game/connectedDefense';

interface FieldCanvasProps { territories?: readonly Territory[]; river?: River; terrain?: Terrain; rules?: RulesInput; ai?: AiConfig | AiConfigurations | null; autoStart?: boolean; onHome?: () => void; initialState?: SimulationState; initialPhase?: Exclude<SessionPhase, 'ready'>; onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void }

export function FieldCanvas({ territories = TERRITORIES, ai = DEFAULT_AI, autoStart = true, onHome, rules, river, terrain, initialState, initialPhase, onSnapshot }: FieldCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const session = useBoardSession(canvasRef, territories, ai, autoStart, rules, initialState, initialPhase, onSnapshot, river, terrain);
  const { state, phase } = session;
  const networkEnabled = state.rules.factions.player?.connectedDefense ?? false;
  const connectedIds = networkEnabled
    ? connectedTerritoryIds(state.territories, 'player', state.homeCityIds?.player, state.river) : new Set<string>();
  const playerDefenseTier = networkEnabled ? connectedDefenseTierForSize(connectedIds.size) : 0;
  const shieldCapacities = new Map(connectedDefenseCapacities(state));
  for (const city of state.territories) {
    if (city.cityType === 'defender' && city.owner !== 'neutral') shieldCapacities.set(city.id, 3);
  }
  const selectedCity = phase === 'running' && state.roundStatus === 'playing'
    ? state.territories.find(c => c.id === session.citySelection?.cityId && c.owner === 'player') : undefined;
  const plane = selectedCity && state.aircraft?.[selectedCity.id];
  const shield = selectedCity && shieldRechargeSource(state, selectedCity.id);

  return (
    <>
      <div className="mb-3 flex shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1"><TroopCompositionBar state={state} /></div>
      </div>
      <div className="field-viewport relative min-h-0 flex-1">
        <canvas ref={canvasRef} tabIndex={-1} className="block h-full w-full touch-none rounded-[20px] bg-field select-none" role="img" aria-label="Territory board" aria-describedby={`territory-details connected-territory-help upgrade-icon-help${state.river ? ' bridge-order-help' : ''}${state.terrain ? ' terrain-order-help' : ''}`}>
          Your browser does not support Canvas. Territory details are listed below.
        </canvas>
        <RegionControls state={state} disabled={phase !== 'running'} shieldCapacities={shieldCapacities} />
        <p id="connected-territory-help" className="sr-only">
          {networkEnabled ? connectedIds.size
            ? `The highlighted outer border encloses ${connectedIds.size} of your cities connected to your starting city through shared borders between neighboring territories.`
            : 'No cities are currently connected to your starting city through neighboring territory borders.'
            : 'The connected-territory border highlight is shown only while Defensive Network is enabled.'}
          {playerDefenseTier ? ` Each connected city can store up to ${playerDefenseTier} shield${playerDefenseTier === 1 ? '' : 's'} and recharges one every 10 seconds. Each shield blocks one hostile troop-arrival batch. The numbered badge shows capacity; shield arcs show current charges.` : state.rules.factions.player?.connectedDefense ? ' Defensive Network is active but needs at least four connected cities before shields recharge.' : ''}
        </p>
        {state.river && <p id="bridge-order-help" role="status" className="sr-only">
          {session.feedback || 'River crossings require paired bridge-city orders. Send within your bank, stage at a bridge city, then send across. The river itself is not a city target.'}
        </p>}
        {state.territories.some(c => c.features?.some(f => f.kind === 'artillery')) && <p role="status" aria-label="Artillery feedback" className="sr-only">
          {state.artilleryShots?.length ? state.artilleryShots.map(shot => `${shot.sourceId} fired at ${shot.targetId}: one defender lost.`).join(' ') : 'Artillery automatically fires at hostile garrisons; neutral Artillery is inactive.'}
        </p>}
        {state.terrain && <p id="terrain-order-help" role="status" className="sr-only">
          {session.feedback || 'Mountains block direct troop orders and Artillery shots. Stage troops around the ridge; Artillery automatically targets the nearest hostile garrison within its range.'}
        </p>}
        {state.roundStatus === 'playing' && <>
          <SessionControls phase={phase} onPause={session.pause} onResume={session.resume} onRestart={session.restart} />
          <SessionNavigationControls onRestart={session.restart} onHome={onHome} />
        </>}
        <RoundResult status={state.roundStatus} onReplay={session.replay} onHome={onHome} />
      </div>
      {selectedCity && <CityControls name={selectedCity.id} cityType={cityType(selectedCity)} troops={selectedCity.units}
        planePhase={plane?.phase ?? null} capacity={AIRCRAFT_CAPACITY} costs={CITY_CONVERSION_COST}
        targeting={session.citySelection?.targeting ?? null}
        detail={plane?.cargo ? `${plane.cargo} aboard` : shield?.capacity ? `${state.captureShields[selectedCity.id]?.remaining ?? 0}/${shield.capacity} shields · ${shield.source} recharge 10s` : undefined}
        onConvert={session.convert} onFly={() => session.target('fly')} onGround={() => session.target('ground')}
        onCancel={session.cancelTarget} onClose={session.closeCity} />}
      <TerritoryDetails territories={state.territories} captureShields={state.captureShields} shieldCapacities={shieldCapacities} />
      <TransferDetails state={state} />
    </>
  );
}
