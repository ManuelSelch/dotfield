import { useMemo } from 'react';
import type { FieldMap } from '../board/maps';
import { createCityRegions } from '../board/regions/geometry';
import { PALETTE } from '../board/palette';

export function MapPreview({ map }: { map: FieldMap }) {
  const regions = useMemo(() => createCityRegions(map.territories, 360, 480), [map]);
  return <svg viewBox="0 0 360 480" role="img" aria-label={`${map.name} map preview`}
    className="block h-full w-full rounded-[20px] bg-field" preserveAspectRatio="xMidYMid meet">
    {regions.map(region => {
      const city = map.territories.find(city => city.id === region.id)!;
      const fill = city.owner === 'player' ? '#dce9df' : city.owner === 'enemy' ? '#f0e1d9' : '#edf0e7';
      return <polygon key={region.id} points={region.points.map(point => `${point.x},${point.y}`).join(' ')}
        fill={fill} stroke="#d2dbce" strokeWidth="1" />;
    })}
    {map.territories.map(city => <g key={city.id}>
      <circle cx={city.x} cy={city.y} r="21" fill={PALETTE[city.owner].fill} stroke={PALETTE[city.owner].stroke} />
      <text x={city.x} y={city.y} textAnchor="middle" dominantBaseline="central" fill={PALETTE[city.owner].ink} fontSize="17" fontFamily="system-ui">{city.units}</text>
    </g>)}
  </svg>;
}
