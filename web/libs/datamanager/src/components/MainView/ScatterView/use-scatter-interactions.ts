import { RefObject, useCallback, useEffect } from "react";
import type { CanvasPoint } from "./types";

interface InteractionOpts {
  canvasRef: RefObject<HTMLCanvasElement>;
  pointsRef: RefObject<CanvasPoint[]>;
  onHover?: (id: string | null) => void;
  onSelect?: (id: string) => void;
  hitRadius?: number;
}

export const useScatterInteractions = ({
  canvasRef,
  pointsRef,
  onHover,
  onSelect,
  hitRadius = 8,
}: InteractionOpts) => {
  const getHitPoint = useCallback((evt: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    return pointsRef.current?.find((p) => {
      const dx = p.canvasX - x;
      const dy = p.canvasY - y;
      return Math.sqrt(dx * dx + dy * dy) <= hitRadius;
    }) ?? null;
  }, [canvasRef, pointsRef, hitRadius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (evt: MouseEvent) => {
      const hit = getHitPoint(evt);
      onHover?.(hit ? hit.id : null);
    };

    const handleClick = (evt: MouseEvent) => {
      const hit = getHitPoint(evt);
      if (hit) onSelect?.(hit.id);
    };

    const handleLeave = () => onHover?.(null);

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mouseleave", handleLeave);

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mouseleave", handleLeave);
    };
  }, [canvasRef, getHitPoint, onHover, onSelect]);
}; 