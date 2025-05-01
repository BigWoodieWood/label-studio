import { observer } from "mobx-react";
import React, {
  useEffect,
  useRef,
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

import type { TaskPoint, ScatterPalette } from "./types"; // CanvasPoint removed
import type { PickingInfo, ViewStateChangeParameters } from "@deck.gl/core";

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

    // Color palette (consider moving to theme/constants)
    const palette: ScatterPalette = useMemo(
      () => ({
        animal: "#ff6b6b",
        vehicle: "#48dbfb",
        landscape: "#1dd1a1",
        interior: "#feca57",
        people: "#5f27cd",
        food: "#ff9ff3",
        default: "#3b82f6", // Default color
      }),
      [],
    );

    // Filter data for points with valid numeric coordinates
    const numericPoints: TaskPoint[] = useMemo(
      () =>
        data.filter(
          (t) =>
            t.data &&
            typeof t.data.x === "number" &&
            typeof t.data.y === "number",
        ),
      [data],
    );

    // Calculate initial view state only when data is first loaded
    useEffect(() => {
      if (!initialViewState && numericPoints.length > 0) {
        const bounds = calculateBounds(numericPoints);
        if (bounds) {
          const [[minX, minY], [maxX, maxY]] = bounds;
          const initialVs = {
            // Center the view on the data bounds
            target: [(minX + maxX) / 2, (minY + maxY) / 2, 0],
            // Adjust zoom to fit the data, simple heuristic, might need refinement
            zoom: Math.log2(Math.min(500 / (maxX - minX || 1), 500 / (maxY - minY || 1))) - 1, // Adjust 500 based on container size
            minZoom: -2, // Allow zooming out
            maxZoom: 10, // Limit zoom in
          };
          setInitialViewState(initialVs);
          setViewState(initialVs); // Also set the controlled state initially
        }
      }
    }, [numericPoints, initialViewState]); // Run when points load

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
          getRadius: (d) => (view.selected?.isSelected(d.id) ? 7 : (d.id === hoveredId ? 6 : 5)),
          getFillColor: (d) => {
            const isHovered = d.id === hoveredId;
            if (isHovered) return [255, 255, 255, 255]; // White fill on hover
            const category = d.data.category || "default";
            return hexToRgba(palette[category] || palette.default);
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
            getRadius: [hoveredId, view.selected],
            getFillColor: [hoveredId, palette, view.selected],
            getLineColor: [hoveredId, view.selected],
            getLineWidth: [hoveredId, view.selected],
          },
        }),
        // TODO: Add TextLayer, IconLayer etc. here later if needed
      ];
    }, [numericPoints, hoveredId, view.selected, palette]);

    // Tooltip Content
    const getTooltip = useCallback((info: PickingInfo) => {
      const object = info.object as TaskPoint | undefined;
      if (!object) return null;
      return {
        text: `${object.data.text || `Task ${object.id}`}\nCategory: ${object.data.category || 'N/A'}`,
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

    // Don't render until initial view state is calculated
    if (!initialViewState) {
        return (
            <Block name="scatter-view" elem="no-data">Calculating view...</Block>
        );
    }

    return (
      <Block name="scatter-view">
        <DeckGL
          layers={layers}
          views={new OrthographicView({ id: "ortho-view" })}
          initialViewState={initialViewState}
          viewState={viewState} // Pass controlled state
          onViewStateChange={handleViewStateChange} // Update controlled state
          controller={true} // Enable panning & zooming
          getTooltip={getTooltip}
          onClick={handleClick}
          onHover={handleHover}
          style={{ position: "relative", width: "100%", height: "100%" }}
        />

        {/* Message shown when no data points with coordinates are available */}
        {numericPoints.length === 0 && (
          <Block name="scatter-view" elem="no-data">
            No coordinate data found! Tasks should have x and y values in their
            data object.<br />
            {data.length > 0
              ? `Found ${data.length} tasks but none have coordinates.`
              : "No tasks available."}
          </Block>
        )}
        {/* Optional: Could add HTML overlay for point count or other info */}
      </Block>
    );
  },
); 