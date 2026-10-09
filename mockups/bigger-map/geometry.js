// Disposable Voronoi prototype: clip each city cell against every other city.
function clip(polygon, city, other) {
  const dx = other.x - city.x;
  const dy = other.y - city.y;
  const limit = (other.x ** 2 + other.y ** 2 - city.x ** 2 - city.y ** 2) / 2;
  const side = point => dx * point.x + dy * point.y - limit;
  const output = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[(i + polygon.length - 1) % polygon.length];
    const b = polygon[i];
    const da = side(a), db = side(b);
    const aInside = da <= 1e-7, bInside = db <= 1e-7;
    if (aInside !== bInside) {
      const t = da / (da - db);
      output.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    if (bInside) output.push(b);
  }
  return output;
}

export function layout(nodes, width, height) {
  const scale = Math.min(width / 360, height / 480);
  const cities = nodes.map(node => ({ ...node,
    x: (width - 360 * scale) / 2 + node.x * scale,
    y: (height - 480 * scale) / 2 + node.y * scale,
    radius: 21 * scale,
  }));
  const cells = cities.map(city => {
    let polygon = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
    for (const other of cities) if (other.id !== city.id) polygon = clip(polygon, city, other);
    return polygon;
  });
  return { cities, cells, scale, width, height };
}

export function nearestCity(point, field) {
  if (point.x < 0 || point.y < 0 || point.x > field.width || point.y > field.height) return null;
  return field.cities.reduce((best, city) => {
    const distance = Math.hypot(city.x - point.x, city.y - point.y);
    return !best || distance < best.distance ? { id: city.id, distance } : best;
  }, null)?.id ?? null;
}
