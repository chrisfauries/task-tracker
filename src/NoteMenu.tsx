import { useState, useRef, useEffect } from "react";
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentColor = color || "Green";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    }
    if (isPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPickerOpen]);

  if (isLockedByOther) return null;

  return (
    <div ref={menuRef}>
      {/* TOP RIGHT CLOSE BUTTON */}
      <button
        onClick={async (e) => {
          e.stopPropagation();
          onActivity();
          const noteData = await DatabaseService.getNote(workerId, id);
          if (noteData) {
            onHistory({ type: "DELETE", noteId: id, workerId, noteData });
          }
          await DatabaseService.deleteNote(workerId, id);
        }}
        className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center opacity-0 group-hover/note:opacity-100 transition-opacity bg-black/5 hover:bg-black/10 rounded-full z-30 text-slate-500 hover:text-red-600 text-xs font-bold transition-all"
      >
        ✕
      </button>

      {/* BOTTOM DRAWER TRIGGER (CHEVRON) 
          FIX: Added duration-0 and conditional visibility to ensure it 
          disappears instantly on click to avoid clipping the menu.
      */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsPickerOpen(true);
        }}
        className={`absolute bottom-0 left-0 right-0 h-4 flex items-center justify-center z-30 transition-opacity duration-0
          ${isPickerOpen 
            ? "opacity-0 pointer-events-none" 
            : "opacity-0 group-hover/note:opacity-100 bg-black/5 hover:bg-black/10 pointer-events-auto"
          }
        `}
      >
        <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="m5 15 7-7 7 7" />
        </svg>
      </button>

      {/* FULL-WIDTH BOTTOM COLOR PICKER (DRAWER) */}
      <div className={`
        absolute bottom-0 left-0 right-0
        bg-white/95 backdrop-blur-md 
        px-2 py-3 z-40 border-t border-white/30
        transform will-change-transform
        transition-transform duration-300 ease-out
        ${isPickerOpen ? "translate-y-0" : "translate-y-full pointer-events-none"}
      `}>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {Object.values(COLOR_MATRIX).map((family) => {
            const isSelected = family.name === currentColor;
            return (
              <button
                key={family.name}
                onClick={async (e) => {
                  e.stopPropagation();
                  onActivity();
                  onHistory({
                    type: "EDIT_COLOR",
                    noteId: id,
                    workerId,
                    prevColor: currentColor,
                    newColor: family.name,
                  });
                  await acquireLock();
                  await DatabaseService.updateNoteColor(workerId, id, family.name);
                  releaseLock();
                  setIsPickerOpen(false);
                }}
                className={`
                  relative w-3.5 h-3.5 rounded-full ${family.shades[1].bg} 
                  border border-black/10 hover:scale-125 
                  transition-all shadow-sm flex-shrink-0
                  ${isSelected ? "ring-2 ring-offset-1 ring-slate-400 scale-110" : ""}
                `}
                title={family.name}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}