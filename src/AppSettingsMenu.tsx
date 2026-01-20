import { useAtom, useSetAtom } from "jotai";
import {
  appSettingsMenuPosAtom,
  isSnapshotDialogOpenAtom,
  isCategoryManagementDialogOpenAtom,
  isCustomColorsDialogOpenAtom,
  isImportExportDialogOpenAtom,
  isAddWorkerDialogOpenAtom,
  darkModeAtom,
} from "./atoms";
import { DatabaseService } from "./DatabaseService";

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
        className="fixed bg-white dark:bg-slate-800 dark:border-slate-700 shadow-xl border border-slate-200 rounded-lg py-1 z-[100] min-w-[180px] flex flex-col animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Theme
          </span>

          <label
            className="relative inline-block w-14 h-7 cursor-pointer"
            aria-label="Toggle Dark Mode"
          >
            <input
              type="checkbox"
              className="peer sr-only"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
            {/* Slider Track */}
            <div className="w-full h-full bg-cyan-400 rounded-full transition-colors duration-500 peer-checked:bg-slate-900 shadow-inner overflow-hidden relative">
              {/* Stars (Hidden in day, visible in night) */}
              <div className="absolute top-1 left-4 w-0.5 h-0.5 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-500 delay-100 shadow-[4px_2px_0_0_white,8px_-1px_0_0_white]" />
              <div className="absolute bottom-2 left-2 w-[1px] h-[1px] bg-white rounded-full opacity-0 peer-checked:opacity-70 transition-opacity duration-500 delay-200" />

              {/* Clouds (Visible in day, hidden in night) */}
              <div className="absolute top-3 right-3 w-3 h-1 bg-white rounded-full opacity-80 peer-checked:opacity-0 transition-opacity duration-500 delay-100 shadow-[2px_-2px_0_1px_white]" />
            </div>

            {/* Slider Knob (Sun/Moon) */}
            <div className="absolute top-1 left-1 bg-yellow-300 w-5 h-5 rounded-full shadow-md transition-all duration-500 peer-checked:translate-x-7 peer-checked:bg-slate-100">
              {/* Moon Craters (Only visible when checked/moon) */}
              <div className="absolute top-1 left-1.5 w-1.5 h-1.5 bg-slate-300 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-300 delay-200" />
              <div className="absolute bottom-1 right-1.5 w-1 h-1 bg-slate-300 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-300 delay-200" />
            </div>
          </label>
        </div>

        <button
          onClick={() => handleAction(() => setIsCategoryDialogOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Categories
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

        <button
          onClick={() => handleAction(() => setIsAddWorkerDialogOpen(true))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-emerald-600 dark:text-emerald-400"
        >
          Add Worker
        </button>
        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
        <button
          onClick={() => handleAction(onLogout)}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-red-600 dark:text-red-400"
        >
          Logout
        </button>
      </div>
    </>
  );
};
