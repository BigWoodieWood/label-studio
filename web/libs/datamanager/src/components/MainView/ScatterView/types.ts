export interface TaskData {
  x: number;
  y: number;
  text?: string;
  image?: string;
  category?: string;
  // Allow flexible task data structures from various projects
  [key: string]: any;
}

export interface TaskPoint {
  id: string;
  data: TaskData;
}

export interface ScatterPalette {
  [category: string]: string;
} 