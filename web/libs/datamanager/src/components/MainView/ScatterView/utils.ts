/* ──────────────────────────────────────────────────────────────────
 * Color helpers
 * ----------------------------------------------------------------*/

/**
 * Convert any CSS colour (name, #hex, rgb/rgba, hsl…) into
 * a deck.gl-friendly [r, g, b, a] tuple.
 */
export function colorToRgba(
  color: string,
  alpha = 255,
): [number, number, number, number] {
  // Resolve colour via a <canvas> to support named colours.
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = color;
  const computed = ctx.fillStyle; // always rgb(a) after assignment

  const rgbMatch = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!rgbMatch) return [128, 128, 128, alpha]; // fallback gray

  const [, r, g, b] = rgbMatch.map(Number);
  return [r, g, b, alpha];
}

/**
 * Convert a CSS custom prop (`var(--color-x)`) or hex string (`#rrggbb`)
 * into a deck.gl friendly `[r, g, b, a]` tuple.
 */
export function cssVarToRgba(
  color: unknown,
  alpha = 255,
): [number, number, number, number] {
  // Default fallback color if input is invalid
  if (!color || typeof color !== 'string') {
    console.warn('Invalid color value passed to cssVarToRgba:', color);
    return [128, 128, 128, alpha]; // Gray fallback
  }

  const resolved = color.startsWith("var(")
    ? getComputedStyle(document.documentElement)
        .getPropertyValue(color.slice(4, -1).trim())
        .trim()
    : color;

  const hex = resolved.startsWith("#") ? resolved : rgbToHex(resolved);
  const num = parseInt(hex.replace("#", ""), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, alpha];
}

/** rgb()/rgba() → #rrggbb helper (very tolerant) */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/(\d+)\D+(\d+)\D+(\d+)/);
  if (!m) return "#000000";
  const [, r, g, b] = m.map(Number);
  return (
    "#" +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
  );
}

/* ──────────────────────────────────────────────────────────────────
 * Geometry helpers
 * ----------------------------------------------------------------*/

/**
 * Position type for 3D coordinates used in deck.gl layers
 */
export type PositionType = [number, number, number];