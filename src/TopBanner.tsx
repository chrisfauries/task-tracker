import type { User } from "firebase/auth";
import type { HistoryAction, AllPresenceData } from "./types";
import { UndoRedoControls } from "./UndoRedoControls";
import { AvatarList } from "./AvatarList";
import { SearchAndFilter } from "./SearchAndFilter";
import { useSetAtom } from "jotai";
import { appSettingsMenuPosAtom } from "./atoms";

interface TopBannerProps {
  user: User | null;
  history: HistoryAction[];
  future: HistoryAction[];
  presence: AllPresenceData;
  onUndo: () => void;
  onRedo: () => void;
}

export function TopBanner({
  history,
  future,
  presence,
  onUndo,
  onRedo,
}: TopBannerProps) {
  const setAppSettingsMenuPos = useSetAtom(appSettingsMenuPosAtom);

  return (
    <div className="p-4 border-b dark:border-slate-800 z-50 grid grid-cols-3 items-center shadow-sm bg-white dark:bg-slate-900 transition-colors">
      {/* Left: Title + Logo */}
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Because Band Logo"
          className="h-10 w-auto object-contain dark:invert"
        />
        <h1 className="text-xl font-bold text-slate-700 dark:text-slate-200">Because Band Board</h1>
      </div>

      {/* Center: Undo/Redo */}
      <UndoRedoControls
        history={history}
        future={future}
        onUndo={onUndo}
        onRedo={onRedo}
      />

      {/* Right: Buttons */}
      <div className="flex gap-3 items-center justify-end">
        <AvatarList
          presence={presence}
          className="mr-4 border-r pr-4 border-slate-200 dark:border-slate-700"
        />

        <SearchAndFilter />

        <button
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setAppSettingsMenuPos({ x: rect.left, y: rect.bottom + 8 });
          }}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
          title="Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  );
}