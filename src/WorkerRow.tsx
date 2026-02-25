import { useAtomValue } from "jotai";
import { workerFamily } from "./atoms";
import { DropZone } from "./DropZone";
import { WorkerNameTag } from "./WorkerNameTag";
import type { HistoryAction } from "./types";
import { COLUMN_NAMES } from "./constants";

interface WorkerRowProps {
  workerId: string;
  onHistory: (action: HistoryAction) => void;
}

export function WorkerRow({
  workerId,
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
            onHistory={onHistory}
          />
        </div>
      ))}
    </div>
  );
}