// Static review data only; production continues to use src/board/maps.ts.
const city = (x, y, units, owner = 'neutral') => ({ x, y, units, owner });
const north = city(180, 40, 36, 'enemy');
const south = city(180, 440, 36, 'player');
const meadow = [north, city(65,100,8), city(295,100,12), city(115,170,10), city(245,170,10), city(40,240,8), city(180,240,20), city(320,240,8), city(115,310,10), city(245,310,10), city(65,380,12), city(295,380,8), south];
const forks = [north, city(70,110,8), city(290,110,8), city(95,210,12), city(265,210,12), city(180,240,20), city(95,270,12), city(265,270,12), city(70,370,8), city(290,370,8), south];
const ridge = [city(70,40,36,'enemy'), city(250,90,10), city(80,150,8), city(260,190,12), city(180,240,20), city(100,290,12), city(280,330,8), city(110,390,10), city(290,440,36,'player')];
const dense = [north, ...[70,180,290].map((x,i) => city(x,100,[8,12,8][i])), ...[45,110,180,250,315].map((x,i) => city(x,170,[10,12,14,12,10][i])), ...[70,180,290].map((x,i) => city(x,240,[10,20,10][i])), ...[45,110,180,250,315].map((x,i) => city(x,310,[10,12,14,12,10][i])), ...[70,180,290].map((x,i) => city(x,380,[8,12,8][i])), south];
const crossfire = [city(180,40,12), ...dense.slice(1), city(70,40,30,'enemy'), city(290,40,30,'enemy-2')];
export const maps = [meadow, forks, ridge, dense, crossfire].map(nodes => nodes.map((node,i) => ({ ...node, id: `city-${i}` })));
