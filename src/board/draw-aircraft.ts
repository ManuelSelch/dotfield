import { AIR_DELIVERY_FEEDBACK_MS, TERRITORY_RADIUS } from '@/game/settings';
import type { Aircraft, SimulationState } from '@/game/types';

import { fieldTransform, screenPoint } from './layout';
import { factionPalette } from './palette';

/** Rendering never advances flight or delivery; all positions/events are committed by simulation. */
export function aircraftGeometry(plane: Aircraft, width: number, height: number) {
  return {
    ...screenPoint(plane.position, width, height),
    angle: Math.atan2(plane.to.y - plane.from.y, plane.to.x - plane.from.x),
    scale: Math.max(0.65, fieldTransform(width, height).scale),
  };
}

export function hasAircraftAnimation(state: SimulationState): boolean {
  return (
    Object.values(state.aircraft ?? {}).some((p) => p.phase !== 'ready') ||
    (state.airDeliveries ?? []).some(
      (e) => state.elapsedMs >= e.atMs && state.elapsedMs - e.atMs < AIR_DELIVERY_FEEDBACK_MS,
    )
  );
}

/** Compact right-facing top-down silhouette; callers supply palette and transform. */
export function drawAirplaneIcon(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(-7, -3);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-7, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(-4, -9);
  ctx.lineTo(-6, -9);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-6, 9);
  ctx.lineTo(-4, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawAircraft(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  width: number,
  height: number,
  reducedMotion = false,
) {
  const { scale } = fieldTransform(width, height);
  function label(text: string, x: number, y: number, ink: string) {
    ctx.fillStyle = ink;
    ctx.font = `600 ${Math.max(10, 10 * scale)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Keep cargo/readiness readable at the field edges as well as on compact boards.
    const margin = Math.min(width / 2, Math.max(22, text.length * 3.2));
    ctx.fillText(
      text,
      Math.max(margin, Math.min(width - margin, x)),
      Math.max(7, Math.min(height - 7, y)),
    );
  }
  for (const plane of Object.values(state.aircraft ?? {})) {
    const palette = factionPalette(plane.owner);
    ctx.save();
    if (plane.phase === 'preparing' || plane.phase === 'ready' || plane.phase === 'turnaround') {
      const city = state.territories.find((c) => c.id === plane.homeId);
      if (city) {
        const p = screenPoint(city, width, height);
        const seconds = Math.ceil(Math.max(0, plane.durationMs - plane.elapsedMs) / 1000);
        label(
          plane.phase === 'ready'
            ? 'ready'
            : `${plane.phase === 'preparing' ? 'prep' : 'turn'} ${seconds}s`,
          p.x,
          p.y + TERRITORY_RADIUS * scale + 19,
          palette.fill,
        );
      }
    } else {
      const p = aircraftGeometry(plane, width, height);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.scale(p.scale, p.scale);
      ctx.fillStyle = palette.fill;
      ctx.strokeStyle = '#fcfcf8';
      ctx.lineWidth = 1.1;
      drawAirplaneIcon(ctx);
      ctx.restore();
      label(plane.cargo > 0 ? String(plane.cargo) : 'empty', p.x, p.y - 22 * p.scale, palette.fill);
    }
    ctx.restore();
  }
  // Only actual combat events pulse. Never predict a delivery from plane age/cargo.
  // Cadence is 200ms: show the newest committed pulse per target to avoid concentric clutter.
  const latest = new Map<string, NonNullable<SimulationState['airDeliveries']>[number]>();
  for (const event of state.airDeliveries ?? []) {
    const age = state.elapsedMs - event.atMs;
    if (age < 0 || age >= AIR_DELIVERY_FEEDBACK_MS) continue;
    if (!latest.has(event.targetId) || latest.get(event.targetId)!.atMs <= event.atMs)
      latest.set(event.targetId, event);
  }
  for (const event of latest.values()) {
    const city = state.territories.find((c) => c.id === event.targetId);
    if (!city) continue;
    const p = screenPoint(city, width, height),
      age = state.elapsedMs - event.atMs;
    const ink = factionPalette(event.result === 'blocked' ? city.owner : event.owner).fill;
    ctx.save();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 1 - age / AIR_DELIVERY_FEEDBACK_MS;
    ctx.beginPath();
    ctx.arc(
      p.x,
      p.y,
      (TERRITORY_RADIUS + 3 + (reducedMotion ? 0 : Math.min(age / 200, 1) * 5)) * scale,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    const text =
      event.result === 'blocked'
        ? `blocked ${event.units}`
        : event.result === 'reinforced' || event.result === 'captured'
          ? `+${event.units}`
          : `−${event.units}`;
    label(text, p.x, p.y + 32 * scale, ink);
    ctx.restore();
  }
}
