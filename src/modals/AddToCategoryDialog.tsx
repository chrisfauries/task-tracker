import { COLOR_MATRIX } from "../constants";
import type { CategoriesData } from "../types";

interface AddToCategoryDialogProps {
  categories: CategoriesData;
  onClose: () => void;
  onSelect: (catId: string) => void;
}

export function AddToCategoryDialog({
  categories,
  onClose,
  onSelect,
}: AddToCategoryDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Add to Category...</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {Object.keys(categories).length === 0 ? (
            <p className="text-slate-500 text-center italic">No categories available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(categories).map(([id, cat]) => (
                <button
                  key={id}
                  onClick={() => onSelect(id)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-slate-50 transition text-left"
                >
                  <div className={`w-4 h-4 rounded-full ${COLOR_MATRIX[cat.color || "Green"].shades[1].bg}`} />
                  <span className="font-medium text-slate-700">{cat.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}