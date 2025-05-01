import type { DrawScatterOpts } from "./types";

export const drawScatter = ({
  canvas,
  points,
  hoveredId,
  selectedIds = new Set<string>(),
  palette,
  devicePixelRatio = window.devicePixelRatio || 1,
}: DrawScatterOpts) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  ctx.clearRect(0, 0, width, height);

  // Early out
  if (points.length === 0) return;

  // Compute data bounds
  const xs = points.map(p => p.data.x);
  const ys = points.map(p => p.data.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const pad = 20;
  const scaleX = (v: number) => ((v - minX) / (maxX - minX || 1)) * (width - pad * 2) + pad;
  const scaleY = (v: number) => ((v - minY) / (maxY - minY || 1)) * (height - pad * 2) + pad;

  // First pass: non-selected, non-hovered
  points.forEach(p => {
    const isSel = selectedIds.has(p.id);
    const isHover = hoveredId === p.id;
    if (isSel || isHover) return;

    const cx = scaleX(p.data.x);
    const cy = height - scaleY(p.data.y);
    ctx.fillStyle = palette[p.data.category ?? "default"] ?? palette.default ?? "#3b82f6";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  // Second pass: hovered & selected
  points.forEach(p => {
    const isSel = selectedIds.has(p.id);
    const isHover = hoveredId === p.id;
    if (!isSel && !isHover) return;

    const cx = scaleX(p.data.x);
    const cy = height - scaleY(p.data.y);

    if (isSel) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = isHover ? "#fff" : palette[p.data.category ?? "default"] ?? palette.default ?? "#3b82f6";
    ctx.beginPath();
    ctx.arc(cx, cy, isHover ? 6 : 5, 0, Math.PI * 2);
    ctx.fill();

    if (isHover) {
      ctx.strokeStyle = palette[p.data.category ?? "default"] ?? palette.default ?? "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}; 