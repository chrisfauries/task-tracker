import React, { useRef, useCallback } from "react";
import { WorkerRow } from "./WorkerRow";
import type { User } from "firebase/auth";
import type {
  BoardData,
  LocksData,
  HistoryAction,
  DragOrigin,
} from "./types";
import { COLUMN_NAMES } from "./constants";

interface BoardProps {
  boardData: BoardData;
  dragOrigin: DragOrigin | null;
  onDragStart: (origin: DragOrigin) => void;
  onDragEnd: () => void;
  locks: LocksData;
  currentUser: User | null;
  onActivity: () => void;
  onHistory: (action: HistoryAction) => void;
  onEditWorker: (id: string, name: string) => void;
  onDeleteWorker: (id: string, name: string) => void;
}

export function Board({
  boardData,
  dragOrigin,
  onDragStart,
  onDragEnd,
  locks,
  currentUser,
  onActivity,
  onHistory,
  onEditWorker,
  onDeleteWorker,
}: BoardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const autoScrollSpeed = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const animationFrameId = useRef<number | null>(null);

  const performAutoScroll = useCallback(() => {
    if (scrollContainerRef.current && (autoScrollSpeed.current.x !== 0 || autoScrollSpeed.current.y !== 0)) {
      scrollContainerRef.current.scrollLeft += autoScrollSpeed.current.x;
      scrollContainerRef.current.scrollTop += autoScrollSpeed.current.y;
      animationFrameId.current = requestAnimationFrame(performAutoScroll);
    } else {
      animationFrameId.current = null;
    }
  }, []);

  const handleDragOverCapture = (e: React.DragEvent) => {
    // Only scroll if we are actively dragging a note and have the container ref
    if (!dragOrigin || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const { top, bottom, left, right } = container.getBoundingClientRect();
    const mouseX = e.clientX;
    const mouseY = e.clientY;

    const zoneSize = 200; 
    const maxSpeed = 70;

    let nextX = 0;
    let nextY = 0;

    // Horizontal Scrolling (Left/Right)
    if (mouseX < left + zoneSize) {
      // Left Zone
      const distance = Math.max(0, mouseX - left);
      const intensity = 1 - distance / zoneSize;
      nextX = -Math.max(2, (intensity * intensity) * maxSpeed);
    } else if (mouseX > right - zoneSize) {
      // Right Zone
      const distance = Math.max(0, right - mouseX);
      const intensity = 1 - distance / zoneSize;
      nextX = Math.max(2, (intensity * intensity) * maxSpeed);
    }

    // Vertical Scrolling (Top/Bottom)
    if (mouseY < top + zoneSize) {
      // Top Zone
      const distance = Math.max(0, mouseY - top);
      const intensity = 1 - distance / zoneSize;
      nextY = -Math.max(2, (intensity * intensity) * maxSpeed);
    } else if (mouseY > bottom - zoneSize) {
      // Bottom Zone
      const distance = Math.max(0, bottom - mouseY);
      const intensity = 1 - distance / zoneSize;
      nextY = Math.max(2, (intensity * intensity) * maxSpeed);
    }

    autoScrollSpeed.current = { x: nextX, y: nextY };

    if ((nextX !== 0 || nextY !== 0) && !animationFrameId.current) {
      performAutoScroll();
    } else if (nextX === 0 && nextY === 0 && animationFrameId.current) {
        // Stop if both are zero
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
    }
  };

  const stopAutoScroll = () => {
    autoScrollSpeed.current = { x: 0, y: 0 };
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Stop scrolling if we leave the board container entirely
    if (
      scrollContainerRef.current &&
      !scrollContainerRef.current.contains(e.relatedTarget as Node)
    ) {
      stopAutoScroll();
    }
  };

  const handleDragEndWrapped = () => {
    stopAutoScroll();
    onDragEnd();
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-auto py-2"
      onDragOverCapture={handleDragOverCapture}
      onDragLeave={handleDragLeave}
    >
      <div className="min-w-[100%] flex flex-col">
        {/* Column Headers */}
        <div className="flex mb-2 items-center">
          <div className="sticky left-0 bg-slate-50 z-40 w-24 pl-8 flex-none"></div>
          {Object.values(COLUMN_NAMES).map((columnName) => (
            <div
              key={columnName}
              className="w-[40%] flex-none text-center font-bold text-slate-400 uppercase text-xs tracking-widest px-4"
            >
              {columnName}
            </div>
          ))}
        </div>

        {/* Worker Rows */}
        {Object.entries(boardData).map(([workerId, worker]) => (
          <WorkerRow
            key={workerId}
            workerId={workerId}
            worker={worker}
            dragOrigin={dragOrigin}
            onDragStart={onDragStart}
            onDragEnd={handleDragEndWrapped}
            locks={locks}
            currentUser={currentUser}
            onActivity={onActivity}
            onHistory={onHistory}
            onEditWorker={onEditWorker}
            onDeleteWorker={onDeleteWorker}
          />
        ))}
      </div>
    </div>
  );
}