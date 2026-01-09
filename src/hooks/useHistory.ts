import { useState, useEffect } from "react";
import { DatabaseService } from "../DatabaseService";
import type { User } from "firebase/auth";
import type { HistoryAction } from "../types";

export function useHistory(user: User | null, trackActivity: () => void) {
  const [history, setHistory] = useState<HistoryAction[]>([]);
  const [future, setFuture] = useState<HistoryAction[]>([]);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      setFuture([]);
    }
  }, [user]);

  const registerHistory = (action: HistoryAction) => {
    setHistory((prev) => [...prev, action]);
    setFuture([]); 
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
        const currentNote = await DatabaseService.getNote(action.newWorkerId, action.noteId);
        if (currentNote) {
          // Move back to old location
          await DatabaseService.moveNote(
            action.noteId,
            action.newWorkerId, // current loc
            action.prevWorkerId, // target loc (old)
            { ...currentNote, column: action.prevCol, position: action.prevPos }
          );
        }
        break;
      case "ADD":
        await DatabaseService.deleteNote(action.workerId, action.noteId);
        break;
      case "DELETE":
        await DatabaseService.addNote(action.workerId, action.noteId, action.noteData);
        break;
      case "EDIT_TEXT":
        await DatabaseService.updateNoteText(action.workerId, action.noteId, action.prevText);
        break;
      case "EDIT_COLOR":
        await DatabaseService.updateNoteColor(action.workerId, action.noteId, action.prevColor);
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
        const currentNote = await DatabaseService.getNote(action.prevWorkerId, action.noteId);
        if (currentNote) {
           await DatabaseService.moveNote(
            action.noteId,
            action.prevWorkerId,
            action.newWorkerId,
            { ...currentNote, column: action.newCol, position: action.newPos }
          );
        }
        break;
      case "ADD":
        await DatabaseService.addNote(action.workerId, action.noteId, action.noteData);
        break;
      case "DELETE":
        await DatabaseService.deleteNote(action.workerId, action.noteId);
        break;
      case "EDIT_TEXT":
        await DatabaseService.updateNoteText(action.workerId, action.noteId, action.newText);
        break;
      case "EDIT_COLOR":
        await DatabaseService.updateNoteColor(action.workerId, action.noteId, action.newColor);
        break;
    }
  };

  return { history, future, registerHistory, handleUndo, handleRedo };
}