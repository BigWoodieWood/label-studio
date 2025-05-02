import { observer } from "mobx-react";
import React, {
  useEffect,
  useState,
  useMemo,
  FC,
  useCallback,
} from "react";
import { Block } from "../../../utils/bem";
import { getRoot } from "mobx-state-tree";

// Deck.gl imports
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer } from "@deck.gl/layers";
import { OrthographicView } from "@deck.gl/core";

import "./ScatterView.scss";

import type { TaskPoint, ScatterPalette, ScatterSettings } from "./types";
import type { PickingInfo, ViewStateChangeParameters } from "@deck.gl/core";
import { ScatterSettingsButton } from "./ScatterSettingsButton";

/**
 * Interface for the MobX view model passed to ScatterView.
 * Defines the essential properties needed for selection state.
 */
interface ScatterViewModel {
  selected?: {
    isSelected: (id: string) => boolean;
  };
  // Allow access to root methods like startLabeling
  [key: string]: any;
}

/**
 * Interface for the root store, assuming it has a startLabeling method.
 * Replace with actual RootStore type if available.
 */
interface RootStoreWithLabeling {
  // Allow startLabeling to potentially accept just an ID
  startLabeling?: (itemOrId: TaskPoint | { id: string | number }) => void;
  closeLabeling?: () => void;
  // Access to the currently selected task ID (adjust path if needed)
  dataStore?: {
    selected?: {
      id: string | number;
    };
  };
  [key: string]: any;
}

/**
 * Props accepted by the ScatterView component.
 */
export interface ScatterViewProps {
  /** Array of task data objects. Expected to have `id` and `data.x`, `data.y`. */
  data: TaskPoint[];
  /** The MobX view model containing selection state and potentially root access. */
  view: ScatterViewModel;
  /** Callback invoked when a point is clicked, passing the task ID. */
  onChange?: (id: string) => void;
  /** Callback invoked when scrolling near the edge (currently TODO). */
  loadMore?: () => Promise<void>;
}

/**
 * Helper function to convert HEX color to RGBA array used by Deck.gl
 */
const hexToRgba = (hex: string, alpha = 255): [number, number, number, number] => {
  const hexValue = hex.startsWith("#") ? hex.slice(1) : hex;
  const bigint = parseInt(hexValue, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b, alpha];
};

/**
 * Simple hash function for strings
 */
const hashString = (str: string): number => {
  let hash = 0;
  if (str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Function to calculate bounding box [[minX, minY], [maxX, maxY]]
const calculateBounds = (points: TaskPoint[]): [[number, number], [number, number]] | null => {
  if (points.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p.data.x < minX) minX = p.data.x;
    if (p.data.x > maxX) maxX = p.data.x;
    if (p.data.y < minY) minY = p.data.y;
    if (p.data.y > maxY) maxY = p.data.y;
  });
  // Add slight padding if min/max are the same
  if (minX === maxX) { minX -= 0.5; maxX += 0.5; }
  if (minY === maxY) { minY -= 0.5; maxY += 0.5; }
  return [[minX, minY], [maxX, maxY]];
};


/**
 * ScatterView component renders tasks as points using Deck.gl for high performance.
 *
 * Displays points based on `task.data.x` and `task.data.y`, supports hover,
 * click (single & shift+click for multi-select - TODO), pan/zoom interactions,
 * shows tooltips, and integrates with the labeling workflow.
 */
