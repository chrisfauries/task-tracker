import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { selectAtom } from "jotai/utils";
import { atomFamily } from "jotai-family";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "./firebase";
import { DatabaseService } from "./DatabaseService";
import type {
  SnapshotsData,
  CategoriesData,
  AddToCategoryTarget,
  BoardData,
  LocksData,
  AllPresenceData,
  DragOrigin,
  HistoryAction,
} from "./types";

// User Atom
const _userStorageAtom = atom<User | null>(null);
_userStorageAtom.onMount = (setSelf) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setSelf(user);
  });
  return () => unsubscribe();
};

export const userAtom = atom((get) => get(_userStorageAtom));

// Logout Atom
export const logoutAtom = atom(null, async (get, set) => {
  const user = get(userAtom);
  if (user) {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = new Date().toLocaleDateString();
    await set(
      snapshotsAtom,
      `${user.displayName} logged out @ ${timeStr} on ${dateStr}`,
    );
  }
  await signOut(auth);
});

// Dark Mode Atom
const _darkModeStorageAtom = atom(false);
export const darkModeDomEffect = atomEffect((get) => {
  if (get(_darkModeStorageAtom)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
});
export const darkModeSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (user) {
    const unsubscribe = DatabaseService.subscribeToTheme(user.uid, (isDark) => {
      set(_darkModeStorageAtom, isDark);
    });
    return () => unsubscribe();
  } else {
    set(_darkModeStorageAtom, false);
  }
});
export const darkModeAtom = atom(
  (get) => get(_darkModeStorageAtom),
  (get, set, newMode: boolean) => {
    // Optimistic Update
    set(_darkModeStorageAtom, newMode);

    // Write to Database if logged in
    const user = get(userAtom);
    if (user) {
      DatabaseService.saveTheme(user.uid, newMode);
    }
  },
);

/**
 * Snapshot Atoms
 */
export const isSnapshotDialogOpenAtom = atom(false);
export const snapshotsLoadingAtom = atom(
  (get) => get(_snapshotsStorageAtom) === null,
);

export const _snapshotsStorageAtom = atom<SnapshotsData | null>(null);
export const snapshotsSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_snapshotsStorageAtom, null);
    return;
  }
  const unsubscribe = DatabaseService.subscribeToSnapshots((data) => {
    set(_snapshotsStorageAtom, data);
  });
  return () => unsubscribe();
});

export const snapshotsAtom = atom(
  (get) => {
    const data = get(_snapshotsStorageAtom);
    if (!data) return [];
    return Object.entries(data).sort((a, b) => b[1].timestamp - a[1].timestamp);
  },
  async (get, _, reason: string) => {
    const user = get(userAtom);
    if (!user) return;
    const boardData = get(boardDataAtom);
    const categories = get(categoriesAtom);
    await DatabaseService.saveSnapshot(user, reason, boardData, categories);
  },
);

// Login Snapshot Logic
const _hasLoggedLoginSnapshotAtom = atom(false);

export const snapshotsLoginSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  const hasLogged = get(_hasLoggedLoginSnapshotAtom);

  if (!user) {
    if (hasLogged) {
      set(_hasLoggedLoginSnapshotAtom, false);
    }
    return;
  }

  const boardData = get(boardDataAtom);
  const categories = get(categoriesAtom);

  if (
    !hasLogged &&
    Object.keys(boardData).length > 0 &&
    Object.keys(categories).length > 0
  ) {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = new Date().toLocaleDateString();
    set(
      snapshotsAtom,
      `${user.displayName} logged in @ ${timeStr} on ${dateStr}`,
    );
    set(_hasLoggedLoginSnapshotAtom, true);
  }
});

// Activity Tracking Atom
const _activityTimeoutAtom = atom<ReturnType<typeof setTimeout> | null>(null);

export const trackActivityAtom = atom(null, (get, set) => {
  const currentTimeout = get(_activityTimeoutAtom);
  if (currentTimeout) {
    clearTimeout(currentTimeout);
  }

  const newTimeout = setTimeout(() => {
    const user = auth.currentUser;
    if (user) {
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = new Date().toLocaleDateString();
      set(
        snapshotsAtom,
        `${user.displayName} made changes @ ${timeStr} on ${dateStr}`,
      );
    }
  }, 60000 * 5); // 5 minutes

  set(_activityTimeoutAtom, newTimeout);
});

