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
import { useScatterSelection } from "./useScatterSelection";
import {
  CATEGORY_COLORS,
  STROKE,
  RADIUS,
  STROKE_WIDTH,
  OPACITY,
  TOOLTIP_STYLE
} from './scatter-tokens';
import { IconError, IconCloseCircleOutline } from "@humansignal/icons";

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

// Helper type for position coordinates to make TypeScript happy
type PositionType = [number, number, number];

// Layer constants
const LAYER_ID = {
  BASE: "base-points",
  FILTERED: "filtered-points",
  SELECTED: "selected-points",
  ACTIVE: "active-point",
  HOVERED: "hovered-point",
};

/* Helper hook to create scatter layers
 * This hook manages the creation of multiple specialized layers for the scatter plot visualization.
 * We use separate layers for different point states (base, selected, active, hovered) to:
 * 1. Optimize rendering performance by only updating layers that change
 * 2. Control the visual stacking order (z-index) of points
 * 3. Apply different visual treatments to points based on their state
 * 4. Ensure proper hit testing and interaction behavior
 * 
 * The layering approach follows the "painter's algorithm" where we draw from back to front:
 * - Base layer: Regular points with category colors
 * - Selected layer: Points the user has explicitly selected
 * - Active layer: The currently active point (being edited/focused)
 * - Hovered layer: The point currently under the mouse cursor
 *
 * This separation allows for efficient updates when only certain states change
 * (e.g., only redrawing the hover layer when the mouse moves)
 */
