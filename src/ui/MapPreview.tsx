import { useMemo } from 'react';
import type { FieldMap } from '../board/maps';
import { createCityRegions } from '../board/regions/geometry';
import { factionPalette } from '../board/palette';

export function MapPreview({ map, index }: { map: FieldMap; index: number }) {
  const regions = useMemo(() => createCityRegions(map.territories, 360, 480), [map]);
  return <svg viewBox="0 0 360 480" role="img" aria-label={`Map ${index + 1} preview`}
    className="block h-full w-full rounded-[20px] bg-field" preserveAspectRatio="xMidYMid meet">
    {regions.map(region => {
      const city = map.territories.find(city => city.id === region.id)!;
      const fill = city.owner === 'neutral' ? '#edf0e7' : `color-mix(in srgb, ${factionPalette(city.owner).fill} 18%, white)`;
      const palette = factionPalette(city.owner);
      return <polygon key={region.id} points={region.points.map(point => `${point.x},${point.y}`).join(' ')}
        fill={fill} stroke="#d2dbce" strokeWidth="1" />;
    })}
    {map.territories.map(city => {
      const palette = factionPalette(city.owner);
      return <g key={city.id}>
        <circle cx={city.x} cy={city.y} r="21" fill={palette.fill} stroke={palette.stroke} />
        <text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="central" fill={palette.ink} fontSize="17" fontFamily="system-ui">{city.units}</text>
      </g>;
    })}
  </svg>;
}