// Board Data Atoms
const _boardDataStorageAtom = atom<BoardData>({});
export const boardDataAtom = atom(
  (get) => get(_boardDataStorageAtom),
  (_, set, newData: BoardData) => set(_boardDataStorageAtom, newData),
);

export const boardDataSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_boardDataStorageAtom, {});
    return;
  }
  const unsubscribe = DatabaseService.subscribeToBoardData((data) => {
    set(_boardDataStorageAtom, data);
  });
  return () => unsubscribe();
});

// Worker Ids
export const workerIdsAtom = selectAtom(
  boardDataAtom,
  (board) => {
    return Object.keys(board || {}).sort((a, b) => {
      const posA = board[a].position ?? Number.MAX_SAFE_INTEGER;
      const posB = board[b].position ?? Number.MAX_SAFE_INTEGER;
      if (posA === posB) {
        return (board[a].name || "").localeCompare(board[b].name || "");
      }
      return posA - posB;
    });
  },
  (prev, next) =>
    prev.length === next.length && prev.every((val, i) => val === next[i]),
);

export const workerFamily = atomFamily((workerId: string) =>
  selectAtom(
    boardDataAtom,
    (board) => board[workerId],
    (prev, next) => JSON.stringify(prev) === JSON.stringify(next), // TODO: this is probably slow
  ),
);

export const workerNameFamily = atomFamily((workerId: string) =>
  selectAtom(boardDataAtom, (board) => board[workerId].name),
);

export const workerDefaultColorFamily = atomFamily((workerId: string) =>
  selectAtom(boardDataAtom, (board) => board[workerId].defaultColor),
);

interface NoteListKey {
  workerId: string;
  colIndex: number;
}

// worker notes list family (positioning)
export const columnNotesListFamily = atomFamily(
  ({ workerId, colIndex }: NoteListKey) =>
    selectAtom(
      workerFamily(workerId),
      (worker) => {
        if (!worker || !worker.notes) return [];

        return Object.entries(worker.notes)
          .filter(
            ([_, n]) =>
              n.column === colIndex &&
              typeof n.position === "number" &&
              !isNaN(n.position),
          )
          .map(([id, n]) => ({ id, position: n.position }))
          .sort((a, b) => a.position - b.position);
      },
      // Custom deep equality for the array of objects so we only trigger updates if order or IDs change
      (prev, next) => {
        if (prev.length !== next.length) return false;
        for (let i = 0; i < prev.length; i++) {
          if (
            prev[i].id !== next[i].id ||
            prev[i].position !== next[i].position
          )
            return false;
        }
        return true;
      },
    ),
  (a, b) => a.workerId === b.workerId && a.colIndex === b.colIndex,
);

interface NoteKey {
  workerId: string;
  noteId: string;
}

// Worker Note
export const noteFamily = atomFamily(
  ({ workerId, noteId }: NoteKey) =>
    selectAtom(
      boardDataAtom,
      (board) => board[workerId].notes?.[noteId],
      (prev, next) => JSON.stringify(prev) === JSON.stringify(next), // TODO: this is probably slow
    ),
  (a, b) => a.workerId === b.workerId && a.noteId === b.noteId,
);

// Category Atoms
const _categoriesStorageAtom = atom<CategoriesData>({});
export const isCategoryManagementDialogOpenAtom = atom(false);
export const isAddToCategoryDialogOpenAtom = atom(false);
export const addToCategoryTargetAtom = atom<AddToCategoryTarget | null>(null);
export const categoriesAtom = atom(
  (get) => get(_categoriesStorageAtom),
  (_, set, newData: CategoriesData) => set(_categoriesStorageAtom, newData),
);

export const categoriesSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_categoriesStorageAtom, {});
    return;
  }
  const unsubscribe = DatabaseService.subscribeToCategories((data) => {
    set(_categoriesStorageAtom, data);
  });
  return () => unsubscribe();
});

