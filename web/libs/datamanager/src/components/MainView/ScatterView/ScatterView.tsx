import { observer } from "mobx-react";
import React, { useEffect, useRef, useState, useMemo, FC } from "react";
import { Block } from "../../../utils/bem";
import { getRoot } from "mobx-state-tree";

import "./ScatterView.scss";

import { drawScatter } from "./draw-scatter";
import { useScatterInteractions } from "./use-scatter-interactions";
import type { TaskPoint, CanvasPoint, ScatterPalette } from "./types";

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
  startLabeling?: (item: TaskPoint) => void;
  [key: string]: any;
}

/**
 * Props accepted by the ScatterView component.
 */
interface ScatterViewProps {
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
 * ScatterView component renders tasks as points on a 2D canvas.
 *
 * It displays points based on `task.data.x` and `task.data.y`, supports hover
 * and click interactions, shows tooltips, and integrates with the labeling workflow.
 */
export const ScatterView: FC<ScatterViewProps> = observer(
  ({ data = [], view, onChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Memoized color palette (can be moved to constants or theme)
    const palette: ScatterPalette = useMemo(
      () => ({
        animal: "#ff6b6b",
        vehicle: "#48dbfb",
        landscape: "#1dd1a1",
        interior: "#feca57",
        people: "#5f27cd",
        food: "#ff9ff3",
        default: "#3b82f6",
      }),
      [],
    );

    // Cache points that have valid numeric coordinates
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

    // Single effect: draw points to canvas + build hit-test map for interactions
    // This ref stores the canvas coordinates and details of rendered points
    const pointsRef = useRef<CanvasPoint[]>([]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Determine which points are currently selected from the view model
      const selectedIds = new Set<string>(
        view.selected
          ? data
              .filter((d) => view.selected!.isSelected(d.id))
              .map((d) => d.id)
          : [],
      );

      // Draw points onto the canvas using the utility function
      drawScatter({
        canvas,
        points: numericPoints,
        hoveredId,
        selectedIds,
        palette,
      });

      // Build the hit-test representation (map of points with canvas coordinates)
      if (numericPoints.length === 0) {
        pointsRef.current = [];
        return;
      }

      // Calculate coordinate scaling based on current data bounds
      const xs = numericPoints.map((p) => p.data.x);
      const ys = numericPoints.map((p) => p.data.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const { clientWidth: width, clientHeight: height } = canvas;
      const pad = 20;
      const scaleX = (v: number) =>
        ((v - minX) / (maxX - minX || 1)) * (width - pad * 2) + pad;
      const scaleY = (v: number) =>
        ((v - minY) / (maxY - minY || 1)) * (height - pad * 2) + pad;

      // Store canvas coordinates and metadata for each point
      pointsRef.current = numericPoints.map((p) => ({
        id: p.id,
        canvasX: scaleX(p.data.x),
        canvasY: height - scaleY(p.data.y), // Invert Y for canvas coords
        category: p.data.category || "default",
        text: p.data.text,
      }));
      // Dependency array ensures this runs when data, hover, or selection changes
    }, [numericPoints, hoveredId, view.selected, data, palette]); // `data` needed for selectedIds filter

    // Set up mouse interactions using the custom hook
    useScatterInteractions({
      canvasRef,
      pointsRef,
      onHover: setHoveredId,
      onSelect: (id) => {
        // 1. Notify parent about the selection change
        onChange?.(id);

        // 2. Find the full task object corresponding to the clicked point ID
        const item = data.find((t) => t.id === id);
        if (item) {
          // 3. Trigger the labeling workflow via the root store action
          // Type assertion needed as getRoot returns a generic type
          const root = getRoot<RootStoreWithLabeling>(view);
          if (root?.startLabeling) {
            root.startLabeling(item);
          }
        }
      },
    });

    // Find details of the currently hovered point for the tooltip
    const hoveredPointDetails = hoveredId
      ? pointsRef.current.find((p) => p.id === hoveredId)
      : null;

    return (
      <Block name="scatter-view">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%" }}
          /* interaction handled by useScatterInteractions hook */
        />

        {/* Controls - placeholder for future zoom/pan, shows point count */}
        <Block name="scatter-view" elem="controls">
          <div
            style={{
              padding: "4px 6px",
              background: "white",
              borderRadius: "4px",
              cursor: "default",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              fontSize: "12px",
              userSelect: "none",
            }}
          >
            {pointsRef.current.length} points
          </div>
        </Block>

        {/* Message shown when no data points with coordinates are available */}
        {pointsRef.current.length === 0 && (
          <Block name="scatter-view" elem="no-data">
            No coordinate data found! Tasks should have x and y values in their
            data object.<br />
            {data.length > 0
              ? `Found ${data.length} tasks but none have coordinates.`
              : "No tasks available."}
          </Block>
        )}

        {/* Tooltip displayed when hovering over a point */}
        {hoveredPointDetails && (
          <Block
            name="scatter-view"
            elem="tooltip"
            style={{
              bottom: "10px",
              left: "10px",
            }}
          >
            {hoveredPointDetails.text || `Task ${hoveredPointDetails.id}`}
            <br />
            {hoveredPointDetails.category && (
              <span>Category: {hoveredPointDetails.category}</span>
            )}
          </Block>
        )}
      </Block>
    );
  },
); 