export const ScatterView: FC<ScatterViewProps> = observer(
  ({ data = [], view, onChange }) => {
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [initialViewState, setInitialViewState] = useState<any>(null);
    const [viewState, setViewState] = useState<any>(null); // Controlled view state
    const [deckKey, setDeckKey] = useState(0);
    
    // Settings state
    const [settings, setSettings] = useState<ScatterSettings>(() => {
      if ((view as any)?.scatterSettings) {
        // Parse the stringified value if needed
        const viewSettings = typeof (view as any).scatterSettings === 'string' 
          ? JSON.parse((view as any).scatterSettings)
          : (view as any).scatterSettings;
        
        return {
          classField: viewSettings.classField || 'class',
        } as ScatterSettings;
      }
      return { classField: 'class' };
    });
    
    // Extract available fields from data
    const availableFields = useMemo(() => {
      const fields = new Set<string>();
      data.forEach(item => {
        if (item.data) {
          Object.keys(item.data).forEach(key => {
            if (typeof item.data[key] === 'string') {
              fields.add(key);
            }
          });
        }
      });
      return Array.from(fields);
    }, [data]);

    // Define color palette
    const palette: ScatterPalette = useMemo(
      () => ({
        colors: [
          "#ff6b6b", // red
          "#48dbfb", // blue
          "#1dd1a1", // green
          "#feca57", // yellow
          "#5f27cd", // purple
          "#ff9ff3", // pink
          "#54a0ff", // light blue
          "#00d2d3", // teal
          "#ff7f50", // coral
          "#a29bfe", // lavender
          "#badc58", // lime
          "#f368e0", // magenta
          "#3b82f6", // default blue
        ],
      }),
      [],
    );

    // Handle settings change
    const handleSettingsChange = useCallback((newSettings: ScatterSettings) => {
      setSettings(newSettings);
      // Persist in the DataManager tab if available
      if (typeof (view as any).setScatterSettings === 'function') {
        (view as any).setScatterSettings(newSettings);
      }
    }, [view]);

    // Filter data for points with valid numeric coordinates & make safe copies of needed properties
    const numericPoints: TaskPoint[] = useMemo(() => {
      return data
        .filter(t => t.data && typeof t.data.x === "number" && typeof t.data.y === "number")
        .map(t => ({
          // Create a safe copy with just the properties we need
          id: t.id,
          data: {
            x: t.data.x,
            y: t.data.y,
            class: (t.data as any)[settings.classField] || '',
            text: t.data.text,
            time: t.data.time || 0,
            r: t.data.r
          }
        }));
    }, [data, settings.classField]); // When settings.classField changes, points get remapped
    
    // Increment deckKey whenever numericPoints identity changes
    useEffect(() => {
      setDeckKey((k) => k + 1);
    }, [numericPoints.length > 0]);

    // Deck.gl Layer definition
    const layers = useMemo(() => {
      if (!numericPoints || numericPoints.length === 0) return [];

      return [
        new ScatterplotLayer<TaskPoint>({
          id: "scatter-plot",
          data: numericPoints,
          pickable: true,
          opacity: 0.8,
          stroked: true,
          filled: true,
          radiusUnits: "pixels",
          lineWidthUnits: "pixels",
          // Accessors using data points
          getPosition: (d) => [d.data.x, d.data.y, 0],
          getRadius: (d) => {
            // Use custom radius if provided, otherwise use selection/hover based radius
            if (typeof d.data.r === 'number') return d.data.r;
            return view.selected?.isSelected(d.id) ? 7 : (d.id === hoveredId ? 6 : 5);
          },
          getFillColor: (d) => {
            const isHovered = d.id === hoveredId;
            if (isHovered) return [255, 255, 255, 255]; // White fill on hover
            
            // Get color based on class using hash function
            if (d.data.class) {
              const colorIndex = hashString(d.data.class) % palette.colors.length;
              return hexToRgba(palette.colors[colorIndex]);
            }
            
            // Default color (last color in palette)
            return hexToRgba(palette.colors[palette.colors.length - 1]);
          },
          getLineColor: (d) => {
            const isSelected = view.selected?.isSelected(d.id);
            const isHovered = d.id === hoveredId;
            if (isSelected || isHovered) return [0, 0, 0, 255]; // Black outline for selected/hovered
            return [0, 0, 0, 50]; // Dim outline otherwise
          },
          getLineWidth: (d) => (view.selected?.isSelected(d.id) || d.id === hoveredId ? 2 : 1),

          // Update triggers tell Deck.gl when to re-evaluate accessors
          updateTriggers: {
            // Simplify update triggers to avoid potential WebGL conflicts
            getPosition: null,
            getRadius: [hoveredId, view.selected, numericPoints.length],
            // Include settings.classField to ensure color updates
            getFillColor: [hoveredId, settings.classField],
            getLineColor: [hoveredId, view.selected, numericPoints.length],
            getLineWidth: [hoveredId, view.selected, numericPoints.length],
          },
        }),
        // TODO: Add TextLayer, IconLayer etc. here later if needed
      ];
    }, [numericPoints, hoveredId, view.selected, palette, settings.classField]); // Add settings.classField dependency
    
    // Clean up WebGL context on unmount
    useEffect(() => {
      return () => {
        // Cleanup function
        setViewState(null);
        setInitialViewState(null);
      };
    }, []);
    
    // Calculate initial view state ONLY when numericPoints first becomes non-empty
    useEffect(() => {
      // Only proceed if initial state is null AND we now have points
      if (!initialViewState && numericPoints.length > 0) {
        const bounds = calculateBounds(numericPoints);
        if (bounds) {
          const [[minX, minY], [maxX, maxY]] = bounds;
          const minZoomAllowed = -2;
          const maxZoomAllowed = 10;
          const rangeX = maxX - minX || 1;
          const rangeY = maxY - minY || 1;
          // Compute a zoom level that fits the points within ~500px viewport
          let computedZoom = Math.log2(Math.min(500 / rangeX, 500 / rangeY)) - 1;
          // Clamp zoom to avoid values outside of allowed range which may trigger deck.gl assertions
          computedZoom = Math.max(Math.min(computedZoom, maxZoomAllowed), minZoomAllowed);

          const initialVs = {
            target: [(minX + maxX) / 2, (minY + maxY) / 2, 0],
            zoom: computedZoom,
            minZoom: minZoomAllowed,
            maxZoom: maxZoomAllowed,
          };
          setInitialViewState(initialVs);
          setViewState(initialVs); // Set controlled state at the same time
        }
      }
      // Dependency ensures this runs only when points appear or initial state is reset elsewhere
    }, [numericPoints.length > 0, initialViewState]); 

    // Effect: if numericPoints becomes empty, reset initial view so DeckGL unmounts
    useEffect(() => {
      if (numericPoints.length === 0 && initialViewState) {
        setInitialViewState(null);
        setViewState(null);
      }
    }, [numericPoints.length, initialViewState]);

    // Tooltip Content
    const getTooltip = useCallback((info: PickingInfo) => {
      const object = info.object as TaskPoint | undefined;
      if (!object) return null;
      return {
        text: `${object.data.text || `Task ${object.id}`}\nClass: ${object.data.class || 'N/A'}`,
        style: { // Basic tooltip styling
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          fontSize: '12px',
          borderRadius: '2px',
        }
      };
    }, []);

    // Click Handler
    const handleClick = useCallback(
      (info: PickingInfo, event: { srcEvent: MouseEvent }) => {
        if (info.object) {
          const clickedObject = info.object as TaskPoint;
          const clickedId = clickedObject.id;
          const isShift = event.srcEvent.shiftKey;
          const root = getRoot<RootStoreWithLabeling>(view);

          // Defer the actual action to allow Deck.gl event cycle to finish
          setTimeout(() => {
            if (isShift) {
              // TODO: Implement multi-selection logic
              console.log("Shift+Click detected on:", clickedId);
              onChange?.(clickedId); // Basic toggle for now
            } else {
              // Single click
              onChange?.(clickedId);
              // Check if we are clicking the *already* selected/labeled item
              if (root.dataStore?.selected?.id === clickedId) {
                // If clicking the currently labeled item, close the editor
                root?.closeLabeling?.();
              } else {
                // Otherwise, open the editor for the new item
                // Pass only the ID, let startLabeling find the live node
                root?.startLabeling?.({ id: clickedId });
              }
            }
          }, 0); // Defer execution slightly
        }
      },
      [data, view, onChange],
    );

    // Hover Handler
    const handleHover = useCallback((info: PickingInfo) => {
      setHoveredId(info.object ? (info.object as TaskPoint).id : null);
    }, []);

    // View State Change Handler
    const handleViewStateChange = useCallback(({ viewState: newViewState }: ViewStateChangeParameters) => {
        setViewState(newViewState);
      }, []);

    // Render guard: need data and initialViewState
    if (numericPoints.length === 0) {
      return (
        <Block name="scatter-view" elem="no-data">
          {data.length === 0 ? "No tasks available." : "No coordinate data found."}
        </Block>
      );
    }

    if (!initialViewState) {
      return (
        <Block name="scatter-view" elem="no-data">Calculating view...</Block>
      );
    }

    return (
      <Block name="scatter-view">
        {/* Settings button */}
        <Block name="scatter-view-toolbar">
          <ScatterSettingsButton
            settings={settings}
            onSettingsChange={handleSettingsChange}
            availableFields={availableFields}
          />
        </Block>
        
        <DeckGL
          key={`scatter-${deckKey}`}
          layers={layers}
          views={new OrthographicView({ id: "ortho-view" })}
          initialViewState={initialViewState}
          viewState={viewState}
          onViewStateChange={handleViewStateChange}
          controller
          getTooltip={getTooltip}
          onClick={handleClick}
          onHover={handleHover}
          style={{ position: "relative", width: "100%", height: "100%" }}
        />
      </Block>
    );
  },
); 