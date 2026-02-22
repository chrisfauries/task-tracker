import { useAtomValue } from "jotai";
import { workerFamily } from "./atoms";
import { DropZone } from "./DropZone";
import { WorkerNameTag } from "./WorkerNameTag";
import type { User } from "firebase/auth";
import type { HistoryAction, DragOrigin } from "./types";
import { COLUMN_NAMES } from "./constants";

interface WorkerRowProps {
  workerId: string;
  dragOrigin: DragOrigin | null;
  onDragStart: (origin: DragOrigin) => void;
  onDragEnd: () => void;
  currentUser: User | null;
  onActivity: () => void;
  onHistory: (action: HistoryAction) => void;
}

export function WorkerRow({
  workerId,
  dragOrigin,
  onDragStart,
  onDragEnd,
  currentUser,
  onActivity,
  onHistory,
}: WorkerRowProps) {
  const worker = useAtomValue(workerFamily(workerId));

  if (!worker) return null;

  return (
    <div className="flex mb-1.5 min-h-[100px]">
      <WorkerNameTag
        workerId={workerId}
        workerName={worker.name}
        defaultColor={worker.defaultColor}
      />

      {/* Columns */}
      {Object.keys(COLUMN_NAMES).map((_, colIndex) => (
        <div key={colIndex} className="w-[40%] flex-none pl-1 pr-2">
          <DropZone
            workerId={workerId}
            colIndex={colIndex}
            defaultColor={worker.defaultColor}
            dragOrigin={dragOrigin}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            currentUser={currentUser}
            onActivity={onActivity}
            onHistory={onHistory}
          />
        </div>
      ))}
    </div>
  );
}