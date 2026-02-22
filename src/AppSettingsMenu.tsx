import { useAtom, useSetAtom } from "jotai";
import {
  appSettingsMenuPosAtom,
  isSnapshotDialogOpenAtom,
  isCategoryManagementDialogOpenAtom,
  isCustomColorsDialogOpenAtom,
  isImportExportDialogOpenAtom,
  isAddWorkerDialogOpenAtom,
  darkModeAtom,
  isWorkerOrderDialogOpenAtom,
} from "./atoms";

interface AppSettingsMenuProps {
  onLogout: () => void;
}

export const AppSettingsMenu = ({ onLogout }: AppSettingsMenuProps) => {
  const [position, setPosition] = useAtom(appSettingsMenuPosAtom);
  const setIsSnapshotOpen = useSetAtom(isSnapshotDialogOpenAtom);
  const setIsCategoryDialogOpen = useSetAtom(
    isCategoryManagementDialogOpenAtom
  );
  const setIsCustomColorsDialogOpen = useSetAtom(isCustomColorsDialogOpenAtom);
  const setIsImportExportDialogOpen = useSetAtom(isImportExportDialogOpenAtom);
  const setIsAddWorkerDialogOpen = useSetAtom(isAddWorkerDialogOpenAtom);
  const setIsWorkerOrderDialogOpen = useSetAtom(isWorkerOrderDialogOpenAtom);
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);

  if (!position) return null;

  const handleAction = (action: () => void) => {
    action();
    setPosition(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-[90]" onClick={() => setPosition(null)} />
      <div
        style={{ top: position.y, right: 16 }}
        className="fixed bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 rounded-lg py-1 z-[100] min-w-[200px] animate-in fade-in zoom-in-95 duration-100 flex flex-col"
      >
        <button
          onClick={() => {
            setDarkMode(!darkMode);
            setPosition(null);
          }}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex justify-between items-center"
        >
          <span>Dark Mode</span>
          {darkMode ? <span>🌙</span> : <span>☀️</span>}
        </button>

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

        <button
          onClick={() => handleAction(() => setIsCategoryDialogOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Manage Categories
        </button>
        <button
          onClick={() => handleAction(() => setIsCustomColorsDialogOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Customize Colors
        </button>
        <button
          onClick={() => handleAction(() => setIsSnapshotOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2"
        >
          Snapshots
        </button>
        <button
          onClick={() => handleAction(() => setIsImportExportDialogOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Import/Export
        </button>

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

        <button
          onClick={() => handleAction(() => setIsAddWorkerDialogOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-emerald-600 dark:text-emerald-400"
        >
          Add Worker
        </button>
        <button
          onClick={() => handleAction(() => setIsWorkerOrderDialogOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Manage Worker Order
        </button>

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

        <button
          onClick={() => handleAction(onLogout)}
          className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400"
        >
          Logout
        </button>
      </div>
    </>
  );
};