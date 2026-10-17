// Deterministic visual density study only; the production generator is untouched.
export function withCityCount(layout, count) {
  if (count === 'base') return layout;
  const cities = layout.cities.map(city => ({ ...city }));
  const relay = cities.find(city => city.id === 'relay');
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clear = point => {
    if (point.y > layout.river[0] - 29 && point.y < layout.river[1] + 29) return false;
    if (Math.abs(point.x - relay.x) < 43 && point.y > relay.y - 65 && point.y < relay.y + 40) return false;
    for (const [left, top, right, bottom] of layout.mountains) {
      const dx = Math.max(left - point.x, 0, point.x - right);
      const dy = Math.max(top - point.y, 0, point.y - bottom);
      if (Math.hypot(dx, dy) < 26) return false;
    }
    for (const city of cities) {
      if (distance(point, city) < 48) return false;
      if (city.factory && Math.abs(point.x - city.x) < 28 && point.y > city.y - 55 && point.y < city.y) return false;
    }
    return true;
  };
  const score = point => Math.min(...cities.map(city => distance(point, city)));
  function choose(paired) {
    let best = null;
    for (let y = 35; y <= 585; y += 10) {
      for (let x = paired ? 30 : 210; x <= (paired ? 180 : 210); x += 10) {
        const a = { x, y }, b = { x: 420 - x, y };
        if (!clear(a) || (paired && (!clear(b) || distance(a, b) < 48))) continue;
        const value = paired ? Math.min(score(a), score(b)) : score(a);
        if (!best || value > best.value) best = { a, b, value };
      }
    }
    if (!best) throw new Error(`No room for ${count} cities in layout ${layout.id}`);
    return paired ? [best.a, best.b] : [best.a];
  }
  while (cities.length < count) {
    const paired = (count - cities.length) % 2 === 0;
    for (const point of choose(paired)) cities.push({ ...point, id: `extra-${cities.length}`, owner: 'neutral', factory: false });
  }
  return { ...layout, cities };
}
