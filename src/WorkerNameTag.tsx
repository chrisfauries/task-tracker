import React from "react";

interface WorkerNameTagProps {
  workerId: string;
  workerName: string;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}

export const WorkerNameTag: React.FC<WorkerNameTagProps> = ({
  workerId,
  workerName,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="sticky left-0 bg-slate-50 dark:bg-slate-950 z-30 pl-1 pr-1 flex-none w-8 transition-colors duration-200">
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center shadow-md h-full group relative overflow-hidden cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        onDoubleClick={() => onEdit(workerId, workerName)}
        title="Double click to edit name"
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(workerId, workerName);
          }}
          className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white text-[10px] font-bold z-10"
        >
          ✕
        </button>
        <span
          className="font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap select-none"
          style={{
            writingMode: "vertical-lr",
            transform: "rotate(180deg)",
          }}
        >
          {workerName}
        </span>
      </div>
    </div>
  );
};