export const applyCategoryAtom = atom(
  null,
  async (
    get,
    set,
    {
      catId,
      workerId,
      colIndex,
    }: { catId: string; workerId: string; colIndex: number },
  ) => {
    const categories = get(categoriesAtom);
    const boardData = get(boardDataAtom);

    const category = categories[catId];
    if (!category || !category.items) return;

    set(trackActivityAtom);

    const workerNotes = boardData[workerId]?.notes || {};
    const validPositions = Object.values(workerNotes)
      .filter(
        (n) =>
          n.column === colIndex &&
          typeof n.position === "number" &&
          !isNaN(n.position),
      )
      .map((n) => n.position);
    const lastPos = validPositions.length > 0 ? Math.max(...validPositions) : 0;

    for (const [index, text] of category.items.entries()) {
      await DatabaseService.createNote(workerId, {
        text,
        column: colIndex,
        color: category.color !== undefined ? category.color : 0,
        position: lastPos + 1000 + index * 10,
        categoryName: category.name,
      });
    }
  },
);

// Locks Atom
const _locksStorageAtom = atom<LocksData>({});
export const locksAtom = atom(
  (get) => get(_locksStorageAtom),
  (_, set, newData: LocksData) => set(_locksStorageAtom, newData),
);

export const locksSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_locksStorageAtom, {});
    return;
  }
  const unsubscribe = DatabaseService.subscribeToLocks((data) => {
    set(_locksStorageAtom, data);
  });
  return () => unsubscribe();
});

// Presence Atom
const _presenceStorageAtom = atom<AllPresenceData>({});
export const presenceAtom = atom(
  (get) => get(_presenceStorageAtom),
  (_, set, newData: AllPresenceData) => set(_presenceStorageAtom, newData),
);

export const presenceSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_presenceStorageAtom, {});
    return;
  }
  const unsubscribe = DatabaseService.subscribeToPresence((data) => {
    set(_presenceStorageAtom, data);
  });
  DatabaseService.initializePresence(user);
  return () => unsubscribe();
});

// Context Menu State
export const contextMenuPosAtom = atom<{ x: number; y: number } | null>(null);
export const appSettingsMenuPosAtom = atom<{ x: number; y: number } | null>(
  null,
);

// Worker Modal Atoms
export const isAddWorkerDialogOpenAtom = atom(false);

export const isEditWorkerDialogOpenAtom = atom(false);
export const editingWorkerAtom = atom<{
  id: string;
  name: string;
  color: number;
} | null>(null);

export const isDeleteWorkerDialogOpenAtom = atom(false);
export const workerToDeleteAtom = atom<{ id: string; name: string } | null>(
  null,
);

export const isWorkerOrderDialogOpenAtom = atom(false);

// Custom Colors Dialog Atom
export const isCustomColorsDialogOpenAtom = atom(false);

// Due Date Dialog Atom
export const isDueDateDialogOpenAtom = atom(false);

// Import/Export Dialog Atom
export const isImportExportDialogOpenAtom = atom(false);

// Search and Filter Atoms (Non-persistent)
export const searchQueryAtom = atom("");
export const selectedCategoriesAtom = atom<string[]>([]);

// Custom Palette Atom
// Defaults match the CSS defaults
export const DEFAULT_PALETTE_HEX = [
  "#10B981", // Green
  "#3B82F6", // Blue
  "#EAB308", // Yellow
  "#EF4444", // Red
  "#F97316", // Orange
  "#A855F7", // Purple
  "#EC4899", // Pink
];
const _customPalettePrimitiveAtom = atom<string[]>(DEFAULT_PALETTE_HEX);
const _customPaletteStorageAtom = atom(
  (get) => get(_customPalettePrimitiveAtom),
  (_, set, newColors: string[]) => {
    set(_customPalettePrimitiveAtom, newColors);
    if (newColors && newColors.length > 0) {
      newColors.forEach((color, index) => {
        document.documentElement.style.setProperty(
          `--color-user-${index + 1}`,
          color,
        );
      });
    }
  },
);

export const customPaletteSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_customPaletteStorageAtom, DEFAULT_PALETTE_HEX);
    return;
  }
  const unsubscribe = DatabaseService.subscribeToCustomPalette((colors) => {
    if (colors && Array.isArray(colors) && colors.length > 0) {
      set(_customPaletteStorageAtom, colors);
    }
  });
  return () => unsubscribe();
});

