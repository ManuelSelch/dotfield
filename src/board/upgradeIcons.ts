// Small vector shapes in badge-local coordinates; no font or icon dependency.
export function drawFactoryIcon(ctx: CanvasRenderingContext2D) {
  ctx.beginPath(); ctx.moveTo(-4.5, 4);
  for (const [x, y] of [[-4.5, -0.5], [-1.5, -2.5], [-1.5, -0.5],
    [1.5, -2.5], [1.5, -0.5], [2.5, -0.5], [2.5, -4.5], [4.5, -4.5], [4.5, 4]]) ctx.lineTo(x, y);
  ctx.closePath(); ctx.fill();
}

export function drawChevronIcon(ctx: CanvasRenderingContext2D, level: 1 | 2 = 1) {
  ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const offset of level === 2 ? [-1.5, 1.5] : [0]) {
    ctx.moveTo(-3.5, offset + 1.5); ctx.lineTo(0, offset - 2); ctx.lineTo(3.5, offset + 1.5);
  }
  ctx.stroke();
}
