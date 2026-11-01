import { factionPalette } from '@/board/palette';
import type { SessionPhase } from '@/game/session';
import type { SimulationState } from '@/game/types';
import './relay.css';

const factionName = (id: string) =>
  id === 'player'
    ? 'You'
    : id === 'enemy'
      ? 'Enemy 1'
      : /^enemy-\d+$/.test(id)
        ? `Enemy ${id.slice(6)}`
        : `Faction ${id}`;
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export function RelayScoreboard({ state, phase }: { state: SimulationState; phase: SessionPhase }) {
  const relay = state.relay;
  if (!relay) return null;
  const owner = state.territories.find((c) => c.id === relay.cityId)!.owner;
  const active = state.elapsedMs >= relay.activateAtMs;
  const running = phase === 'running' && state.roundStatus === 'playing';
  const remaining =
    owner === 'neutral' ? 0 : Math.ceil((relay.targetMs - relay.scoresMs[owner]) / 1000);
  const title = !running
    ? state.roundStatus !== 'playing'
      ? 'Round complete'
      : 'Paused · holding progress frozen'
    : !active
      ? `Relay activates in ${clock(Math.ceil((relay.activateAtMs - state.elapsedMs) / 1000))}`
      : owner === 'neutral'
        ? 'Relay active · neutral'
        : owner === 'player'
          ? `You win in ${remaining}s`
          : `${factionName(owner)} wins in ${remaining}s`;
  const participants = Object.entries(relay.scoresMs);
  const urgent = running && active && owner !== 'neutral' && owner !== 'player' && remaining <= 30;
  const announcement = !running
    ? title
    : !active
      ? 'Relay inactive. Scoring starts at two minutes.'
      : owner === 'neutral'
        ? 'Relay active and neutral.'
        : `${factionName(owner)} hold the relay.${urgent ? ' Opponent close to relay victory.' : ''}`;
  return (
    <section
      className={`relay-hud${urgent ? ' relay-hud--urgent' : ''}`}
      aria-label="Relay scoreboard"
    >
      <div className="relay-hud__heading">
        <strong>{title}</strong>
        <span>HOLD {relay.targetMs / 1000}s TOTAL</span>
      </div>
      <div
        className={`relay-hud__scores${participants.length > 2 ? ' relay-hud__scores--many' : ''}`}
      >
        {participants.map(([id, score]) => (
          <div
            key={id}
            className="relay-score"
            style={{ color: factionPalette(id).fill }}
            role="meter"
            aria-label={`${factionName(id)} relay holding seconds`}
            aria-valuemin={0}
            aria-valuemax={relay.targetMs / 1000}
            aria-valuenow={Math.floor(score / 1000)}
          >
            <div className="relay-score__label">
              <span>
                {factionName(id)}
                {running && active && owner === id ? ' · +1/s' : ''}
              </span>
              <b>
                {Math.floor(score / 1000)}
                <small> /{relay.targetMs / 1000}</small>
              </b>
            </div>
            <div className="relay-score__track">
              <div
                style={{ width: `${(score / relay.targetMs) * 100}%`, background: 'currentColor' }}
              />
            </div>
          </div>
        ))}
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  );
}
