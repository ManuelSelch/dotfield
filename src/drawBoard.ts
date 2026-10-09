import { projectBoard } from './board';
import type { Owner } from './board';

const PALETTE: Record<Owner, { fill: string; stroke: string; ink: string }> = {
  player: { fill: '#267c72', stroke: '#267c72', ink: '#ffffff' },
  enemy: { fill: '#bd624e', stroke: '#bd624e', ink: '#ffffff' },
  neutral: { fill: '#fcfcfa', stroke: '#cdd3ca', ink: '#404b46' },
};

export function drawBoard(canvas: HTMLCanvasElement, width: number, height: number, pixelRatio: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx || width <= 0 || height <= 0) return;

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Quiet texture; all geometry remains in CSS pixels on Retina screens.
  ctx.fillStyle = '#dde2d8';
  for (let x = 12; x < width; x += 24) {
    for (let y = 12; y < height; y += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const node of projectBoard(width, height)) {
    const palette = PALETTE[node.owner];

    if (node.owner !== 'neutral') {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
      ctx.strokeStyle = palette.stroke;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    ctx.fillStyle = palette.fill;
    ctx.fill();
    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = palette.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${node.fontSize}px system-ui, sans-serif`;
    ctx.fillText(String(node.units), node.x, node.y - 2);

    // Different shapes distinguish factions without colour alone.
    const markerY = node.y + node.radius * 0.56;
    if (node.owner === 'enemy') {
      ctx.fillRect(node.x - 2, markerY - 2, 4, 4);
    } else if (node.owner === 'player') {
      ctx.beginPath();
      ctx.arc(node.x, markerY, 2.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(node.x - 3, markerY - 0.7, 6, 1.4);
    }
  }
}
