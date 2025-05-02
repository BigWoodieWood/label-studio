/* Token bridge for the ScatterView layer ––– NO external design tokens */

import type { Color } from '@deck.gl/core';

/** Ordered list of colours for categorical series. */
export const CATEGORY_COLORS: Color[] = [
  [255, 107, 107, 255], // red (#ff6b6b)
  [72, 219, 251, 255],  // blue (#48dbfb)
  [254, 202, 87, 255],  // yellow (#feca57)
  [29, 209, 161, 255],  // green (#1dd1a1)
  [162, 155, 254, 255], // lavender (#a29bfe)
  [255, 127, 80, 255],  // coral (#ff7f50)
  [255, 105, 180, 255], // hotpink (#ff69b4)
  [186, 85, 211, 255],  // mediumorchid (#ba55d3)
  [60, 179, 113, 255],  // mediumseagreen (#3cb371)
  [255, 140, 0, 255],   // darkorange (#ff8c00)
  [0, 128, 128, 255],   // teal (#008080)
  [255, 215, 0, 255],   // gold (#ffd700)
  [106, 90, 205, 255],  // slateblue (#6a5acd)
  [0, 255, 0, 255],     // lime (#00ff00)
  [0, 206, 209, 255],   // darkturquoise (#00ced1)
  [205, 133, 63, 255],  // peru (#cd853f)
];

/** Stroke colour states */
export const STROKE: Record<'default'|'hovered'|'selected'|'active', Color> = {
  default: [156, 163, 175, 255], // gray-400 (#9ca3af)
  selected: [249, 115, 22, 255], // orange-500 (#f97316)
  hovered: [239, 68, 68, 255],   // red-500 (#ef4444)
  active: [220, 38, 38, 255],    // red-600 (#dc2626)
};

/** Geometry for points */
export const RADIUS = { 
    default: 5, 
    delta: 2 
} as const;

/** Stroke width states for points */
export const STROKE_WIDTH = { 
    default: 1, 
    hovered: 4, 
    selected: 3, 
    active: 5 
} as const;

/** Opacity for points */
export const OPACITY = 0.5; 