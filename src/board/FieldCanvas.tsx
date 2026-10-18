import { useEffect, useMemo, useRef, useState } from 'react';
import { CityControls } from './CityControls';
import { cityType } from '../game/cityConversion';
import { AIRCRAFT_CAPACITY, CITY_CONVERSION_COST } from '../game/settings';
import { shieldRechargeSource } from '../game/features/networkShields';
import { useBoardSession } from './useBoardSession';
import { SessionControls, SessionNavigationControls } from '../ui/SessionControls';
import { TroopCompositionBar } from '../ui/TroopCompositionBar';
import { RelayScoreboard } from '../ui/RelayScoreboard';
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
import { EnemyDashboard } from './EnemyDashboardPanel';
import { cityNumbers } from './enemyDashboard';

interface FieldCanvasProps { relay?: import('../game/relay').RelayDefinition; territories?: readonly Territory[]; river?: River; terrain?: Terrain; rules?: RulesInput; ai?: AiConfig | AiConfigurations | null; autoStart?: boolean; onHome?: () => void; initialState?: SimulationState; initialPhase?: Exclude<SessionPhase, 'ready'>; onSnapshot?: (state: SimulationState, phase: SessionPhase, force?: boolean) => void }

export function FieldCanvas({ territories = TERRITORIES, ai = DEFAULT_AI, autoStart = true, onHome, rules, river, terrain, relay, initialState, initialPhase, onSnapshot }: FieldCanvasProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const session = useBoardSession(canvasRef, territories, ai, autoStart, rules, initialState, initialPhase, onSnapshot, river, terrain, relay);
  const { state, phase } = session;
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [highlightedCityIds, setHighlightedCityIds] = useState<readonly string[] | null>(null);
  const aiFactionIds = (ai ? ('decisionIntervalMs' in ai ? ['enemy'] : Object.keys(ai).filter(id => ai[id])) : [])
    .filter(id => id !== 'player' && id !== 'neutral' && !!state.rules.factions[id]).sort();
  const numbers = useMemo(() => cityNumbers(territories), [territories]);
  useEffect(() => { if (state.roundStatus !== 'playing') { setDashboardOpen(false); setHighlightedCityIds(null); } }, [state.roundStatus]);
  useEffect(() => { setHighlightedCityIds(null); }, [session.aiDecisions]);
  const markerCityIds = highlightedCityIds ?? [...new Set(Object.values(session.aiDecisions).flatMap(decision => {
    const action = decision.action;
    return !action ? [] : action.type === 'convert' ? [action.cityId] : [action.sourceId, action.targetId];
  }))];
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
      {state.relay ? <RelayScoreboard state={state} phase={phase} /> : <div className="mb-3 flex shrink-0 items-center gap-3">
        <div className="min-w-0 flex-1"><TroopCompositionBar state={state} /></div>
      </div>}
      <div className={`field-layout${dashboardOpen ? ' field-layout--open' : ''}`}>
      <div className="field-viewport relative min-h-0 flex-1">
        <canvas ref={canvasRef} tabIndex={-1} className="block h-full w-full touch-none rounded-[20px] bg-field select-none" role="img" aria-label="Territory board" aria-describedby={`territory-details connected-territory-help upgrade-icon-help defender-order-help${state.river ? ' bridge-order-help' : ''}${state.terrain ? ' terrain-order-help' : ''}`}>
          Your browser does not support Canvas. Territory details are listed below.
        </canvas>
        {dashboardOpen && <svg className="enemy-dashboard-map-markers" viewBox="0 0 360 480" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          {markerCityIds.map(cityId => {
            const city = state.territories.find(candidate => candidate.id === cityId);
            const number = numbers.get(cityId);
            return city && number ? <g className="enemy-dashboard-map-marker" transform={`translate(${city.x} ${city.y})`} key={cityId}>
              <circle className="enemy-dashboard-map-marker__ring" r="18" />
              <circle className="enemy-dashboard-map-marker__tag" cx="13" cy="-13" r="9" />
              <text className="enemy-dashboard-map-marker__number" x="13" y="-10">{number}</text>
            </g> : null;
          })}
        </svg>}
        <RegionControls state={state} disabled={phase !== 'running'} shieldCapacities={shieldCapacities} />
        <p id="connected-territory-help" className="sr-only">
          {networkEnabled ? connectedIds.size
            ? `The highlighted outer border encloses ${connectedIds.size} of your cities connected to your starting city through shared borders between neighboring territories.`
            : 'No cities are currently connected to your starting city through neighboring territory borders.'
            : 'The connected-territory border highlight is shown only while Defensive Network is enabled.'}
          {playerDefenseTier ? ` Each connected city can store up to ${playerDefenseTier} shield${playerDefenseTier === 1 ? '' : 's'} and recharges one every 10 seconds. Each shield blocks one hostile troop-arrival batch. The numbered badge shows capacity; shield arcs show current charges.` : state.rules.factions.player?.connectedDefense ? ' Defensive Network is active but needs at least four connected cities before shields recharge.' : ''}
        </p>
        <p id="defender-order-help" className="sr-only">
          Fortified region edges mark owned Defenders. Hostile ground troops must attack the Defender or stage around its region.
          Neutral Defenders do not block transit. Aircraft and already-launched ground troops bypass new borders.
        </p>
        <p role="status" aria-label="Ground order feedback" className={session.feedback.startsWith('Defender ')
          ? 'pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-lg bg-white/95 px-3 py-2 text-center text-xs text-ink shadow-sm'
          : 'sr-only'}>{session.feedback}</p>
        {state.river && <p id="bridge-order-help" role="status" className="sr-only">
          River crossings require paired bridge-city orders. Send within your bank, stage at a bridge city, then send across. The river itself is not a city target.
        </p>}
        {state.territories.some(c => c.cityType === 'artillery') && <p role="status" aria-label="Artillery feedback" className="sr-only">
          {state.artilleryShots?.length ? state.artilleryShots.map(shot => `${shot.sourceId} fired at ${shot.targetId}: one defender lost.`).join(' ') : 'Artillery automatically fires at hostile garrisons; neutral Artillery is inactive.'}
        </p>}
        {state.terrain && <p id="terrain-order-help" role="status" className="sr-only">
          Mountains block direct troop orders and Artillery shots. Stage troops around the ridge; Artillery automatically targets the nearest hostile garrison within its range.
        </p>}
        {state.roundStatus === 'playing' && <>
          <SessionControls phase={phase} onPause={session.pause} onResume={session.resume} onRestart={session.restart}
            dashboardOpen={dashboardOpen} onToggleDashboard={aiFactionIds.length ? () => {
              setHighlightedCityIds(null); setDashboardOpen(open => !open);
            } : undefined} />
          <SessionNavigationControls onRestart={session.restart} onHome={onHome} />
        </>}
        <RoundResult status={state.roundStatus} onReplay={session.replay} onHome={onHome} />
      </div>
      {dashboardOpen && aiFactionIds.length > 0 && <EnemyDashboard factions={aiFactionIds} decisions={session.aiDecisions} numbers={numbers}
        relayCityId={state.relay?.cityId} onHighlight={ids => setHighlightedCityIds(ids)} onClose={() => {
          document.getElementById('enemy-dashboard-toggle')?.focus();
          setHighlightedCityIds(null); setDashboardOpen(false);
        }} />}
      </div>
      <div className="city-action-strip">
        {selectedCity ? <CityControls name={selectedCity.id} cityType={cityType(selectedCity)} troops={selectedCity.units}
          planePhase={plane?.phase ?? null} capacity={AIRCRAFT_CAPACITY} costs={CITY_CONVERSION_COST}
          targeting={session.citySelection?.targeting ?? null}
          detail={plane?.cargo ? `${plane.cargo} aboard`
            : plane && ['preparing', 'turnaround'].includes(plane.phase) ? `${Math.ceil(Math.max(0, plane.durationMs - plane.elapsedMs) / 1000)}s remaining`
            : shield?.capacity ? `${state.captureShields[selectedCity.id]?.remaining ?? 0}/${shield.capacity} shields · ${shield.source} recharge 10s` : undefined}
          onConvert={session.convert} onFly={() => session.target('fly')}
          onCancel={session.cancelTarget} />
          : <p className="city-action-strip__hint">{state.roundStatus !== 'playing' ? 'Round complete'
            : phase === 'paused' ? 'Resume to manage cities'
            : 'Tap a city to convert · drag to send troops'}</p>}
      </div>
      <TerritoryDetails state={state} territories={state.territories} captureShields={state.captureShields} shieldCapacities={shieldCapacities} />
      <TransferDetails state={state} />
    </>
  );
}
