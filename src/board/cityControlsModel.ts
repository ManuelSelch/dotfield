// Presentation contract only. The caller supplies authoritative costs/state and validates commands.
export type ControlCityType = 'production' | 'defender' | 'airfield';
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
export const CONTROL_CITY_LABELS = { production: 'Production', defender: 'Defender', airfield: 'Airfield' } as const;
export function cityControlsModel(state: CityControlsState) {
  const busy = state.cityType === 'airfield' && ['outbound', 'unloading', 'returning'].includes(state.planePhase ?? '');
  const reason = state.targeting ? 'Targeting active. Cancel before changing city type.'
    : busy ? 'Conversion unavailable while the plane is away. Ground orders still work.'
      : 'Instant conversion; leave 1 troop. No refund when switching.';
  const types = (Object.keys(CONTROL_CITY_LABELS) as ControlCityType[]).map(type => {
    const cost = state.costs[type], current = type === state.cityType;
    const unavailable = current ? 'Current · no charge' : busy || state.targeting ? reason
      : state.troops < cost + 1 ? `Need ${cost + 1} troops; leave 1 behind.` : '';
    return { type, label: CONTROL_CITY_LABELS[type], cost, current, disabled: !!unavailable, reason: unavailable };
  });
  const planeText = state.cityType !== 'airfield' ? state.cityType === 'production' ? 'Production · troop growth' : 'Defender · no troop growth'
    : ({ preparing: 'Preparing plane', ready: `Plane ready · capacity ${state.capacity}`,
      outbound: 'Plane away · ground available', unloading: 'Docked · unloading',
      returning: 'Returning empty', turnaround: 'Turnaround' })[state.planePhase ?? 'preparing'];
  const flyReason = state.planePhase !== 'ready' ? 'Plane must be ready.'
    : state.troops < 2 ? 'Need at least 2 troops; leave 1 behind.'
      : `Board ${Math.min(state.capacity, Math.max(0, state.troops - 1))} troops; leave at least 1 behind.`;
  const currentText = state.cityType === 'airfield'
    ? state.targeting ? 'Pick target' : ({ preparing: 'Preparing', ready: `Ready · ${state.capacity}`,
      outbound: 'Away', unloading: 'Unloading', returning: 'Returning', turnaround: 'Turnaround' })[state.planePhase ?? 'preparing']
    : state.cityType === 'defender' ? state.detail?.split(' · ')[0] || 'Shield · 10s' : 'Current';
  return { types, reason, planeText, flyReason, currentText,
    flyDisabled: state.cityType !== 'airfield' || state.planePhase !== 'ready' || state.troops < 2 || !!state.targeting,
    groundDisabled: state.troops < 2 || !!state.targeting };
}
