declare global {
  interface MouseEvent {
    isWithinContextMenu?: boolean;
  }
}

export interface Note {
  text: string;
  column: number;
  color?: number; 
  position: number;
  categoryName?: string;
}

export interface WorkerData {
  name: string;
  notes?: Record<string, Note>;
  defaultColor?: number; 
}

export interface Category {
  name: string;
  items: string[];
  color?: number; 
  order?: number;
}

export interface LockData {
  userId: string;
  userName: string;
  timestamp: number;
}

export interface PresenceData {
  userId: string;
  userName: string;
  photoURL?: string;
  lastActive: number;
  online: boolean;
}

export interface SavedSnapshot {
  title: string;
  timestamp: number;
  boardData: BoardData;
  categories: CategoriesData;
  createdBy: string;
  creatorId: string;
}

export type HistoryAction =
  | {
      type: "MOVE";
      noteId: string;
      prevWorkerId: string;
      prevCol: number;
      prevPos: number;
      newWorkerId: string;
      newCol: number;
      newPos: number;
    }
  | {
      type: "ADD";
      noteId: string;
      workerId: string;
      noteData: Note;
    }
  | {
      type: "DELETE";
      noteId: string;
      workerId: string;
      noteData: Note;
    }
  | {
      type: "EDIT_TEXT";
      noteId: string;
      workerId: string;
      prevText: string;
      newText: string;
    }
  | {
      type: "EDIT_COLOR";
      noteId: string;
      workerId: string;
      prevColor: number; 
      newColor: number; 
    };

export type BoardData = Record<string, WorkerData>;
export type CategoriesData = Record<string, Category>;
export type LocksData = Record<string, LockData>;
export type AllPresenceData = Record<string, PresenceData>;
export type SnapshotsData = Record<string, SavedSnapshot>;

export interface DragOrigin {
  workerId: string;
  colIndex: number;
}

export interface BackupData {
  version: number;
  timestamp: number;
  boardData: BoardData;
  categories: CategoriesData;
  customColors: string[];
}

export interface AddToCategoryTarget {
  id: string;
  workerId: string;
  text: string;
  color?: number; 
}