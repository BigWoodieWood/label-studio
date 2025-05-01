import { RefObject, useCallback, useEffect } from "react";
import type { CanvasPoint } from "./types";

/**
 * Defines the options for the scatter interaction hook.
 */
interface InteractionOpts {
  /** Reference to the canvas element. */
  canvasRef: RefObject<HTMLCanvasElement>;
  /** Reference to the array of rendered points with their canvas coordinates. */
  pointsRef: RefObject<CanvasPoint[]>;
  /** Callback invoked when a point is hovered or hover ends (id is null). */
  onHover?: (id: string | null) => void;
  /** Callback invoked when a point is clicked. */
  onSelect?: (id: string) => void;
  /** Pixel radius around a point's center to consider a hit. */
  hitRadius?: number;
}

/**
 * Custom hook to manage mouse interactions (hover, click) on a scatter plot canvas.
 *
 * It attaches event listeners to the canvas and determines which point
 * (if any) is under the cursor based on the provided pointsRef.
 *
 * @param opts - Configuration options for the hook.
 * @returns void - This hook does not return anything, it sets up listeners.
 */
export const useScatterInteractions = ({
  canvasRef,
  pointsRef,
  onHover,
  onSelect,
  hitRadius = 8, // Default hit radius of 8 pixels
}: InteractionOpts) => {
  /**
   * Calculates which point, if any, is under the mouse event coordinates.
   */
  const getHitPoint = useCallback((evt: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !pointsRef.current) return null;

    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    // Find the first point within the hit radius of the click/move
    return pointsRef.current.find((p) => {
      const dx = p.canvasX - x;
      const dy = p.canvasY - y;
      // Simple Euclidean distance check
      return Math.sqrt(dx * dx + dy * dy) <= hitRadius;
    }) ?? null;
  }, [canvasRef, pointsRef, hitRadius]);

  // Effect to attach and clean up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handler for mouse movement: check for hover
    const handleMove = (evt: MouseEvent) => {
      const hit = getHitPoint(evt);
      onHover?.(hit ? hit.id : null); // Invoke onHover with hit point ID or null
    };

    // Handler for mouse click: check for selection
    const handleClick = (evt: MouseEvent) => {
      const hit = getHitPoint(evt);
      if (hit) onSelect?.(hit.id); // Invoke onSelect if a point was clicked
    };

    // Handler for mouse leaving the canvas: clear hover state
    const handleLeave = () => onHover?.(null);

    // Attach listeners
    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mouseleave", handleLeave);

    // Cleanup function to remove listeners when component unmounts or deps change
    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [canvasRef, getHitPoint, onHover, onSelect]); // Re-attach if dependencies change
}; 