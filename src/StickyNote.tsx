import React, { useState, useRef, useEffect } from "react";
import { DatabaseService } from "./DatabaseService";
import { getNoteStyles } from "./constants";
import type { User } from "firebase/auth";
import type { LocksData, HistoryAction } from "./types";
import { NoteMenu } from "./NoteMenu";
import { useSetAtom } from "jotai";
import { addToCategoryTargetAtom, contextMenuPosAtom } from "./atoms";

interface StickyNoteProps {
  id: string;
  text: string;
  workerId: string;
  color?: number; 
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
}: StickyNoteProps) {
  const setAddToCategoryTarget = useSetAtom(addToCategoryTargetAtom);
  const setContextMenuPos = useSetAtom(contextMenuPosAtom);
  const [dropIndicator, setDropIndicator] = useState<"left" | "right" | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const initialTextRef = useRef<string>(text);

  const lock = locks[id];
  const now = Date.now();
  const isLockValid = lock && now - lock.timestamp < 2 * 60 * 1000;
  const isLockedByOther = isLockValid && lock.userId !== currentUser?.uid;
  const lockedByName = isLockedByOther ? lock.userName : null;

  const acquireLock = async () => {
    if (!currentUser) return false;
    await DatabaseService.acquireLock(id, currentUser);
    return true;
  };

  const releaseLock = async () => {
    if (!currentUser) return;
    await DatabaseService.releaseLock(id);
  };

  const renewLock = async () => {
    if (!currentUser) return;
    await DatabaseService.renewLock(id);
  };

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
    onDragEnd();

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
      DatabaseService.updateNoteText(workerId, id, textRef.current.innerText);
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
    onDragStart();
    setTimeout(() => setIsDragging(true), 0);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd();
    releaseLock();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAddToCategoryTarget({ id, workerId, text, color });
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      textRef.current?.blur();
    }
  };

  // Resolve Styles dynamically
  const styles = getNoteStyles(color, column);

  // Use inline styles for dynamic background/border colors 
  // because Tailwind JIT often fails to detect constructed class names (e.g. "bg-user-1/20")
  // unless they explicitly exist in the source code or safelist.
  const colorIndex = typeof color === "number" ? color : 0;
  const colorVar = `var(--color-user-${colorIndex + 1})`;

  let dynamicStyle: React.CSSProperties = {};

  if (column === 0) {
    // Assigned: 
    dynamicStyle = {
      backgroundColor: `color-mix(in srgb, ${colorVar}, transparent 60%)`,
      borderColor: `color-mix(in srgb, ${colorVar}, transparent 30%)`,
    };
  } else if (column === 1) {
    // In Progress: 
    dynamicStyle = {
      backgroundColor: `color-mix(in srgb, ${colorVar}, transparent 25%)`,
      borderColor: colorVar,
    };
  } else {
    // Completed: 
    dynamicStyle = {
      backgroundColor: `color-mix(in srgb, ${colorVar}, transparent 90%)`,
      borderColor: `color-mix(in srgb, ${colorVar}, transparent 70%)`,
    };
  }

  return (
    <div
      className="relative @container"
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
        style={dynamicStyle}
        className={`
          ${styles.text}
          p-0 rotate-[-0.5deg] border-l-4 min-h-[90px] aspect-square flex flex-col transition-all group/note relative overflow-hidden
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
          style={{
            maskImage:
              "linear-gradient(to bottom, black 80%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 80%, transparent 100%)",
          }}
          className="flex-grow overflow-y-auto overflow-x-hidden note-scroll"
        >

          <div
            ref={textRef}
            contentEditable={isEditing}
            suppressContentEditableWarning
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`
              outline-none ${styles.text} 
              text-[clamp(0.6rem,10cqw,1.1rem)] 
              font-medium leading-snug 
              w-full min-h-full
              flex flex-col justify-center items-center text-center
              px-3 py-3 whitespace-pre-wrap break-words
            `}
          >
            {text}
          </div>
        </div>

        {categoryName && (
          <div
            className={`absolute bottom-2 right-2 text-[10px] italic opacity-60 pointer-events-none select-none max-w-[80%] truncate ${styles.text}`}
          >
            {categoryName}
          </div>
        )}

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