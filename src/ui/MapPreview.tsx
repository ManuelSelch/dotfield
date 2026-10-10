import { useMemo } from 'react';
import type { FieldMap } from '../board/maps';
import { createCityRegions } from '../board/regions/geometry';
import { factionPalette } from '../board/palette';
import { bridgeDecks } from '../game/river';

export function MapPreview({ map, index }: { map: FieldMap; index: number }) {
  const regions = useMemo(() => createCityRegions(map.territories, 360, 480, map.river), [map]);
  return <svg viewBox="0 0 360 480" role="img" aria-label={`Map ${index + 1} preview`}
    className="block h-full w-full rounded-[20px] bg-field" preserveAspectRatio="xMidYMid meet">
    {regions.map(region => {
      const city = map.territories.find(city => city.id === region.id)!;
      const fill = city.owner === 'neutral' ? '#edf0e7' : `color-mix(in srgb, ${factionPalette(city.owner).fill} 18%, white)`;
      const palette = factionPalette(city.owner);
      return <polygon key={region.id} points={region.points.map(point => `${point.x},${point.y}`).join(' ')}
        fill={fill} stroke="#d2dbce" strokeWidth="1" />;
    })}
    {map.river && <g aria-label="River with two paired bridge crossings">
      <rect x="0" y={map.river.top} width="360" height={map.river.bottom - map.river.top} fill="#c4d8db" />
      {bridgeDecks(map.river, map.territories).map(deck => <g key={deck.id}>
        <rect x={deck.x} y={deck.y} width={deck.width} height={deck.height} fill="#f0f0e4" stroke="#a9ae98" />
        <path d={`M${deck.x + 2} ${deck.y + 1}v${deck.height - 2}M${deck.x + deck.width - 2} ${deck.y + 1}v${deck.height - 2}`} stroke="#a4ac96" strokeWidth="1.3" />
      </g>)}
    </g>}
    {map.territories.map(city => {
      const palette = factionPalette(city.owner);
      return <g key={city.id}>
        <circle cx={city.x} cy={city.y} r="21" fill={palette.fill} stroke={palette.stroke} />
        <text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="central" fill={palette.ink} fontSize="17" fontFamily="system-ui">{city.units}</text>
      </g>;
    })}
  </svg>;
}
