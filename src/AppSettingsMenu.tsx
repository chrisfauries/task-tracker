import { useAtom, useSetAtom } from "jotai";
import { appSettingsMenuPosAtom, isSnapshotDialogOpenAtom, isCategoryManagementDialogOpenAtom } from "./atoms";

interface AppSettingsMenuProps {
  onLogout: () => void;
  onOpenImportExport: () => void;
  onOpenAddWorker: () => void;
}

export const AppSettingsMenu = ({
  onLogout,
  onOpenImportExport,
  onOpenAddWorker,
}: AppSettingsMenuProps) => {
  const [position, setPosition] = useAtom(appSettingsMenuPosAtom);
  const setIsSnapshotOpen = useSetAtom(isSnapshotDialogOpenAtom);
  const setIsCategoryDialogOpen = useSetAtom(isCategoryManagementDialogOpenAtom);

  if (!position) return null;

  const handleAction = (action: () => void) => {
    action();
    setPosition(null);
  };

  return (
    <>
      {/* Backdrop to close menu when clicking outside */}
      <div className="fixed inset-0 z-[90]" onClick={() => setPosition(null)} />
      <div
        style={{ top: position.y, right: 16 }}
        className="fixed bg-white shadow-xl border border-slate-200 rounded-lg py-1 z-[100] min-w-[180px] flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => {
          // Prevent clicks inside the menu from closing it immediately via the backdrop logic
          // (though the backdrop is behind, this ensures event propagation doesn't cause issues if structured differently)
          e.stopPropagation();
        }}
      >
        <button
          onClick={() => handleAction(() => setIsCategoryDialogOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        >
          Categories
        </button>
        <button
          onClick={() => handleAction(() => setIsSnapshotOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700 flex items-center gap-2"
        >
          Snapshots
        </button>
        <button
          onClick={() => handleAction(onOpenImportExport)}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
        >
          Import/Export
        </button>

        <button
          onClick={() => handleAction(onOpenAddWorker)}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700 text-emerald-600"
        >
          Add Worker
        </button>
        <div className="h-px bg-slate-100 my-1" />
        <button
          onClick={() => handleAction(onLogout)}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-red-600"
        >
          Logout
        </button>
      </div>
    </>
  );
};
