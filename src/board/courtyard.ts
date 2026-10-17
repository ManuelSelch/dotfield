import type { Territory } from '../game/types';
import type { Terrain } from '../game/terrain/types';
import { createTerrain } from '../game/terrain/terrain';
import { createRiver } from '../game/river';

/** A bounded recipe, not random obstacle scattering. Logical field stays 360×480. */
export function courtyardGeometry(count: number, random: () => number) {
  const scaleX = 0.94 + random() * 0.06, scaleY = 0.94 + random() * 0.06;
  const x = (value: number) => 180 + (value * 360 / 420 - 180) * scaleX;
  const y = (value: number) => 240 + (value * 480 / 620 - 240) * scaleY;
  const city = (id: string, px: number, py: number, owner = 'neutral'): Territory => ({
    id, x: x(px), y: y(py), owner, units: owner === 'neutral' ? 10 : 36,
  });
  const territories = [
    city('home-player', 65, 575, 'player'), city('home-enemy', 355, 575, 'enemy'),
    city('supply-west', 80, 495), city('supply-east', 340, 495),
    city('bridge-south-west', 65, 445), city('bridge-south-east', 355, 445),
    city('bridge-north-west', 65, 355), city('bridge-north-east', 355, 355),
    city('entrance-south', 210, 345), city('courtyard', 210, 245), city('entrance-north', 210, 130),
    city('valley-west', 65, 235), city('valley-east', 355, 235),
    city('economy-west', 75, 85), city('economy-east', 345, 85),
  ];
  // Every option retains all strategic anchors. Symmetric pairs preserve equal approach distances.
  const pairs = [[160, 445], [150, 555], [30, 155], [130, 145], [130, 35], [140, 335], [30, 295]];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  if (count % 2 === 0) territories.push(city('upper-link', 210, 35));
  for (const [px, py] of pairs.slice(0, (count - territories.length) / 2)) {
    territories.push(city(`expansion-${px}-${py}-west`, px, py), city(`expansion-${px}-${py}-east`, 420 - px, py));
  }
  const mountains = [[115, 180, 165, 300], [255, 180, 305, 300], [185, 465, 235, 610]];
  const terrain: Terrain = createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 }, crossings: [],
    barriers: mountains.map(([left, top, right, bottom], i) => ({ id: `courtyard-ridge-${i + 1}`, kind: 'mountain',
      bounds: { minX: x(left), minY: y(top), maxX: x(right), maxY: y(bottom) } })) });
  const river = createRiver({ top: y(386), bottom: y(414), bridges: ['west', 'east'].map(side => ({
    id: `bridge-${side}`, northId: `bridge-north-${side}`, southId: `bridge-south-${side}`, width: 64,
  })) }, territories);
  return { territories, terrain, river };
}