function useScatterLayers(
  numericPoints: TaskPoint[],
  activeId: string | null,
  hoveredId: string | null,
  view: ScatterViewModel,
  settings: ScatterSettings,
  selectionVersion: number
) {
  return useMemo(() => {
    if (!numericPoints || numericPoints.length === 0) return [];

    // For large datasets, use Sets for faster lookups
    const isSelected = (id: string) => view.selected?.isSelected(id) ?? false;
    const isActive = (id: string) => id === activeId;
    const isHovered = (id: string) => id === hoveredId;
    
    // Pre-compute points for each layer
    const activePoint = activeId ? numericPoints.find(p => p.id === activeId) : null;
    const hoveredPoint = hoveredId ? numericPoints.find(p => p.id === hoveredId) : null;
    
    // Filter points into their respective layers - each point appears in exactly one layer
    const selectedPoints = numericPoints.filter(p => isSelected(p.id) && !isActive(p.id) && !isHovered(p.id));
    const basePoints = numericPoints.filter(p => !isSelected(p.id) && !isActive(p.id) && !isHovered(p.id));

    // Common properties shared by all layers
    const commonProps = {
      pickable: true,
      stroked: true, 
      filled: true,
      radiusUnits: 'pixels' as const,
      lineWidthUnits: 'pixels' as const,
      getPosition: (d: TaskPoint) => [d.data.x, d.data.y, 0] as PositionType,
      parameters: { depthTest: false } as any, // Disable depth testing - use painter's algorithm
    };

    // Create layers in draw order (bottom to top)
    return [
      // 1. Base layer: all regular points (excluding special state points)
      new ScatterplotLayer<TaskPoint>({
        ...commonProps,
        id: LAYER_ID.BASE,
        data: basePoints,
        opacity: OPACITY,
        getRadius: (d: TaskPoint) => typeof d.data.r === 'number' ? d.data.r : RADIUS.default,
        getFillColor: (d: TaskPoint) => {
          const idx = d.data.class
            ? hashString(d.data.class) % CATEGORY_COLORS.length
            : CATEGORY_COLORS.length - 1;
          return CATEGORY_COLORS[idx];
        },
        getLineColor: STROKE.default,
        getLineWidth: STROKE_WIDTH.default,
        updateTriggers: {
          getFillColor: [settings.classField],
        },
      }),

      // 2. Selected points layer
      ...(selectedPoints.length > 0 ? [
        new ScatterplotLayer<TaskPoint>({
          ...commonProps,
          id: LAYER_ID.SELECTED,
          data: selectedPoints,
          opacity: OPACITY,
          getRadius: (d: TaskPoint) => {
            const baseRadius = typeof d.data.r === 'number' ? d.data.r : RADIUS.default;
            return baseRadius + RADIUS.selected_delta;
          },
          getFillColor: STROKE.selected,
          getLineColor: STROKE.selected,
          getLineWidth: STROKE_WIDTH.selected,
        }),
      ] : []),

      // 3. Active point
      ...(activePoint ? [
        new ScatterplotLayer<TaskPoint>({
          ...commonProps,
          id: LAYER_ID.ACTIVE,
          data: [activePoint],
          opacity: OPACITY,
          getRadius: (d: TaskPoint) => {
            const baseRadius = typeof d.data.r === 'number' ? d.data.r : RADIUS.default;
            return baseRadius + RADIUS.active_delta;
          },
          getFillColor: STROKE.active,
          getLineColor: STROKE.active,
          getLineWidth: STROKE_WIDTH.active,
        }),
      ] : []),

      // 4. Hovered point (top-most, even above active)
      ...(hoveredPoint ? [
        new ScatterplotLayer<TaskPoint>({
          ...commonProps,
          id: LAYER_ID.HOVERED,
          data: [hoveredPoint],
          opacity: OPACITY,
          getRadius: (d: TaskPoint) => typeof d.data.r === 'number' ? d.data.r : RADIUS.default + 1,
          getFillColor: (d: TaskPoint) => {
            const idx = d.data.class
              ? hashString(d.data.class) % CATEGORY_COLORS.length
              : CATEGORY_COLORS.length - 1;
            return CATEGORY_COLORS[idx];
          },
          getLineColor: STROKE.hovered,
          getLineWidth: STROKE_WIDTH.hovered,
          updateTriggers: {
            getFillColor: [settings.classField],
          },
        }),
      ] : []),
    ];
  }, [numericPoints, hoveredId, view.selected, settings.classField, activeId, selectionVersion]);
}

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
    }, [data, settings.classField]);
    
    // Increment deckKey whenever numericPoints identity changes
    useEffect(() => {
      setDeckKey((k) => k + 1);
    }, [numericPoints.length > 0]);

    // Use the new hook to manage selection and active
    const {
      onClick: handleClickUnified,
      onDragStart,
      onDrag,
      onDragEnd,
      activeId,
      selectionVersion,
    } = useScatterSelection({
      numericPoints,
      onToggleSelect: (id) => onChange?.(id),
      onActiveChange: (id) => {
        // Defer root interactions to let DeckGL event processing finish
        setTimeout(() => {
          const root = getRoot<RootStoreWithLabeling>(view);
          if (!id) return;
          if (root.dataStore?.selected?.id === id) {
            root?.closeLabeling?.();
          } else {
            root?.startLabeling?.({ id });
          }
        }, 0);
      },
      isSelected: (id) => view.selected?.isSelected(id) ?? false,
      onClearSelection: () => view.clearSelection()
    });

    // Split points into separate arrays by category for proper visual stacking
    const layers = useScatterLayers(
      numericPoints,
      activeId,
      hoveredId,
      view,
      settings,
      selectionVersion
    );
    
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
        style: TOOLTIP_STYLE
      };
    }, []);

    // Hover Handler
    const handleHover = useCallback((info: PickingInfo) => {
      setHoveredId(info.object ? (info.object as TaskPoint).id : null);
    }, []);

    // View State Change Handler
    const handleViewStateChange = useCallback(({ viewState: newViewState }: ViewStateChangeParameters) => {
        setViewState(newViewState);
      }, []);

    // Persist settings changes coming from the toolbar dialog.
    const handleSettingsChange = useCallback(
      (newSettings: ScatterSettings) => {
        setSettings(newSettings);

        // Optional: persist inside the Data-Manager tab
        if (typeof (view as any).setScatterSettings === "function") {
          (view as any).setScatterSettings(newSettings);
        }
      },
      [view],
    );

    // Render guard: need data and initialViewState
    if (numericPoints.length === 0) {
      return (
        <Block name="scatter-view" elem="no-data" mod={{ empty: true }}>
          <Block className="scatter-view__message">
            <IconCloseCircleOutline className="scatter-view__message-icon" />
            <h3>{data.length === 0 ? "No tasks found" : "No point coordinates available"}</h3>
            <p>{data.length === 0 
              ? "There are no tasks to display in the scatter plot." 
              : "Tasks exist but don't contain the necessary coordinates (x,y) in task data for visualization."}</p>
          </Block>
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
          onClick={handleClickUnified}
          onHover={handleHover}
          onDragStart={onDragStart as any}
          onDrag={onDrag as any}
          onDragEnd={onDragEnd as any}
          style={{ position: "relative", width: "100%", height: "100%" }}
        />
      </Block>
    );
  },
); 