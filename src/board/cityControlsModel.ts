// Presentation contract only. The caller supplies authoritative costs/state and validates commands.
import type { CityType } from '../game/types';
export type ControlCityType = CityType;
export type ControlPlanePhase = 'preparing' | 'ready' | 'outbound' | 'unloading' | 'returning' | 'turnaround';
export type CityTargetMode = 'fly' | 'ground';
export interface CityControlsState {
  name: string;
  cityType: ControlCityType;
  troops: number;
  planePhase: ControlPlanePhase | null;
  capacity: number;
  costs: Readonly<Record<ControlCityType, number>>;
  targeting: CityTargetMode | null;
  /** Optional authoritative shield/cargo/timing description; never calculated by the UI. */
  detail?: string;
}
export const CONTROL_CITY_LABELS: Readonly<Record<ControlCityType, string>> = {
  production: 'Production', defender: 'Defender', airfield: 'Airfield',
  watchtower: 'Watchtower', artillery: 'Artillery',
};
export const CONTROL_CITY_ORDER: readonly ControlCityType[] = ['production', 'defender', 'airfield', 'watchtower', 'artillery'];
export function cityControlsModel(state: CityControlsState) {
  const away = state.cityType === 'airfield' && ['outbound', 'unloading', 'returning'].includes(state.planePhase ?? '');
  const reason = state.targeting ? 'Targeting active. Cancel before changing city role.'
    : away ? 'Conversion unavailable while the plane is away. Ground orders still work.'
      : 'Build immediately; leave 1 troop. No refund when switching.';
  const types = CONTROL_CITY_ORDER.map(type => {
    const cost = state.costs[type], current = type === state.cityType;
    const unavailable = current ? 'Current · no charge' : away || state.targeting ? reason
      : state.troops < cost + 1 ? `Need ${cost + 1} troops; leave 1 behind.` : '';
    return { type, label: CONTROL_CITY_LABELS[type], cost, current, disabled: !!unavailable, reason: unavailable };
  });
  const planeText = state.cityType !== 'airfield' ? ''
    : ({ preparing: 'Preparing plane', ready: `Plane ready · capacity ${state.capacity}`,
      outbound: 'Plane away · ground available', unloading: 'Docked · unloading',
      returning: 'Returning empty', turnaround: 'Turnaround' })[state.planePhase ?? 'preparing'];
  const flyReason = state.planePhase !== 'ready' ? 'Plane must be ready.'
    : state.troops < 2 ? 'Need at least 2 troops; leave 1 behind.'
      : `Board ${Math.min(state.capacity, Math.max(0, state.troops - 1))} troops; leave at least 1 behind.`;
  const currentText = state.cityType === 'airfield'
    ? state.targeting ? 'Target' : ({ preparing: '20s', ready: 'Ready', outbound: 'Away', unloading: 'Unload',
      returning: 'Return', turnaround: '10s' })[state.planePhase ?? 'preparing']
    : state.cityType === 'defender' ? state.detail?.split(' · ')[0] || 'Shield · 10s'
      : state.cityType === 'watchtower' ? '4/s' : state.cityType === 'artillery' ? '3/s' : '✓';
  const status = state.targeting
    ? state.targeting === 'fly' ? 'Tap any other city to fly · Cancel or Escape to exit' : 'Choose a city for ground dispatch · Cancel or Escape to exit'
    : state.cityType === 'airfield' ? `${planeText}${state.detail ? ` · ${state.detail}` : ''}`
      : state.cityType === 'defender' ? state.detail || 'Shield capacity 3; recharges every 10 seconds.'
        : state.cityType === 'watchtower' ? 'Fires at hostile ground troops in range, up to 4 per second.'
          : state.cityType === 'artillery' ? 'Fires at enemy city garrisons in range, up to 3 shots per second; mountains block shots.' : '';
  return { types, reason, planeText, flyReason, currentText, status,
    flyDisabled: state.cityType !== 'airfield' || state.planePhase !== 'ready' || state.troops < 2 || !!state.targeting };
}
