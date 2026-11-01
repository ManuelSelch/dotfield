import { CAPTURE_SHIELD_FLASH_MS } from '@/game/features/capture-shield';
import { TERRITORY_RADIUS } from '@/game/settings';
import type { SimulationState, CaptureShieldState } from '@/game/types';

import { projectBoard } from './layout';
import { factionPalette } from './palette';

function flashAge(shield: CaptureShieldState, elapsedMs: number): number {
  return shield.blockedAt === undefined ? Infinity : elapsedMs - shield.blockedAt;
}
export function hasShieldFlash(state: SimulationState): boolean {
  return Object.values(state.captureShields).some((shield) => {
    const age = flashAge(shield, state.elapsedMs);
    return age >= 0 && age < CAPTURE_SHIELD_FLASH_MS;
  });
}

export function drawCaptureShields(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  width: number,
  height: number,
  reducedMotion = false,
) {
  for (const city of projectBoard(state.territories, width, height)) {
    const shield = state.captureShields[city.id];
    if (!shield || city.owner === 'neutral') continue;
    const age = flashAge(shield, state.elapsedMs);
    const flashing = !reducedMotion && age >= 0 && age < CAPTURE_SHIELD_FLASH_MS;
    const visible = flashing ? (shield.blockedFrom ?? shield.remaining) : shield.remaining;
    if (!visible) continue;
    const scale = city.radius / TERRITORY_RADIUS;
    const color = factionPalette(city.owner).stroke;
    ctx.save();
    ctx.lineCap = 'round';
    for (let slot = 0; slot < visible; slot++) {
      const consumed = slot >= shield.remaining;
      ctx.globalAlpha = consumed ? 1 - age / CAPTURE_SHIELD_FLASH_MS : 1;
      ctx.strokeStyle = consumed && age < 120 ? '#ffffff' : color;
      ctx.lineWidth = (consumed ? 2.6 + 2.4 * (1 - age / CAPTURE_SHIELD_FLASH_MS) : 2.6) * scale;
      ctx.beginPath();
      ctx.arc(
        city.x,
        city.y,
        city.radius + 6 * scale,
        ((-90 + slot * 120 + 12) * Math.PI) / 180,
        ((-90 + slot * 120 + 108) * Math.PI) / 180,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
}
