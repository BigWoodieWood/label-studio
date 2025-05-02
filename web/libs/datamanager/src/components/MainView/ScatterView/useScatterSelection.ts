import { useCallback, useState, useRef, useEffect } from "react";
import type { TaskPoint } from "./types";

export interface ScatterSelectionConfig {
  numericPoints: TaskPoint[];
  /**
   * Callback used to toggle selection in the parent view.
   * Typically maps to `view.toggleSelected(id)`.
   */
  onToggleSelect?: (id: string) => void;
  /** Callback to be called when active point changes */
  onActiveChange?: (id: string | null) => void;
  /** Predicate to check if id is currently selected */
  isSelected?: (id: string) => boolean;
  /** Optional callback to clear all selections */
  onClearSelection?: () => void;
}

export interface ScatterSelectionHandlers {
  onClick: (info: any, event: { srcEvent: MouseEvent }) => void;
  onDragStart: (info: any, event: { srcEvent: MouseEvent }) => void;
  onDrag: (info: any, event: { srcEvent: MouseEvent }) => void;
  onDragEnd: (info: any, event: { srcEvent: MouseEvent }) => void;
}

/**
 * Hook that encapsulates CTRL+click single selection, SHIFT+drag rectangle selection, and active point logic.
 * Returns event handlers ready to be passed directly to <DeckGL /> props.
 */
export const useScatterSelection = (
  config: ScatterSelectionConfig,
): ScatterSelectionHandlers & { activeId: string | null, selectionVersion: number } => {
  const { numericPoints, onToggleSelect, onActiveChange, isSelected, onClearSelection } = config;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const dragStart = useRef<[number, number] | null>(null);
  const isDragging = useRef(false);

  const commitActive = useCallback(
    (newId: string | null) => {
      setActiveId(newId);
      onActiveChange?.(newId);
    },
    [onActiveChange],
  );

  const onClick = useCallback(
    (info: any, event: { srcEvent: MouseEvent }) => {
      if (!info.object) return;
      const clickedId: string = info.object.id;
      const isCtrl = event.srcEvent.ctrlKey || event.srcEvent.metaKey;
      const isShift = event.srcEvent.shiftKey;
      const isAlt = event.srcEvent.altKey;

      if (isShift) {
        if (isAlt) {
          // Shift + Alt → deselect only
          if (isSelected?.(clickedId)) {
            onToggleSelect?.(clickedId);
            setSelectionVersion((v) => v + 1);
          }
          return;
        }

        // Add-only selection (no deselect)
        if (!isSelected?.(clickedId)) {
          onToggleSelect?.(clickedId);
          setSelectionVersion((v) => v + 1);
        }
        return;
      }

      if (isCtrl) {
        onToggleSelect?.(clickedId);
        setSelectionVersion((v) => v + 1);
        return;
      }

      // Plain click -> active point
      commitActive(clickedId);
    },
    [onToggleSelect, commitActive, isSelected],
  );

  const onDragStart = useCallback(
    (info: any, event: { srcEvent: MouseEvent }) => {
      if (!event.srcEvent.shiftKey) return; // rectangle selection only when shift is held
      if (!info.coordinate) return;
      dragStart.current = info.coordinate as [number, number];
      isDragging.current = true;
    },
    [],
  );

  const onDrag = useCallback((info: any, event: { srcEvent: MouseEvent }) => {
    // no-op; could be used to render rectangle overlay in future
  }, []);

  const onDragEnd = useCallback(
    (info: any, event: { srcEvent: MouseEvent }) => {
      if (!isDragging.current || !dragStart.current) {
        isDragging.current = false;
        dragStart.current = null;
        return;
      }

      if (!info.coordinate) {
        // Pointer released outside the canvas – safely cancel the drag
        isDragging.current = false;
        dragStart.current = null;
        return;
      }

      const start = dragStart.current;
      const endCoord: [number, number] = info.coordinate as [number, number];
      const isAlt = event.srcEvent.altKey;

      const minX = Math.min(start[0], endCoord[0]);
      const maxX = Math.max(start[0], endCoord[0]);
      const minY = Math.min(start[1], endCoord[1]);
      const maxY = Math.max(start[1], endCoord[1]);

      // Find points inside rectangle
      const idsInRect = numericPoints
        .filter((p) => {
          const { x, y } = p.data;
          return x >= minX && x <= maxX && y >= minY && y <= maxY;
        })
        .map((p) => p.id);

      let idsToUpdate: string[] = [];
      if (isAlt) {
        // Deselect only
        idsToUpdate = idsInRect.filter((id) => isSelected?.(id));
      } else {
        // Add only
        idsToUpdate = idsInRect.filter((id) => !isSelected?.(id));
      }

      if (idsToUpdate.length) {
        idsToUpdate.forEach((id) => onToggleSelect?.(id));
        setSelectionVersion((v) => v + 1);
      }

      isDragging.current = false;
      dragStart.current = null;
    },
    [numericPoints, onToggleSelect, isSelected],
  );

  // Add ESC key handler to clear selection
  useEffect(() => {
    if (!onClearSelection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClearSelection();
        setSelectionVersion(v => v + 1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClearSelection]);

  return {
    onClick,
    onDragStart,
    onDrag,
    onDragEnd,
    activeId,
    selectionVersion,
  };
}; 