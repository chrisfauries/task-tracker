import { useAtom, useSetAtom } from "jotai";
import { contextMenuPosAtom, isAddToCategoryDialogOpenAtom } from "./atoms";

export const ContextMenu = () => {
  const [position, setPosition] = useAtom(contextMenuPosAtom);
  const setAddToCategoryDialogOpen = useSetAtom(isAddToCategoryDialogOpenAtom);

  if (!position) return null;

  const handleOpenAddToCategory = () => {
    setAddToCategoryDialogOpen(true);
    setPosition(null);
  };

  return (
    <div
      style={{ top: position.y, left: position.x }}
      className="fixed bg-white shadow-xl border border-slate-200 rounded-lg py-1 z-[100] min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
      onClick={(e) => {e.nativeEvent.isWithinContextMenu = true;}}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.nativeEvent.isWithinContextMenu = true;
          handleOpenAddToCategory();
        }}
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
      >
        Add to category...
      </button>
    </div>
  );
};
