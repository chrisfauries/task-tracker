import React, { useState } from "react";
import { ref, set, push, remove, onValue, get } from "firebase/database";
import { db } from "./firebase";
import { BELL_SOUND_URL } from "./constants";
import { StickyNote } from "./StickyNote";
import type { User } from "firebase/auth";
import type { Note, LocksData, HistoryAction, DragOrigin } from "./types";

interface DropZoneProps {
  workerId: string;
  colIndex: number;
  notes: Record<string, Note>;
  defaultColor?: string;
  dragOrigin: DragOrigin | null;
  onDragStart: (origin: DragOrigin) => void;
  onDragEnd: () => void;
  locks: LocksData;
  currentUser: User | null;
  onActivity: () => void;
  onHistory: (action: HistoryAction) => void;
}

export function DropZone({
  workerId,
  colIndex,
  notes,
  defaultColor,
  dragOrigin,
  onDragStart,
  onDragEnd,
  locks,
  currentUser,
  onActivity,
  onHistory,
}: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [autoEditId, setAutoEditId] = useState<string | null>(null);

  const isDraggingFromHere =
    dragOrigin?.workerId === workerId && dragOrigin?.colIndex === colIndex;

  const sortedNotes = Object.entries(notes)
    .filter(
      ([_, n]) =>
        n.column === colIndex &&
        typeof n.position === "number" &&
        !isNaN(n.position)
    )
    .sort((a, b) => a[1].position - b[1].position);

  const handleMove = (
    noteId: string,
    oldWorkerId: string,
    newPosition: number,
    oldCol: number,
    oldPos: number
  ) => {
    if (isNaN(newPosition)) {
      console.error("Attempted to set NaN position");
      return;
    }

    onActivity();

    onHistory({
      type: "MOVE",
      noteId,
      prevWorkerId: oldWorkerId,
      prevCol: oldCol,
      prevPos: oldPos,
      newWorkerId: workerId,
      newCol: colIndex,
      newPos: newPosition,
    });

    if (colIndex === 2 && dragOrigin && dragOrigin.colIndex !== 2) {
      new Audio(BELL_SOUND_URL)
        .play()
        .catch((e) => console.log("Audio play failed", e));
    }

    onValue(
      ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`),
      (snap) => {
        const data = snap.val();
        if (data) {
          remove(ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`));
          set(ref(db, `boarddata/${workerId}/notes/${noteId}`), {
            ...data,
            column: colIndex,
            position: newPosition,
          });
        }
      },
      { onlyOnce: true }
    );
  };

  const handleTrashDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragEnd();
    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    try {
      const { noteId, oldWorkerId } = JSON.parse(rawData);
      onActivity();

      const snap = await get(
        ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`)
      );
      if (snap.exists()) {
        const noteData = snap.val();
        onHistory({
          type: "DELETE",
          noteId,
          workerId: oldWorkerId,
          noteData,
        });

        remove(ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`));
        remove(ref(db, `locks/${noteId}`));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDragEnd();
    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    try {
      const { noteId, oldWorkerId, oldColumn, oldPosition } =
        JSON.parse(rawData);
      const lastPos =
        sortedNotes.length > 0
          ? sortedNotes[sortedNotes.length - 1][1].position
          : 0;
      handleMove(noteId, oldWorkerId, lastPos + 1000, oldColumn, oldPosition);
      remove(ref(db, `locks/${noteId}`));
    } catch (err) {
      console.error(err);
    }
  };

  const addNote = () => {
    onActivity();
    const lastPos =
      sortedNotes.length > 0
        ? sortedNotes[sortedNotes.length - 1][1].position
        : 0;
    const newNoteRef = push(ref(db, `boarddata/${workerId}/notes`));
    const newNote: Note = {
      text: "New Task",
      column: colIndex,
      position: lastPos + 1000,
      color: defaultColor || "Green",
    };

    onHistory({
      type: "ADD",
      noteId: newNoteRef.key!,
      workerId,
      noteData: newNote,
    });

    setAutoEditId(newNoteRef.key);
    set(newNoteRef, newNote);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsOver(true);
      }}
      onDragEnter={() => setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleContainerDrop}
      className={`bg-slate-200/40 border-2 rounded-lg p-4 flex flex-col gap-4 transition-all relative group/zone min-h-[160px] h-full ${
        isOver
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
          : "border-dashed border-transparent"
      }`}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] auto-rows-min gap-4 flex-grow">
        {sortedNotes.map(([id, note], index) => (
          <StickyNote
            key={id}
            id={id}
            text={note.text}
            color={note.color}
            column={colIndex}
            categoryName={note.categoryName}
            workerId={workerId}
            position={note.position}
            prevPos={index > 0 ? sortedNotes[index - 1][1].position : null}
            nextPos={
              index < sortedNotes.length - 1
                ? sortedNotes[index + 1][1].position
                : null
            }
            onReorder={handleMove}
            onDragStart={() => onDragStart({ workerId, colIndex })}
            onDragEnd={onDragEnd}
            isNew={id === autoEditId}
            onEditStarted={() => setAutoEditId(null)}
            locks={locks}
            currentUser={currentUser}
            onActivity={onActivity}
            onHistory={onHistory}
          />
        ))}

        <div className="flex items-center justify-center min-h-[100px] aspect-square">
          <button
            onClick={addNote}
            className="opacity-0 group-hover/zone:opacity-100 text-slate-400 hover:text-slate-600 text-3xl transition-opacity p-4 border-2 border-dashed border-slate-300 rounded-lg w-full h-full flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {isDraggingFromHere && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add(
              "bg-red-100",
              "border-red-500",
              "scale-[1.02]"
            );
          }}
          onDragLeave={(e) =>
            e.currentTarget.classList.remove(
              "bg-red-100",
              "border-red-500",
              "scale-[1.02]"
            )
          }
          onDrop={handleTrashDrop}
          className="h-12 border-2 border-dashed border-red-300 rounded-lg flex items-center justify-center text-red-500 transition-all gap-2 bg-white/50 animate-in slide-in-from-bottom-2 duration-200"
        >
          <span className="text-lg">🗑️</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            Drop to Delete
          </span>
        </div>
      )}
    </div>
  );
}
