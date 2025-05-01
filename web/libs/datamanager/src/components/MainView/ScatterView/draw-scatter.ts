import type { DrawScatterOpts, TaskPoint } from "./types";

/**
 * Renders scatter plot points onto a canvas element.
 *
 * Draws points based on their x, y coordinates, category colors,
 * and highlights selected or hovered points.
 *
 * @param opts - Options for drawing the scatter plot.
 * @param opts.canvas - The HTMLCanvasElement to draw on.
 * @param opts.points - Array of TaskPoint objects to render.
 * @param opts.hoveredId - ID of the point currently hovered.
 * @param opts.selectedIds - Set of IDs of selected points.
 * @param opts.palette - Mapping from category name to color string.
 * @param opts.devicePixelRatio - Device pixel ratio for HiDPI rendering.
 */
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

  // Scale canvas for HiDPI displays
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);

  // Clear previous frame
  ctx.clearRect(0, 0, width, height);

  // Early out if no data
  if (points.length === 0) return;

  // Compute data bounds for scaling
  const xs = points.map((p) => p.data.x);
  const ys = points.map((p) => p.data.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Add padding around the plot area
  const pad = 20;

  // Scaling functions: map data coords to canvas coords
  // Invert Y-axis for standard canvas coordinates (0,0 at top-left)
  const scaleX = (v: number) => ((v - minX) / (maxX - minX || 1)) * (width - pad * 2) + pad;
  const scaleY = (v: number) => ((v - minY) / (maxY - minY || 1)) * (height - pad * 2) + pad;

  // --- Render Pass 1: Draw non-selected, non-hovered points --- 
  // This ensures highlights in Pass 2 appear on top.
  points.forEach((p: TaskPoint) => {
    const isSel = selectedIds.has(p.id);
    const isHover = hoveredId === p.id;
    if (isSel || isHover) return; // Skip highlighted points for now

    const cx = scaleX(p.data.x);
    const cy = height - scaleY(p.data.y); // Invert Y
    const category = p.data.category ?? "default";
    ctx.fillStyle = palette[category] ?? palette.default ?? "#3b82f6";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2); // Standard point size
    ctx.fill();
  });

  // --- Render Pass 2: Draw hovered & selected points --- 
  points.forEach((p: TaskPoint) => {
    const isSel = selectedIds.has(p.id);
    const isHover = hoveredId === p.id;
    if (!isSel && !isHover) return; // Only draw highlighted points

    const cx = scaleX(p.data.x);
    const cy = height - scaleY(p.data.y); // Invert Y
    const category = p.data.category ?? "default";
    const color = palette[category] ?? palette.default ?? "#3b82f6";

    // Draw white highlight circle for selected points
    if (isSel) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2); // Larger circle for selection
      ctx.stroke();
    }

    // Draw the point itself (larger if hovered)
    ctx.fillStyle = isHover ? "#fff" : color; // White fill when hovered
    ctx.beginPath();
    ctx.arc(cx, cy, isHover ? 6 : 5, 0, Math.PI * 2); // Slightly larger when hovered
    ctx.fill();

    // Draw colored border when hovered
    if (isHover) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}; 