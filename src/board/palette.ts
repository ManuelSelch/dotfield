import type { Owner } from '../game/types';

export const PALETTE: Record<Owner, { fill: string; stroke: string; ink: string }> = {
  player: { fill: '#267c72', stroke: '#267c72', ink: '#ffffff' },
  enemy: { fill: '#bd624e', stroke: '#bd624e', ink: '#ffffff' },
  neutral: { fill: '#fcfcfa', stroke: '#bdc9ba', ink: '#404b46' },
};
