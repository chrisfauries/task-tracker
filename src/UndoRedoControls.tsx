import { useAtomValue, useSetAtom } from "jotai";
import { canUndoAtom, canRedoAtom, undoAtom, redoAtom } from "./atoms";

export function UndoRedoControls() {
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);
  const onUndo = useSetAtom(undoAtom);
  const onRedo = useSetAtom(redoAtom);

  return (
    <div className="flex justify-center gap-2">
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`p-2 rounded-lg transition-all border ${
          !canUndo
            ? "text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed"
            : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-sm"
        }`}
        title="Undo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`p-2 rounded-lg transition-all border ${
          !canRedo
            ? "text-slate-300 dark:text-slate-600 border-transparent cursor-not-allowed"
            : "text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-sm"
        }`}
        title="Redo"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
        </svg>
      </button>
    </div>
  );
}