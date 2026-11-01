import type { CityTargetMode } from './city-controls-model';

/** Optional adapters; omitted options preserve legacy desktop/keyboard/drag behavior. */
export interface CityInputOptions {
  /** Includes owned cities with only one troop. Called on tap, never drag. */
  onOwnedCityTap?: (cityId: string, origin?: 'mouse' | 'touch' | 'pen' | 'keyboard') => void;
  /** Board water/outside or a non-owned city outside targeting. No default order follows. */
  onOutsideTap?: () => void;
  /** Read live state. While active, taps are routed exclusively to onTargetTap. */
  getTargetMode?: () => CityTargetMode | null;
  /** Parent validates source, distinct target, phase and command; callback does not imply success. */
  onTargetTap?: (cityId: string, mode: CityTargetMode) => void;
}
