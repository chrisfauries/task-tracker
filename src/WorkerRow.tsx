import React from "react";
import { DropZone } from "./DropZone";
import type { User } from "firebase/auth";
import type { WorkerData, LocksData, HistoryAction, DragOrigin } from "./types";

interface WorkerRowProps {
  workerId: string;
  worker: WorkerData;
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

export function WorkerRow({
  workerId,
  worker,
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
}: WorkerRowProps) {
  return (
    <div className="flex mb-6 min-h-[250px]">
      {/* Name Tag */}
      <div className="sticky left-0 bg-slate-50 z-30 pl-4 pr-4 flex-none w-16">
        <div
          className="bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-md h-full group relative overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors"
          onDoubleClick={() => onEditWorker(workerId, worker.name)}
          title="Double click to edit name"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteWorker(workerId, worker.name);
            }}
            className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white text-[10px] font-bold z-10"
          >
            ✕
          </button>
          <span
            className="font-bold text-slate-700 whitespace-nowrap select-none"
            style={{
              writingMode: "vertical-lr",
              transform: "rotate(180deg)",
            }}
          >
            {worker.name}
          </span>
        </div>
      </div>

      {/* Columns */}
      {[0, 1, 2].map((colIndex) => (
        <div key={colIndex} className="w-[40%] flex-none px-2">
          <DropZone
            workerId={workerId}
            colIndex={colIndex}
            notes={worker.notes || {}}
            defaultColor={worker.defaultColor}
            dragOrigin={dragOrigin}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onNoteContextMenu={onNoteContextMenu}
            locks={locks}
            currentUser={currentUser}
            onActivity={onActivity}
            onHistory={onHistory}
          />
        </div>
      ))}
    </div>
  );
}
