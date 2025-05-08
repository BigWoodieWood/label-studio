/* Token bridge for the ScatterView layer ––– NO external design tokens */

import type { Color } from '@deck.gl/core';

/** Opacity value for category colors */
export const CATEGORY_COLORS_OPACITY = 0.75;

/** Base colors without opacity applied */
const BASE_CATEGORY_COLORS: Color[] = [
  [255, 107, 107, 255], // red (#ff6b6b)
  [72, 219, 251, 255],  // blue (#48dbfb)
  [254, 202, 87, 255],  // yellow (#feca57)
  [162, 155, 254, 255], // lavender (#a29bfe)
  [255, 127, 80, 255],  // coral (#ff7f50)
  [255, 105, 180, 255], // hotpink (#ff69b4)
  [186, 85, 211, 255],  // mediumorchid (#ba55d3)
  [60, 179, 113, 255],  // mediumseagreen (#3cb371)
  [0, 128, 128, 255],   // teal (#008080)
  [106, 90, 205, 255],  // slateblue (#6a5acd)
  [0, 255, 0, 255],     // lime (#00ff00)
  [0, 206, 209, 255],   // darkturquoise (#00ced1)
  [205, 133, 63, 255],  // peru (#cd853f)
];

/** Helper function to apply opacity to colors */
const applyOpacity = (colors: readonly Color[], opacity: number): Color[] => {
  return colors.map(color => [
    color[0],
    color[1],
    color[2],
    Math.round(255 * opacity)
  ]);
};

/** Ordered list of colours for categorical series with opacity applied */
export const CATEGORY_COLORS: Color[] = applyOpacity(BASE_CATEGORY_COLORS, CATEGORY_COLORS_OPACITY);

/** Stroke colour states */
export const STROKE: Record<'default'|'hovered'|'selected'|'active', Color> = {
  default: [156, 163, 175, 255], // gray-400 (#9ca3af)
  selected: [249, 115, 22, 255], // orange-500 (#f97316)
  hovered: [239, 68, 68, 255],   // red-500 (#ef4444)
  active: [255, 0, 0, 255],    // red-600 (#dc2626)
};

/** Geometry for points */
export const RADIUS = { 
    default: 3, 
    active_delta: 2,
    selected_delta: 1,
    hovered_delta: 1
} as const;

/** Stroke width states for points */
export const STROKE_WIDTH = { 
    default: 0, 
    hovered: 2, 
    selected: 1, 
    active: 2 
} as const;

/** Opacity for points */
export const OPACITY = 0.5; 

/** Tooltip style for points, deck.gl tooltip uses its own styles */
export const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(0,0,0,0.8)',
  color: 'white',
  padding: '4px 8px',
  fontSize: '14px',
  borderRadius: '6px',
  marginTop: '20px'
} as const; 

/** Selection rectangle colors */
export const SELECTION_RECT_FILL: [number, number, number, number] = [249, 115, 22, 40]; // Orange with transparency
export const SELECTION_RECT_STROKE: [number, number, number, number] = [249, 115, 22, 255]; // Solid orange 