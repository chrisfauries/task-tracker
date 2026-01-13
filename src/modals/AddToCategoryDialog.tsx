import { useState, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { DEFAULT_PALETTE_HEX, getSolidColorClass } from "../constants";
import { DatabaseService } from "../DatabaseService";
import {
  categoriesAtom,
  isAddToCategoryDialogOpenAtom,
  addToCategoryTargetAtom,
} from "../atoms";

export function AddToCategoryDialog() {
  if (!useAtomValue(isAddToCategoryDialogOpenAtom)) return null;
  return <AddToCategoryDialogContent />;
}

function AddToCategoryDialogContent() {
  const setIsOpen = useSetAtom(isAddToCategoryDialogOpenAtom);
  const categories = useAtomValue(categoriesAtom);
  const [targetNote, setTargetNote] = useAtom(addToCategoryTargetAtom);

  const [newCatName, setNewCatName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingCatId, setPendingCatId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState(targetNote?.color ?? 0);

  // Handle auto-selection of newly created category
  useEffect(() => {
    if (pendingCatId && categories[pendingCatId]) {
      handleSelect(pendingCatId);
      setPendingCatId(null);
    }
  }, [categories, pendingCatId]);

  const handleSelect = async (catId: string) => {
    if (!targetNote) return;
    const category = categories[catId];
    if (!category) return;

    try {
      // 1. Update note's category in the board data
      await DatabaseService.updateNoteCategory(
        targetNote.workerId,
        targetNote.id,
        category.name,
        category.color ?? 0
      );

      // 2. Add note text to the category's item list
      const currentItems = category.items || [];
      const newItems = [...currentItems, targetNote.text];
      await DatabaseService.updateCategory(catId, { items: newItems });

      // 3. Close dialog and reset target
      setIsOpen(false);
      setTargetNote(null);
    } catch (error) {
      console.error("Failed to assign category:", error);
    }
  };

  const handleCreate = async () => {
    if (!newCatName.trim()) return;
    setIsCreating(true);
    try {
      const newId = await DatabaseService.createCategory(
        newCatName,
        selectedColor
      );
      if (newId) {
        setPendingCatId(newId);
        // We wait for the subscription in atoms.ts to update 'categories'
        // which triggers the useEffect above to call handleSelect
      } else {
        setIsCreating(false);
      }
    } catch (e) {
      console.error("Failed to create category", e);
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">
            Add to Category...
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Create New Category Section */}
        <div className="p-4 bg-slate-50 border-b">
          <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
            Create New
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              placeholder="Category Name"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newCatName.trim()) {
                  handleCreate();
                }
              }}
              className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isCreating}
            />
            <button
              onClick={handleCreate}
              disabled={!newCatName.trim() || isCreating}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
            >
              {isCreating ? "Creating..." : "Create and Add"}
            </button>
          </div>

          {/* Color Picker */}
          <div className="flex gap-2 mt-3">
            {DEFAULT_PALETTE_HEX.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedColor(index)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  getSolidColorClass(index)
                } ${
                  selectedColor === index
                    ? "border-slate-800 scale-110"
                    : "border-transparent"
                }`}
                title={`Color ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {Object.keys(categories).length === 0 ? (
            <p className="text-slate-500 text-center italic mt-2">
              No categories available.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(categories).map(([id, cat]) => (
                <button
                  key={id}
                  onClick={() => handleSelect(id)}
                  disabled={!!pendingCatId}
                  className="flex items-center gap-3 w-full p-3 rounded-lg border hover:bg-slate-50 transition text-left disabled:opacity-50"
                >
                  <div
                    className={`w-4 h-4 rounded-full ${
                      getSolidColorClass(cat.color)
                    }`}
                  />
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