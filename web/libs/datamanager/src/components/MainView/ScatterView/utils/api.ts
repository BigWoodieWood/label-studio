/**
 * Scatter API client
 * 
 * Provides a Promise-based API facade for fetching task points
 * for the scatter plot. Isolates network logic from UI components.
 */
import type { TaskPoint } from "./types";

export interface ScatterFetchOptions {
  /** Project ID to fetch tasks for */
  project: number;
  /** Field in task.data that contains classification information (for coloring) */
  classField: string;
  /** Optional signal for cancellation */
  abortSignal?: AbortSignal;
  /** Optional page number (default: 1) */
  page?: number;
  /** Optional page size (server default is 1000) */
  pageSize?: number;
  /** Callback fired with progress information */
  onProgress?: (current: number, total: number) => void;
}

export interface ScatterFetchResult {
  /** Points from this fetch operation */
  points: TaskPoint[];
  /** Total number of available points */
  total: number;
  /** Current page number */
  page: number;
  /** Page size (usually 1000) */
  pageSize: number;
  /** Whether there are more pages to fetch */
  hasMore: boolean;
}

/**
 * Fetches a single page of task points from the `/api/scatter/tasks` endpoint.
 * 
 * @param options - Fetch options including project ID, field mappings, and pagination
 * @returns Promise resolving to points and pagination metadata
 */
export async function fetchScatterPoints(
  options: ScatterFetchOptions
): Promise<ScatterFetchResult> {
  const { 
    project, 
    classField, 
    abortSignal,
    page = 1,
    pageSize = 10000,
    onProgress 
  } = options;

  const queryParams = new URLSearchParams({
    project: String(project),
    x: "x",
    y: "y",
    class: classField,
    text: "text",
    r: "r",
    page: String(page),
    page_size: String(pageSize)
  });

  const resp = await fetch(`/api/scatter/tasks?${queryParams.toString()}`, {
    signal: abortSignal,
  });

  if (!resp.ok) {
    throw new Error(`Scatter API error ${resp.status}`);
  }

  const json = await resp.json();
  const tasks = json.tasks as any[];
  const total: number = json.total;
  const actualPageSize: number = json.page_size;

  // Map API response to TaskPoint format
  const points: TaskPoint[] = tasks.map((t) => ({
    id: String(t.id),
    data: {
      x: t.x,
      y: t.y,
      r: t.r,
      text: t.text,
      class: t.class,
      time: t.time,
    },
  }));

  onProgress?.(points.length + (page - 1) * actualPageSize, total);

  return {
    points,
    total,
    page,
    pageSize: actualPageSize,
    hasMore: points.length === actualPageSize && (page * actualPageSize) < total
  };
} 