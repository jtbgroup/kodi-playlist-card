export interface DragState {
  draggedIndex: number;
  dragOverIndex: number;
  isDragging: boolean;
}

export interface IndexEventDetail {
  index: number;
}

export interface ReorderEventDetail {
  fromIndex: number;
  toIndex: number;
}