import React from "react";

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  onClose: () => void;
  onAddToCategory: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ position, onClose, onAddToCategory }) => {
  if (!position) return null;

  return (
    <div
      style={{ top: position.y, left: position.x }}
      className="fixed bg-white shadow-xl border border-slate-200 rounded-lg py-1 z-[100] min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
          onAddToCategory();
        }}
        className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-medium text-slate-700"
      >
        Add to category...
      </button>
    </div>
  );
};