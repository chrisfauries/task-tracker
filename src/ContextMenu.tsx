import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { contextMenuPosAtom, isAddToCategoryDialogOpenAtom, isDueDateDialogOpenAtom, addToCategoryTargetAtom } from "./atoms";

export const ContextMenu = () => {
  const [position, setPosition] = useAtom(contextMenuPosAtom);
  const setAddToCategoryDialogOpen = useSetAtom(isAddToCategoryDialogOpenAtom);
  const setDueDateDialogOpen = useSetAtom(isDueDateDialogOpenAtom);
  const target = useAtomValue(addToCategoryTargetAtom);

  if (!position) return null;

  const handleOpenAddToCategory = () => {
    setAddToCategoryDialogOpen(true);
    setPosition(null);
  };

  const handleOpenDueDate = () => {
    setDueDateDialogOpen(true);
    setPosition(null);
  };

  return (
    <div
      style={{ top: position.y, left: position.x }}
      className="fixed bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg py-1 z-[100] min-w-[180px] animate-in fade-in zoom-in-95 duration-100 flex flex-col"
      onClick={(e) => {e.nativeEvent.isWithinContextMenu = true;}}
    >
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
    </div>
  );
};