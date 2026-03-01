import { useAtom, useSetAtom } from "jotai";
import {
  appSettingsMenuPosAtom,
  openDialog,
  Dialog,
  darkModeAtom,
  logoutAtom,
} from "./atoms";

export const AppSettingsMenu = () => {
  const logout = useSetAtom(logoutAtom);
  const [position, setPosition] = useAtom(appSettingsMenuPosAtom);
  const open = useSetAtom(openDialog);
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
        <div className="px-4 py-3 flex justify-between items-center border-b border-slate-100 dark:border-slate-700">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            {darkMode ? "Light Mode" : "Dark Mode"}
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

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

        <button
          onClick={() => handleAction(() => open(Dialog.CATEGORY_MANAGEMENT))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Manage Categories
        </button>
        <button
          onClick={() => handleAction(() => open(Dialog.WORKER_ORDER))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Manage Workers
        </button>
        <button
          onClick={() => handleAction(() => open(Dialog.CUSTOM_COLORS))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Customize Colors
        </button>
        <button
          onClick={() => handleAction(() => open(Dialog.SNAPSHOT))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2"
        >
          Snapshots
        </button>
        <button
          onClick={() => handleAction(() => open(Dialog.IMPORT_EXPORT))}
          className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          Import/Export
        </button>

        <div className="h-px bg-slate-200 dark:bg-slate-700 my-1 mx-2" />

        <button
          onClick={() => handleAction(logout)}
          className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400"
        >
          Logout
        </button>
      </div>
    </>
  );
};
