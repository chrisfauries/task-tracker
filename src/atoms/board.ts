import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { selectAtom } from "jotai/utils";
import { atomFamily } from "jotai-family";
import { DatabaseService } from "../DatabaseService";
import type { BoardData } from "../types";
import { userAtom } from "./user";

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