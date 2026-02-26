import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { DatabaseService } from "../DatabaseService";
import type { HistoryAction } from "../types";
import { userAtom } from "./user";
import { trackActivityAtom } from "./activity";

// History Atoms
const historyListAtom = atom<HistoryAction[]>([]);
const pointerAtom = atom<number>(-1);

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