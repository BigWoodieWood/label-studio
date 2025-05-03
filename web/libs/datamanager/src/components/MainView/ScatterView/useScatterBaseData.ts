/**
 * Progressive loading hook for Scatter plot base points
 * 
 * This hook manages fetching ALL task points for the scatter plot's base layer,
 * handling pagination, loading state, cancellation, and component lifecycle.
 * 
 * Design goals:
 * - Incremental/streaming updates: UI updates as each page arrives
 * - Clean cancellation: Aborts in-flight requests on unmount or reload
 * - Isolated from MST: Keeps potentially large point datasets out of global state
 * - Self-contained: Contains all networking/state logic in one place
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { TaskPoint, ScatterSettings } from "./types";
import { fetchScatterPoints } from "./api";

interface UseScatterBaseDataResult {
  /** All task points fetched so far (grows incrementally) */
  basePoints: TaskPoint[];
  /** Whether points are currently being fetched */
  loading: boolean;
  /** Trigger a manual refresh of all points */
  reload: () => void;
}

/**
 * Hook that loads all task points for the scatter plot base layer.
 * 
 * Fetches points from the API in pages, accumulating them over time.
 * Handles proper cancellation on unmount or when reload is called.
 * 
 * @param projectId - Current project ID (undefined before project loaded)
 * @param settings - Scatter view settings with classField for categorization
 * @returns Object with basePoints array, loading state, and reload function
 */
export function useScatterBaseData(
  projectId: number | undefined,
  settings: ScatterSettings,
): UseScatterBaseDataResult {
  const [basePoints, setBasePoints] = useState<TaskPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Define load function that handles pagination, errors, and cleanup
  const load = useCallback(() => {
    if (!projectId) return;
    
    // Cancel any in-flight request
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBasePoints([]);
    setLoading(true);

    // Manual pagination implementation
    const fetchAllPages = async () => {
      try {
        let currentPage = 1;
        let hasMore = true;
        let accumulated: TaskPoint[] = [];

        // Loop through all pages
        while (hasMore && !ctrl.signal.aborted) {
          const result = await fetchScatterPoints({
            project: projectId,
            classField: settings.classField,
            abortSignal: ctrl.signal,
            page: currentPage,
          });

          // Add this page's points to our accumulated array
          accumulated = [...accumulated, ...result.points];
          
          // Update state so UI reflects progress
          setBasePoints(accumulated);
          
          // Prepare for next page or exit
          hasMore = result.hasMore;
          currentPage++;
        }
      } catch (err) {
        // Suppress AbortError which is expected during cancellation
        if ((err as any).name !== "AbortError") {
          console.error("Error fetching scatter points:", err);
        }
      } finally {
        setLoading(false);
      }
    };

    // Start the fetching process
    fetchAllPages();
  }, [projectId, settings.classField]);

  // Trigger initial load and handle cleanup on unmount
  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { basePoints, loading, reload: load };
} 