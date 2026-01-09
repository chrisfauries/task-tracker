import { ref, set, remove, get } from "firebase/database";
import { db } from "./firebase";
import { COLOR_MATRIX } from "./constants";
import type { HistoryAction } from "./types";

interface NoteMenuProps {
  id: string;
  workerId: string;
  color?: string;
  isLockedByOther: boolean;
  onActivity: () => void;
  onHistory: (action: HistoryAction) => void;
  acquireLock: () => Promise<boolean>;
  releaseLock: () => void;
}

export function NoteMenu({
  id,
  workerId,
  color,
  isLockedByOther,
  onActivity,
  onHistory,
  acquireLock,
  releaseLock,
}: NoteMenuProps) {
  // If locked by someone else, we don't render the menu at all (or render it disabled)
  // based on the previous logic, the menu container itself was hidden if locked,
  // but let's double check the container logic in parent.
  // In the original, the menu was only rendered if (!isLockedByOther).
  // We will keep that logic in the parent or return null here.
  if (isLockedByOther) return null;

  return (
    <div className="absolute m-[8px] bottom-2 left-0 right-0 flex items-center justify-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm py-1.5 rounded-full shadow-sm z-30 border border-white/50">
      {Object.values(COLOR_MATRIX).map((family) => (
        <button
          key={family.name}
          onClick={async (e) => {
            e.stopPropagation();
            onActivity();
            onHistory({
              type: "EDIT_COLOR",
              noteId: id,
              workerId,
              prevColor: color || "Green",
              newColor: family.name,
            });
            await acquireLock();
            await set(
              ref(db, `boarddata/${workerId}/notes/${id}/color`),
              family.name
            );
            releaseLock();
          }}
          className={`w-3 h-3 rounded-full ${family.shades[1].bg} border border-black/10 hover:scale-125 transition-transform shadow-sm`}
        />
      ))}
      <div className="w-px h-3 bg-black/10 mx-1" />
      <button
        onClick={async (e) => {
          e.stopPropagation();
          // redundant check since component returns null if locked, but good for safety
          if (isLockedByOther) return;
          onActivity();
          const snap = await get(ref(db, `boarddata/${workerId}/notes/${id}`));
          if (snap.exists()) {
            onHistory({
              type: "DELETE",
              noteId: id,
              workerId,
              noteData: snap.val(),
            });
          }
          remove(ref(db, `boarddata/${workerId}/notes/${id}`));
        }}
        className="text-[10px] text-slate-500 hover:text-red-600 font-bold px-1"
      >
        ✕
      </button>
    </div>
  );
}