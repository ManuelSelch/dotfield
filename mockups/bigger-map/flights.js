// Fake local preview only: no growth, opponent AI or traveling-dot combat.
const smooth = t => t * t * (3 - 2 * t);
const clamp = t => Math.max(0, Math.min(1, t));

export function makeOrder(source, target, now) {
  const units = source.units - 1;
  const duration = Math.max(1, (Math.hypot(target.x - source.x, target.y - source.y) - 42) / 35 * 1000);
  const groups = [];
  for (let sent = 0; sent < units; sent += 5) {
    groups.push({ sourceId: source.id, targetId: target.id, owner: source.owner,
      units: Math.min(5, units - sent), launch: now + groups.length * 600, duration, launched: false });
  }
  return groups;
}

export function advanceFlights(groups, nodes, now) {
  return groups.filter(group => {
    const source = nodes.find(node => node.id === group.sourceId);
    if (now < group.launch) return source.owner === group.owner;
    if (!group.launched) {
      if (source.owner !== group.owner) return false;
      group.units = Math.min(group.units, Math.max(0, source.units - 1));
      source.units -= group.units;
      group.launched = true;
    }
    if (group.units === 0) return false;
    if (now - group.launch < group.duration) return true;
    const target = nodes.find(node => node.id === group.targetId);
    if (target.owner === group.owner) target.units += group.units;
    else if (group.units <= target.units) target.units -= group.units;
    else { target.owner = group.owner; target.units = group.units - target.units; }
    return false;
  });
}

export function flightDots(groups, field, now, reducedMotion) {
  return groups.filter(group => group.launched).flatMap(group => {
    const source = field.cities.find(city => city.id === group.sourceId);
    const target = field.cities.find(city => city.id === group.targetId);
    const dx = target.x - source.x, dy = target.y - source.y;
    const distance = Math.hypot(dx, dy) || 1;
    const ux = dx / distance, uy = dy / distance;
    const progress = clamp((now - group.launch) / group.duration);
    const spread = reducedMotion ? 0 : smooth(clamp(progress / 0.3)) * (1 - smooth(clamp((progress - 0.8) / 0.2)));
    const x = source.x + ux * source.radius + ux * (distance - source.radius - target.radius) * progress;
    const y = source.y + uy * source.radius + uy * (distance - source.radius - target.radius) * progress;
    return Array.from({ length: group.units }, (_, slot) => {
      const offset = (slot - (group.units - 1) / 2) * 12 * field.scale * spread;
      return { x: x - uy * offset, y: y + ux * offset, radius: 4.8 * field.scale, owner: group.owner };
    });
  });
}
