import React, { useState, useRef, useEffect } from "react";
import { ref, set, remove, update, onDisconnect } from "firebase/database";
import { db } from "./firebase";
import { COLOR_MATRIX } from "./constants";
import type { User } from "firebase/auth";
import type { LocksData, HistoryAction } from "./types";
import { NoteMenu } from "./NoteMenu";

interface StickyNoteProps {
  id: string;
  text: string;
  workerId: string;
  color?: string;
  column: number;
  position: number;
  categoryName?: string;
  prevPos: number | null;
  nextPos: number | null;
  onReorder: (
    noteId: string,
    oldWorkerId: string,
    newPos: number,
    oldCol: number,
    oldPos: number
  ) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isNew?: boolean;
  onEditStarted?: () => void;
  locks: LocksData;
  currentUser: User | null;
  onActivity: () => void;
  onHistory: (action: HistoryAction) => void;
  onContextMenu: (
    e: React.MouseEvent,
    noteId: string,
    workerId: string,
    text: string
  ) => void;
}

export function StickyNote({
  id,
  text,
  color,
  column,
  categoryName,
  workerId,
  position,
  prevPos,
  nextPos,
  onReorder,
  onDragStart,
  onDragEnd,
  isNew,
  onEditStarted,
  locks,
  currentUser,
  onActivity,
  onHistory,
  onContextMenu,
}: StickyNoteProps) {
  const [dropIndicator, setDropIndicator] = useState<"left" | "right" | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const initialTextRef = useRef<string>(text);

  // --- Lock Logic ---
  const lock = locks[id];
  const now = Date.now();
  const isLockValid = lock && now - lock.timestamp < 2 * 60 * 1000;
  const isLockedByOther = isLockValid && lock.userId !== currentUser?.uid;
  const lockedByName = isLockedByOther ? lock.userName : null;

  const acquireLock = async () => {
    if (!currentUser) return false;
    const lockRef = ref(db, `locks/${id}`);
    await set(lockRef, {
      userId: currentUser.uid,
      userName: currentUser.displayName || "Unknown",
      timestamp: Date.now(),
    });
    onDisconnect(lockRef).remove();
    return true;
  };

  const releaseLock = () => {
    if (!currentUser) return;
    remove(ref(db, `locks/${id}`));
    onDisconnect(ref(db, `locks/${id}`)).cancel();
  };

  const renewLock = () => {
    if (!currentUser) return;
    update(ref(db, `locks/${id}`), { timestamp: Date.now() });
  };

  // --- Effects ---

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if ((isEditing || isDragging) && !isLockedByOther) {
      interval = setInterval(renewLock, 60 * 1000);
    }
    return () => clearInterval(interval);
  }, [isEditing, isDragging, isLockedByOther]);

  useEffect(() => {
    return () => {
      if (isEditing || isDragging) releaseLock();
    };
  }, [isEditing, isDragging]);

  useEffect(() => {
    if (isNew && !isEditing && !isLockedByOther) {
      acquireLock().then(() => {
        setIsEditing(true);
        onEditStarted?.();
        initialTextRef.current = text;
      });
    }
  }, [isNew, isEditing, onEditStarted, isLockedByOther]);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(textRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  // --- Event Handlers ---

  const handleDragOver = (e: React.DragEvent) => {
    if (isEditing || isLockedByOther) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const midPointX = rect.left + rect.width / 2;
    setDropIndicator(e.clientX < midPointX ? "left" : "right");
  };

  const handleNoteDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const side = dropIndicator;
    setDropIndicator(null);
    onDragEnd(); // Call prop

    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    try {
      const { noteId, oldWorkerId, oldColumn, oldPosition } =
        JSON.parse(rawData);
      if (noteId === id) return;

      let newPos: number;
      if (side === "left") {
        newPos = prevPos !== null ? (prevPos + position) / 2 : position / 2;
      } else {
        newPos = nextPos !== null ? (nextPos + position) / 2 : position + 1000;
      }
      onReorder(noteId, oldWorkerId, newPos, oldColumn, oldPosition);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      const currentText = textRef.current?.innerText || "";
      if (currentText !== initialTextRef.current) {
        onActivity();
        onHistory({
          type: "EDIT_TEXT",
          noteId: id,
          workerId,
          prevText: initialTextRef.current,
          newText: currentText,
        });
      }
    }
    setIsEditing(false);
    releaseLock();
    if (textRef.current) {
      set(
        ref(db, `boarddata/${workerId}/notes/${id}/text`),
        textRef.current.innerText
      );
    }
  };

  const handleDoubleClick = async () => {
    if (isLockedByOther) return;
    await acquireLock();
    initialTextRef.current = text;
    setIsEditing(true);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (isEditing || isLockedByOther) {
      e.preventDefault();
      return;
    }
    acquireLock();
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({
        noteId: id,
        oldWorkerId: workerId,
        oldColumn: column,
        oldPosition: position,
      })
    );
    onDragStart(); // Call prop
    // Delay setting dragging state to allow ghost image to be created
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd(); // Call prop
    releaseLock();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(e, id, workerId, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textRef.current?.blur();
    }
  };

  // --- Render ---

  const colorFamily = COLOR_MATRIX[color || "Green"] || COLOR_MATRIX.Green;
  const shade = colorFamily.shades[column] || colorFamily.shades[0];

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={() => setDropIndicator(null)}
      onDrop={handleNoteDrop}
    >
      {dropIndicator && (
        <div
          className={`absolute top-0 bottom-0 w-1 bg-blue-500 rounded-full z-50 pointer-events-none ${
            dropIndicator === "left" ? "-left-2" : "-right-2"
          }`}
        />
      )}

      <div
        draggable={!isEditing && !isLockedByOther}
        onDoubleClick={handleDoubleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onContextMenu={handleContextMenu}
        className={`${shade.bg} ${
          shade.border
        } p-4 rotate-[-0.5deg] border-l-4 min-h-[160px] aspect-square flex flex-col transition-all group/note relative
          ${isDragging ? "opacity-30 grayscale-[0.5]" : "opacity-100"}
          ${
            isEditing
              ? "ring-4 ring-cyan-400 shadow-2xl scale-[1.02] rotate-0 z-20 cursor-text"
              : isLockedByOther
              ? "cursor-not-allowed opacity-80"
              : "shadow-sm hover:shadow-md cursor-grab"
          }
        `}
      >
        {isLockedByOther && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 flex flex-col items-center justify-center rounded-sm">
            <span className="text-2xl mb-1">🔒</span>
            <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-full">
              {lockedByName}
            </span>
          </div>
        )}

        <div
          ref={textRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`outline-none ${shade.text} text-sm font-medium leading-snug flex-grow whitespace-pre-wrap overflow-y-auto pb-6 flex flex-col justify-center text-center note-scroll`}
        >
          {text}
        </div>

        {categoryName && (
          <div
            className={`absolute bottom-2 right-2 text-[10px] italic opacity-60 pointer-events-none select-none max-w-[80%] truncate ${shade.text}`}
          >
            {categoryName}
          </div>
        )}

        {/* Note Menu (Color picker + Delete) */}
        <NoteMenu
          id={id}
          workerId={workerId}
          color={color}
          isLockedByOther={!!isLockedByOther}
          onActivity={onActivity}
          onHistory={onHistory}
          acquireLock={acquireLock}
          releaseLock={releaseLock}
        />
      </div>
    </div>
  );
}