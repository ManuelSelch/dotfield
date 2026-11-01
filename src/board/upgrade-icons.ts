// Small vector badge shapes in local coordinates. Defensive Network uses the Tabler Shield path.
export function drawFactoryIcon(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-4.5, 4);
  for (const [x, y] of [
    [-4.5, -0.5],
    [-1.5, -2.5],
    [-1.5, -0.5],
    [1.5, -2.5],
    [1.5, -0.5],
    [2.5, -0.5],
    [2.5, -4.5],
    [4.5, -4.5],
    [4.5, 4],
  ])
    ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
}

export function drawWatchtowerIcon(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-4.5, 4);
  ctx.lineTo(4.5, 4);
  ctx.lineTo(3, -1);
  ctx.lineTo(-3, -1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(0, -6);
  ctx.moveTo(-2, -4.5);
  ctx.lineTo(2, -4.5);
  ctx.stroke();
}

export function drawSlowZoneIcon(ctx: CanvasRenderingContext2D) {
  // Hourglass: time lost in the zone, distinct from production/tower symbols.
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-3.5, -4);
  ctx.lineTo(3.5, -4);
  ctx.lineTo(-3.5, 4);
  ctx.lineTo(3.5, 4);
  ctx.lineTo(-3.5, -4);
  ctx.stroke();
}

export function drawArtilleryIcon(ctx: CanvasRenderingContext2D) {
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-4.2, 1.4);
  ctx.lineTo(2.8, -2.8);
  ctx.lineTo(4.2, -1.4);
  ctx.lineTo(-2.8, 2.8);
  ctx.moveTo(-4.2, 2.8);
  ctx.lineTo(2.8, 2.8);
  ctx.moveTo(-1.4, 2.8);
  ctx.lineTo(-1.4, 4.2);
  ctx.moveTo(2.8, 2.8);
  ctx.lineTo(2.8, 4.2);
  ctx.stroke();
}

// Tabler IconShield SVG path (MIT), copied from @tabler/icons-react for Canvas rendering.
const TABLER_SHIELD_PATH =
  'M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1 -8.5 15a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3';
let tablerShield: Path2D | null | undefined;

export function drawDefenseShieldIcon(
  ctx: CanvasRenderingContext2D,
  tier: 0 | 1 | 2 | 3,
  numberColor: string,
) {
  if (tablerShield === undefined)
    tablerShield = typeof Path2D === 'undefined' ? null : new Path2D(TABLER_SHIELD_PATH);
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  if (tablerShield) {
    ctx.fill(tablerShield);
    ctx.stroke(tablerShield);
  } else {
    // Canvas-path fallback for test/non-DOM contexts; same single Tabler shield silhouette.
    ctx.beginPath();
    ctx.moveTo(12, 3);
    ctx.bezierCurveTo(15.5, 5.4, 18.4, 6, 20.5, 6);
    ctx.bezierCurveTo(21.5, 13.3, 17.2, 18.9, 12, 21);
    ctx.bezierCurveTo(6.8, 18.9, 2.5, 13.3, 3.5, 6);
    ctx.bezierCurveTo(5.6, 6, 8.5, 5.4, 12, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = numberColor;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(tier), 12, 13);
}

export function drawChevronIcon(ctx: CanvasRenderingContext2D, level: 1 | 2 = 1) {
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const offset of level === 2 ? [-1.5, 1.5] : [0]) {
    ctx.moveTo(-3.5, offset + 1.5);
    ctx.lineTo(0, offset - 2);
    ctx.lineTo(3.5, offset + 1.5);
  }
  ctx.stroke();
}