export const customPaletteAtom = atom(
  (get) => get(_customPaletteStorageAtom),
  (_, set, newColors: string[]) => {
    set(_customPaletteStorageAtom, newColors);
    DatabaseService.saveCustomPalette(newColors);
  },
);

// Drag Origin Atom
export const dragOriginAtom = atom<DragOrigin | null>(null);

export const dragOriginEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) return;
  const handleGlobalDragEnd = () => set(dragOriginAtom, null);
  window.addEventListener("dragend", handleGlobalDragEnd);
  return () => window.removeEventListener("dragend", handleGlobalDragEnd);
});

// History Atoms
const historyListAtom = atom<HistoryAction[]>([]);
const pointerAtom = atom<number>(-1);

export const historyAtom = atom((get) => {
  const list = get(historyListAtom);
  const pointer = get(pointerAtom);
  return list.slice(0, pointer + 1);
});

export const futureAtom = atom((get) => {
  const list = get(historyListAtom);
  const pointer = get(pointerAtom);
  return list.slice(pointer + 1).reverse();
});

export const canUndoAtom = atom((get) => get(pointerAtom) >= 0);

export const canRedoAtom = atom((get) => {
  const list = get(historyListAtom);
  const pointer = get(pointerAtom);
  return pointer < list.length - 1;
});

export const registerHistoryAtom = atom(
  null,
  (get, set, action: HistoryAction) => {
    const list = get(historyListAtom);
    const pointer = get(pointerAtom);
    const newHistory = list.slice(0, pointer + 1);
    set(historyListAtom, [...newHistory, action]);
    set(pointerAtom, pointer + 1);
    set(trackActivityAtom);
  },
);

export const undoAtom = atom(null, async (get, set) => {
  const pointer = get(pointerAtom);
  const historyList = get(historyListAtom);

  if (pointer < 0) return;

  const action = historyList[pointer];
  set(pointerAtom, pointer - 1);
  set(trackActivityAtom);

  switch (action.type) {
    case "MOVE": {
      const currentNote = await DatabaseService.getNote(
        action.newWorkerId,
        action.noteId,
      );
      if (currentNote) {
        // Move back to old location
        await DatabaseService.moveNote(
          action.noteId,
          action.newWorkerId, // current loc
          action.prevWorkerId, // target loc (old)
          {
            ...currentNote,
            column: action.prevCol,
            position: action.prevPos,
          },
        );
      }
      break;
    }
    case "ADD":
      await DatabaseService.deleteNote(action.workerId, action.noteId);
      break;
    case "DELETE":
      await DatabaseService.addNote(
        action.workerId,
        action.noteId,
        action.noteData,
      );
      break;
    case "EDIT_TEXT":
      await DatabaseService.updateNoteText(
        action.workerId,
        action.noteId,
        action.prevText,
      );
      break;
    case "EDIT_COLOR":
      await DatabaseService.updateNoteColor(
        action.workerId,
        action.noteId,
        action.prevColor,
      );
      break;
  }
});

export const redoAtom = atom(null, async (get, set) => {
  const pointer = get(pointerAtom);
  const historyList = get(historyListAtom);

  if (pointer >= historyList.length - 1) return;

  const action = historyList[pointer + 1];
  set(pointerAtom, pointer + 1);
  set(trackActivityAtom);

  switch (action.type) {
    case "MOVE": {
      const currentNote = await DatabaseService.getNote(
        action.prevWorkerId,
        action.noteId,
      );
      if (currentNote) {
        await DatabaseService.moveNote(
          action.noteId,
          action.prevWorkerId,
          action.newWorkerId,
          { ...currentNote, column: action.newCol, position: action.newPos },
        );
      }
      break;
    }
    case "ADD":
      await DatabaseService.addNote(
        action.workerId,
        action.noteId,
        action.noteData,
      );
      break;
    case "DELETE":
      await DatabaseService.deleteNote(action.workerId, action.noteId);
      break;
    case "EDIT_TEXT":
      await DatabaseService.updateNoteText(
        action.workerId,
        action.noteId,
        action.newText,
      );
      break;
    case "EDIT_COLOR":
      await DatabaseService.updateNoteColor(
        action.workerId,
        action.noteId,
        action.newColor,
      );
      break;
  }
});

export const historyEffectAtom = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(historyListAtom, []);
    set(pointerAtom, -1);
  }
});
