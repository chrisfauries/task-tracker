import { useState, useEffect } from "react";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { contextMenuPosAtom, openDialog, Dialog, noteContextTargetAtom } from "./atoms";
import { MoveToBoardGrid } from "./MoveToBoardGrid";

export const ContextMenu = () => {
  const [position, setPosition] = useAtom(contextMenuPosAtom);
  const open = useSetAtom(openDialog);
  const target = useAtomValue(noteContextTargetAtom);
  const [mode, setMode] = useState<"default" | "move">("default");

  useEffect(() => {
    setMode("default");
  }, [position]);

  if (!position) return null;

  const handleOpenAddToCategory = () => {
    open(Dialog.ADD_TO_CATEGORY);
    setPosition(null);
  };

  const handleOpenDueDate = () => {
    open(Dialog.DUE_DATE);
    setPosition(null);
  };

  return (
    <div
      style={{ top: position.y, left: position.x }}
      className="fixed bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg py-1 z-[100] min-w-[180px] animate-in fade-in zoom-in-95 duration-100 flex flex-col"
      onClick={(e) => {e.nativeEvent.isWithinContextMenu = true;}}
    >
      {mode === "default" ? (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.nativeEvent.isWithinContextMenu = true;
              handleOpenDueDate();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {target?.dueDate ? "Change Due Date..." : "Set Due Date..."}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.nativeEvent.isWithinContextMenu = true;
              handleOpenAddToCategory();
            }}
            className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Add to category...
          </button>

          <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

          <button
            onClick={(e) => {
              e.stopPropagation();
              e.nativeEvent.isWithinContextMenu = true;
              setMode("move");
            }}
            className="w-full text-left flex justify-between items-center px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            <span>Move to...</span>
            <span className="text-slate-400">▶</span>
          </button>
        </>
      ) : (
        <MoveToBoardGrid />
      )}
    </div>
  );
};