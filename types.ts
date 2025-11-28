export type Point = {
  x: number;
  y: number;
  pressure?: number;
};

export type StrokeStyle = {
  color: string;
  size: number;
  isHighlighter?: boolean;
};

export type ElementType = 'stroke' | 'rectangle' | 'circle' | 'line' | 'text';

export interface CanvasElement {
  id: string;
  type: ElementType;
  layerId: string;
  points?: Point[]; // For strokes
  x?: number; // For shapes/text
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  style: StrokeStyle;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export type ToolType = 'pen' | 'eraser' | 'rectangle' | 'circle' | 'line' | 'text' | 'move';

export interface AppState {
  elements: CanvasElement[];
  layers: Layer[];
  activeLayerId: string;
  selectedTool: ToolType;
  currentColor: string;
  currentSize: number;
  zoom: number;
  pan: { x: number; y: number };
  history: CanvasElement[][]; // Simple snapshot history
  historyStep: number;
}