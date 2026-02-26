import { DropZone } from "./DropZone";
import { WorkerNameTag } from "./WorkerNameTag";
import { COLUMN_NAMES } from "./constants";

interface WorkerRowProps {
  workerId: string;
}

export function WorkerRow({ workerId }: WorkerRowProps) {
  return (
    <div className="flex mb-1.5 min-h-[100px]">
      <WorkerNameTag workerId={workerId} />

      {/* Columns */}
      {Object.keys(COLUMN_NAMES).map((_, colIndex) => (
        <div key={colIndex} className="w-[40%] flex-none pl-1 pr-2">
          <DropZone workerId={workerId} colIndex={colIndex} />
        </div>
      ))}
    </div>
  );
}
