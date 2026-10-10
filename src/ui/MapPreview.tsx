import { useMemo } from 'react';
import type { FieldMap } from '../board/maps';
import { createCityRegions } from '../board/regions/geometry';
import { factionPalette } from '../board/palette';
import { bridgeDecks } from '../game/river';
import { TERRITORY_RADIUS } from '../game/settings';

export function MapPreview({ map, index }: { map: FieldMap; index: number }) {
  const badgeRadius = Math.max(5, TERRITORY_RADIUS * 0.34);
  const badgeOffset = Math.max(TERRITORY_RADIUS * 0.9, TERRITORY_RADIUS / 2 + badgeRadius + 2);
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
    {map.terrain?.barriers.filter(b => b.kind === 'mountain').map(barrier => {
      const b = barrier.bounds, x = (b.minX + b.maxX) / 2, y = (b.minY + b.maxY) / 2;
      return <g key={barrier.id} aria-label="Mountain blocks direct orders and shots">
        <rect x={b.minX} y={b.minY} width={b.maxX - b.minX} height={b.maxY - b.minY} fill="#d5d8cd" stroke="#a8afa0" />
        <path d={`M${x - 7} ${y + 8}L${x} ${y - 9}L${x + 7} ${y + 8}`} fill="none" stroke="#9ca692" />
      </g>;
    })}
    {map.territories.flatMap(city => (city.features ?? []).filter(f => f.kind === 'artillery').map(feature =>
      <circle key={feature.id} aria-label="Artillery range" cx={city.x} cy={city.y} r={feature.range}
        fill="none" stroke={factionPalette(city.owner).stroke} strokeOpacity="0.4" strokeDasharray="3 5" />))}
    {map.territories.map(city => {
      const palette = factionPalette(city.owner);
      return <g key={city.id}>
        <circle cx={city.x} cy={city.y} r={TERRITORY_RADIUS} fill={palette.fill} stroke={palette.stroke} />
        <text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="central" fill={palette.ink} fontSize={TERRITORY_RADIUS} fontFamily="system-ui">{city.units}</text>
        {city.features?.some(feature => feature.kind === 'artillery') && <g aria-label="Artillery"
          transform={`translate(${city.x + badgeOffset} ${city.y - badgeOffset})`} opacity={city.owner === 'neutral' ? 0.45 : 1}>
          <circle r={badgeRadius} fill={palette.fill} stroke={palette.stroke} />
          <path transform={`scale(${badgeRadius / 5})`} d="M-3 1l5-3 1 1-5 3M-3 2h5M-1 2v1M2 2v1" fill="none" stroke={palette.ink} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>}
        {city.features?.some(feature => feature.kind === 'factory') && <g aria-label="Factory"
          transform={`translate(${city.x + badgeOffset} ${city.y - badgeOffset})`} opacity={city.owner === 'neutral' ? 0.45 : 1}>
          <circle r={badgeRadius} fill={palette.fill} stroke={palette.stroke} />
          <path transform={`scale(${badgeRadius / 7})`} d="M-4.5 4V-.5L-1.5-2.5V-.5L1.5-2.5V-.5H2.5V-4.5H4.5V4Z" fill={palette.ink} />
        </g>}
      </g>;
    })}
  </svg>;
}
