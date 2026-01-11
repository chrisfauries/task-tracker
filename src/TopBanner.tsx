import type { User } from "firebase/auth";
import type { HistoryAction, AllPresenceData } from "./types";
import { UndoRedoControls } from "./UndoRedoControls";
import { Button } from "./Button";
import { AvatarList } from "./AvatarList";
import { useSetAtom } from "jotai";
import { isSnapshotDialogOpenAtom } from "./atoms";

interface TopBannerProps {
  user: User | null;
  history: HistoryAction[];
  future: HistoryAction[];
  presence: AllPresenceData;
  onUndo: () => void;
  onRedo: () => void;
  onLogout: () => void;
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
  onOpenImportExport,
  onOpenCategories,
  onOpenAddWorker,
}: TopBannerProps) {
  const setIsSnapshotOpen = useSetAtom(isSnapshotDialogOpenAtom);

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
          className="mr-4 border-r pr-4 border-slate-200"
        />

        <Button
          onClick={() => setIsSnapshotOpen(true)}
          variant="secondary"
          className="flex items-center gap-2"
        >
          <span>⏱️</span> Snapshots
        </Button>

        <Button onClick={onOpenImportExport} variant="secondary">
          Import/Export
        </Button>

        <Button onClick={onOpenCategories} variant="primary">
          Categories
        </Button>

        <Button onClick={onOpenAddWorker} variant="success">
          Add Worker
        </Button>

        <Button onClick={onLogout} variant="neutral">
          Logout
        </Button>
      </div>
    </div>
  );
}