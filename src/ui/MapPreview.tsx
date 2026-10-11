import { useMemo } from 'react';
import type { FieldMap } from '../board/maps';
import { createCityRegions } from '../board/regions/geometry';
import { factionPalette } from '../board/palette';
import { bridgeDecks } from '../game/river';
import { TERRITORY_RADIUS } from '../game/settings';

export function MapPreview({ map, index }: { map: FieldMap; index?: number }) {
  const badgeRadius = Math.max(5, TERRITORY_RADIUS * 0.34);
  const badgeOffset = Math.max(TERRITORY_RADIUS * 0.9, TERRITORY_RADIUS / 2 + badgeRadius + 2);
  const regions = useMemo(() => createCityRegions(map.territories, 360, 480, map.river), [map]);
  return <svg viewBox="0 0 360 480" role="img" aria-label={index === undefined ? 'Generated map preview' : `Map ${index + 1} preview`}
    className="block h-full w-full rounded-[20px] bg-field" preserveAspectRatio="xMidYMid meet">
    {regions.map(region => {
      const city = map.territories.find(city => city.id === region.id)!;
      const fill = city.owner === 'neutral' ? '#edf0e7' : `color-mix(in srgb, ${factionPalette(city.owner).fill} 18%, white)`;
      return <polygon key={region.id} points={region.points.map(point => `${point.x},${point.y}`).join(' ')}
        fill={fill} stroke="#d2dbce" strokeWidth="1" />;
    })}
    {map.river && <g aria-label="River with two paired bridge crossings">
      <rect x="0" y={map.river.top} width="360" height={map.river.bottom - map.river.top} fill="#c4d8db" />
      {bridgeDecks(map.river, map.territories).map(deck => <g key={deck.id}>
        <rect x={deck.x} y={deck.y} width={deck.width} height={deck.height} rx="3" fill="#ddd8bf" stroke="#87988a" />
        <path d={`M${deck.x + deck.width / 2 - 12} ${deck.y + 1}v${deck.height - 2}M${deck.x + deck.width / 2 + 12} ${deck.y + 1}v${deck.height - 2}`} stroke="#9aa38d" strokeWidth="1.3" />
      </g>)}
    </g>}
    {map.terrain?.barriers.filter(b => b.kind === 'mountain').map(barrier => {
      const b = barrier.bounds;
      return <g key={barrier.id} aria-label="Mountain blocks direct orders and shots">
        {(() => {
          const width = b.maxX - b.minX, height = b.maxY - b.minY;
          return <>
            <rect x={b.minX} y={b.minY} width={width} height={height} fill="#d5d8cd" stroke="#a8afa0" />
            <path d={`M${b.minX + width * .04} ${b.minY + height * .78}L${b.minX + width * .2} ${b.minY + height * .46}L${b.minX + width * .34} ${b.minY + height * .62}L${b.minX + width * .53} ${b.minY + height * .16}L${b.minX + width * .71} ${b.minY + height * .57}L${b.minX + width * .86} ${b.minY + height * .31}L${b.minX + width * .96} ${b.minY + height * .76}L${b.minX + width * .96} ${b.minY + height * .9}L${b.minX + width * .04} ${b.minY + height * .9}Z`} fill="#c3c9bb" stroke="#a8afa0" />
            <path d={`M${b.minX + width * .44} ${b.minY + height * .37}L${b.minX + width * .53} ${b.minY + height * .16}L${b.minX + width * .62} ${b.minY + height * .37}L${b.minX + width * .55} ${b.minY + height * .32}L${b.minX + width * .51} ${b.minY + height * .37}Z M${b.minX + width * .79} ${b.minY + height * .43}L${b.minX + width * .86} ${b.minY + height * .31}L${b.minX + width * .92} ${b.minY + height * .48}L${b.minX + width * .87} ${b.minY + height * .44}L${b.minX + width * .83} ${b.minY + height * .47}Z`} fill="#eef0e8" stroke="#a8afa0" />
          </>;
        })()}
      </g>;
    })}
    {map.territories.flatMap(city => (city.features ?? []).flatMap(feature => {
      if (feature.kind === 'artillery' || feature.kind === 'watchtower' || feature.kind === 'slow-zone') {
        const radius = feature.kind === 'slow-zone' ? feature.radius : feature.range;
        const label = feature.kind === 'slow-zone' ? 'Slow Zone coverage' : feature.kind === 'watchtower' ? 'Watchtower coverage' : 'Artillery range';
        return <circle key={feature.id} aria-label={label} cx={city.x} cy={city.y} r={radius}
          fill="none" stroke={factionPalette(city.owner).stroke} strokeOpacity="0.4" strokeDasharray="3 5" />;
      }
      return [];
    }))}
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
        {city.features?.some(feature => feature.kind === 'watchtower') && <g aria-label="Watchtower"
          transform={`translate(${city.x + badgeOffset} ${city.y + badgeOffset})`} opacity={city.owner === 'neutral' ? 0.45 : 1}>
          <circle r={badgeRadius} fill={palette.fill} stroke={palette.stroke} />
          <path transform={`scale(${badgeRadius / 7})`} d="M-4.5 4L-3-1H3L4.5 4ZM0-1V-6M-2-4.5H2" fill="none" stroke={palette.ink} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>}
        {city.features?.some(feature => feature.kind === 'slow-zone') && <g aria-label="Slow Zone"
          transform={`translate(${city.x - badgeOffset} ${city.y + badgeOffset})`}>
          <circle r={badgeRadius} fill={palette.fill} stroke={palette.stroke} />
          <path transform={`scale(${badgeRadius / 7})`} d="M-3.5-4H3.5L-3.5 4H3.5" fill="none" stroke={palette.ink} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>}
      </g>;
    })}
  </svg>;
}
