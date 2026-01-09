import React from "react";
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
  onNoteContextMenu: (
    e: React.MouseEvent,
    noteId: string,
    workerId: string,
    text: string
  ) => void;
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
  onNoteContextMenu,
  onEditWorker,
  onDeleteWorker,
}: BoardProps) {
  return (
    <div className="flex-1 overflow-auto py-8">
      <div className="min-w-[100%] flex flex-col">
        {/* Column Headers */}
        <div className="flex mb-4 items-center">
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
            onDragEnd={onDragEnd}
            locks={locks}
            currentUser={currentUser}
            onActivity={onActivity}
            onHistory={onHistory}
            onNoteContextMenu={onNoteContextMenu}
            onEditWorker={onEditWorker}
            onDeleteWorker={onDeleteWorker}
          />
        ))}
      </div>
    </div>
  );
}