import type { User } from "firebase/auth";
import type { HistoryAction, AllPresenceData } from "./types";

interface TopBannerProps {
  user: User | null;
  history: HistoryAction[];
  future: HistoryAction[];
  presence: AllPresenceData;
  onUndo: () => void;
  onRedo: () => void;
  onLogout: () => void;
  onOpenSnapshots: () => void;
  onOpenImportExport: () => void;
  onOpenCategories: () => void;
  onOpenAddWorker: () => void;
}

export function TopBanner({
  history,
  future,
  presence,
  onUndo,
  onRedo,
  onLogout,
  onOpenSnapshots,
  onOpenImportExport,
  onOpenCategories,
  onOpenAddWorker,
}: TopBannerProps) {
  return (
    <div className="p-4 border-b bg-white z-50 grid grid-cols-3 items-center shadow-sm">
      {/* Left: Title + Logo */}
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Because Band Logo"
          className="h-10 w-auto object-contain"
        />
        <h1 className="text-xl font-bold text-slate-700">Because Band Board</h1>
      </div>

      {/* Center: Undo/Redo */}
      <div className="flex justify-center gap-2">
        <button
          onClick={onUndo}
          disabled={history.length === 0}
          className={`p-2 rounded-lg transition-all border ${
            history.length === 0
              ? "text-slate-300 border-transparent cursor-not-allowed"
              : "text-slate-600 border-slate-200 hover:bg-slate-100 hover:shadow-sm"
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
          disabled={future.length === 0}
          className={`p-2 rounded-lg transition-all border ${
            future.length === 0
              ? "text-slate-300 border-transparent cursor-not-allowed"
              : "text-slate-600 border-slate-200 hover:bg-slate-100 hover:shadow-sm"
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

      {/* Right: Buttons */}
      <div className="flex gap-3 items-center justify-end">
        {/* Avatar List */}
        <div className="flex -space-x-2 mr-4 border-r pr-4 border-slate-200">
          {Object.values(presence)
            .filter((p) => p.online)
            .map((p) => (
              <div
                key={p.userId}
                className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative title-tip"
                title={p.userName}
              >
                {p.photoURL ? (
                  <img
                    src={p.photoURL}
                    alt={p.userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                    {p.userName.charAt(0)}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
            ))}
        </div>

        <button
          onClick={onOpenSnapshots}
          className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-md hover:bg-slate-200 text-sm font-medium transition shadow-sm flex items-center gap-2"
        >
          <span>⏱️</span> Snapshots
        </button>
        <button
          onClick={onOpenImportExport}
          className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-md hover:bg-slate-200 text-sm font-medium transition shadow-sm"
        >
          Import/Export
        </button>
        <button
          onClick={onOpenCategories}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition shadow-sm"
        >
          Categories
        </button>
        <button
          onClick={onOpenAddWorker}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium transition shadow-sm"
        >
          Add Worker
        </button>
        <button
          onClick={onLogout}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 text-sm font-medium transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
