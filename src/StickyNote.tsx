import React, { useState, useRef, useEffect, useMemo } from "react";
import { DatabaseService } from "./DatabaseService";
import { getNoteStyles } from "./constants";
import type { User } from "firebase/auth";
import type { LocksData, HistoryAction } from "./types";
import { NoteMenu } from "./NoteMenu";
import { useSetAtom, useAtomValue } from "jotai";
import {
  addToCategoryTargetAtom,
  contextMenuPosAtom,
  searchQueryAtom,
  selectedCategoriesAtom,
} from "./atoms";

interface StickyNoteProps {
  id: string;
  text: string;
  workerId: string;
  color?: number;
  column: number;
  position: number;
  categoryName?: string;
  dueDate?: string;
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

// Helper to format due date label
function getDueDateLabel(
  dateString: string | undefined
): { label: string; status: "past" | "today" | "tomorrow" | "future" } | null {
  if (!dateString) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Parse YYYY-MM-DD
  const [y, m, d] = dateString.split("-").map(Number);
  const due = new Date(y, m - 1, d);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `-${Math.abs(diffDays)}d`, status: "past" };
  if (diffDays === 0) return { label: "Today", status: "today" };
  if (diffDays === 1) return { label: "Tomorrow", status: "tomorrow" };

  // Future (2+ days)
  if (diffDays < 7) return { label: `+${diffDays}d`, status: "future" };
  const weeks = Math.floor(diffDays / 7);
  const days = diffDays % 7;
  return {
    label: days === 0 ? `+${weeks}w` : `+${weeks}w${days}d`,
    status: "future",
  };
}

function getDueDateBackgroundTranparency(column: number) {
  switch (column) {
    case 0:
      return "50%";
    case 1:
      return "15%";
    default:
      return "80%";
  }
}

export function StickyNote({
  id,
  text,
  color,
  column,
  categoryName,
  dueDate,
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

  // Search & Filter State
  const searchQuery = useAtomValue(searchQueryAtom);
  const selectedCategories = useAtomValue(selectedCategoriesAtom);

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

  // Calculate if filtered out
  const isFilteredOut = useMemo(() => {
    if (!searchQuery && selectedCategories.length === 0) return false;

    const matchesSearch =
      !searchQuery || text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategories.length === 0 ||
      (categoryName && selectedCategories.includes(categoryName));

    return !(matchesSearch && matchesCategory);
  }, [searchQuery, selectedCategories, text, categoryName]);

  // Determine if this note should be highlighted (Matches filter/search and isn't currently being dragged)
  const hasActiveFilter = !!searchQuery || selectedCategories.length > 0;
  const isHighlighted = hasActiveFilter && !isFilteredOut && !isDragging;

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
    // Pass existing date to context menu atom
    setAddToCategoryTarget({ id, workerId, text, color, dueDate });
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
  const colorIndex = typeof color === "number" ? color : 0;
  const colorVar = `var(--color-user-${colorIndex + 1})`;

  let dynamicStyle: React.CSSProperties = {};

  if (column === 0) {
    dynamicStyle = {
      backgroundColor: `color-mix(in srgb, ${colorVar}, transparent 60%)`,
      borderColor: `color-mix(in srgb, ${colorVar}, transparent 30%)`,
    };
  } else if (column === 1) {
    dynamicStyle = {
      backgroundColor: `color-mix(in srgb, ${colorVar}, transparent 25%)`,
      borderColor: colorVar,
    };
  } else {
    dynamicStyle = {
      backgroundColor: `color-mix(in srgb, ${colorVar}, transparent 90%)`,
      borderColor: `color-mix(in srgb, ${colorVar}, transparent 70%)`,
    };
  }

  // Calculate Due Date Badge Styles
  const dateInfo = getDueDateLabel(dueDate);

  let badgeClasses =
    "absolute top-1 left-1 px-1.5 py-0.5 rounded z-10 pointer-events-none border transition-all ";
  let badgeStyle: React.CSSProperties = {};

  if (dateInfo) {
    switch (dateInfo.status) {
      case "past":
        badgeClasses +=
          "bg-red-500 text-red-950 border-red-600 font-bold text-[12px] shadow-lg animate-[pulse_1s_cubic-bezier(0.4,0,0.6,1)_infinite]";
        break;
      case "today":
        badgeClasses +=
          "bg-orange-400 text-red-800 border-orange-500 font-bold text-[12px] shadow-md animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]";
        break;
      case "tomorrow":
        badgeClasses +=
          "bg-yellow-100/80 text-yellow-900 border-yellow-200 text-[10px] shadow-sm";
        break;
      case "future":
      default:
        badgeClasses +=
          "text-slate-800 backdrop-blur-[2px] text-[10px] shadow-sm";
        badgeStyle = {
          backgroundColor: `color-mix(in srgb, ${colorVar}, transparent ${getDueDateBackgroundTranparency(
            column
          )})`,
          borderColor: `color-mix(in srgb, ${colorVar}, transparent 40%)`,
        };
        break;
    }
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
          ${
            isDragging || isFilteredOut
              ? "opacity-30 grayscale-[0.5]"
              : "opacity-100"
          }
          ${
            isEditing
              ? "ring-4 ring-cyan-400 shadow-2xl scale-[1.02] rotate-0 z-20 cursor-text"
              : isLockedByOther
              ? "cursor-not-allowed opacity-80"
              : isFilteredOut
              ? "shadow-sm"
              : `${
                  isHighlighted ? "shadow-xl z-10" : "shadow-sm"
                } hover:shadow-xl hover:scale-[1.02] cursor-grab`
          }
        `}
      >
        {isFilteredOut && (
          <div
            className="absolute inset-0 z-50 pointer-events-none"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                rgba(0, 0, 0, 0.05),
                rgba(0, 0, 0, 0.05) 10px,
                rgba(0, 0, 0, 0.1) 10px,
                rgba(0, 0, 0, 0.1) 20px
              )`,
            }}
          />
        )}

        {/* Due Date Label */}
        {dateInfo && column !== 2 && (
          <div className={badgeClasses} style={badgeStyle}>
            {dateInfo.label}
          </div>
        )}

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
