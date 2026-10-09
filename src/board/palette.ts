import type { Owner } from '../game/types';

export const PALETTE: Record<string, { fill: string; stroke: string; ink: string }> = {
  player: { fill: '#267c72', stroke: '#267c72', ink: '#ffffff' },
  enemy: { fill: '#bd624e', stroke: '#bd624e', ink: '#ffffff' },
  neutral: { fill: '#fcfcfa', stroke: '#bdc9ba', ink: '#404b46' },
};

const EXTRA_FACTION_COLORS = [
  { fill: '#7162a7', stroke: '#7162a7', ink: '#ffffff' },
  { fill: '#a67829', stroke: '#a67829', ink: '#ffffff' },
  { fill: '#3d7f9b', stroke: '#3d7f9b', ink: '#ffffff' },
];
export function factionPalette(id: string) {
  if (PALETTE[id]) return PALETTE[id];
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return EXTRA_FACTION_COLORS[hash % EXTRA_FACTION_COLORS.length];
}
