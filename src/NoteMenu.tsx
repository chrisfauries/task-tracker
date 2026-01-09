import { DatabaseService } from "./DatabaseService";
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
            await DatabaseService.updateNoteColor(workerId, id, family.name);
            releaseLock();
          }}
          className={`w-3 h-3 rounded-full ${family.shades[1].bg} border border-black/10 hover:scale-125 transition-transform shadow-sm`}
        />
      ))}
      <div className="w-px h-3 bg-black/10 mx-1" />
      <button
        onClick={async (e) => {
          e.stopPropagation();
          if (isLockedByOther) return;
          onActivity();
          const noteData = await DatabaseService.getNote(workerId, id);
          if (noteData) {
            onHistory({
              type: "DELETE",
              noteId: id,
              workerId,
              noteData,
            });
          }
          await DatabaseService.deleteNote(workerId, id);
        }}
        className="text-[10px] text-slate-500 hover:text-red-600 font-bold px-1"
      >
        ✕
      </button>
    </div>
  );
}