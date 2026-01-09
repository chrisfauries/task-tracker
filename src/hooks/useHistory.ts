import { useState, useEffect } from "react";
import { ref, set, remove, get } from "firebase/database";
import { db } from "../firebase";
import type { User } from "firebase/auth";
import type { HistoryAction } from "../types";

export function useHistory(user: User | null, trackActivity: () => void) {
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [future, setFuture] = useState<HistoryAction[]>([]);

  // Clear history on logout
  useEffect(() => {
    if (!user) {
      setHistory([]);
      setFuture([]);
    }
  }, [user]);

  const registerHistory = (action: HistoryAction) => {
    setHistory((prev) => [...prev, action]);
    setFuture([]); // Clear redo stack on new action
    trackActivity();
  };

  const handleUndo = async () => {
    if (history.length === 0) return;
    const action = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [...prev, action]);
    trackActivity();

    switch (action.type) {
      case "MOVE":
        const snapMove = await get(
          ref(db, `boarddata/${action.newWorkerId}/notes/${action.noteId}`)
        );

        if (snapMove.exists()) {
          const noteVal = snapMove.val();

          // Restore to previous location
          await set(
            ref(db, `boarddata/${action.prevWorkerId}/notes/${action.noteId}`),
            {
              ...noteVal,
              column: action.prevCol,
              position: action.prevPos,
            }
          );

          if (action.newWorkerId !== action.prevWorkerId) {
            await remove(
              ref(db, `boarddata/${action.newWorkerId}/notes/${action.noteId}`)
            );
          }
        }
        break;
      case "ADD":
        await remove(
          ref(db, `boarddata/${action.workerId}/notes/${action.noteId}`)
        );
        break;
      case "DELETE":
        await set(
          ref(db, `boarddata/${action.workerId}/notes/${action.noteId}`),
          action.noteData
        );
        break;
      case "EDIT_TEXT":
        await set(
          ref(db, `boarddata/${action.workerId}/notes/${action.noteId}/text`),
          action.prevText
        );
        break;
      case "EDIT_COLOR":
        await set(
          ref(db, `boarddata/${action.workerId}/notes/${action.noteId}/color`),
          action.prevColor
        );
        break;
    }
  };

  const handleRedo = async () => {
    if (future.length === 0) return;
    const action = future[future.length - 1];
    setFuture((prev) => prev.slice(0, -1));
    setHistory((prev) => [...prev, action]);
    trackActivity();

    switch (action.type) {
      case "MOVE":
        const snapMove = await get(
          ref(db, `boarddata/${action.prevWorkerId}/notes/${action.noteId}`)
        );
        if (snapMove.exists()) {
          const noteVal = snapMove.val();

          await set(
            ref(db, `boarddata/${action.newWorkerId}/notes/${action.noteId}`),
            {
              ...noteVal,
              column: action.newCol,
              position: action.newPos,
            }
          );

          if (action.prevWorkerId !== action.newWorkerId) {
            await remove(
              ref(db, `boarddata/${action.prevWorkerId}/notes/${action.noteId}`)
            );
          }
        }
        break;
      case "ADD":
        await set(
          ref(db, `boarddata/${action.workerId}/notes/${action.noteId}`),
          action.noteData
        );
        break;
      case "DELETE":
        await remove(
          ref(db, `boarddata/${action.workerId}/notes/${action.noteId}`)
        );
        break;
      case "EDIT_TEXT":
        await set(
          ref(db, `boarddata/${action.workerId}/notes/${action.noteId}/text`),
          action.newText
        );
        break;
      case "EDIT_COLOR":
        await set(
          ref(db, `boarddata/${action.workerId}/notes/${action.noteId}/color`),
          action.newColor
        );
        break;
    }
  };

  return { history, future, registerHistory, handleUndo, handleRedo };
}