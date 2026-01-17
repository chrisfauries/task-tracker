import { DropZone } from "./DropZone";
import { WorkerNameTag } from "./WorkerNameTag";
import type { User } from "firebase/auth";
import type { WorkerData, LocksData, HistoryAction, DragOrigin } from "./types";
import { COLUMN_NAMES } from "./constants";

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
  onEditWorker,
  onDeleteWorker,
}: WorkerRowProps) {
  return (
    <div className="flex mb-1.5 min-h-[100px]">
      {/* Name Tag Component */}
      <WorkerNameTag
        workerId={workerId}
        workerName={worker.name}
        onEdit={onEditWorker}
        onDelete={onDeleteWorker}
      />

      {/* Columns */}
      {Object.keys(COLUMN_NAMES).map((_, colIndex) => (
        <div key={colIndex} className="w-[40%] flex-none pl-1 pr-2">
          <DropZone
            workerId={workerId}
            colIndex={colIndex}
            notes={worker.notes || {}}
            defaultColor={worker.defaultColor}
            dragOrigin={dragOrigin}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
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