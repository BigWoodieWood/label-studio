export interface TaskData {
  x: number;
  y: number;
  text?: string;
  image?: string;
  category?: string;
  [key: string]: any;
}

export interface TaskPoint {
  id: string;
  data: TaskData;
}

export interface CanvasPoint {
  id: string;
  canvasX: number;
  canvasY: number;
  category: string;
  text?: string;
}

export interface ScatterPalette {
  [category: string]: string;
}

export interface DrawScatterOpts {
  canvas: HTMLCanvasElement;
  points: TaskPoint[];
  hoveredId?: string | null;
  selectedIds?: Set<string>;
  palette: ScatterPalette;
  devicePixelRatio?: number;
} 