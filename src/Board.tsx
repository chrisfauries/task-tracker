import { useRef } from "react";
import { useAtomValue } from "jotai";
import { WorkerRow } from "./WorkerRow";
import { COLUMN_NAMES } from "./constants";
import { workerIdsAtom } from "./atoms";
import { useAutoScroll } from "./hooks/useAutoScroll";

export function Board() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const workerIds = useAtomValue(workerIdsAtom);
  const { handleDragOver, handleDragLeave } = useAutoScroll(scrollContainerRef);

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-auto py-2"
      onDragOverCapture={handleDragOver}
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
        {workerIds.map((workerId) => (
          <WorkerRow key={workerId} workerId={workerId} />
        ))}
      </div>
    </div>
  );
}
