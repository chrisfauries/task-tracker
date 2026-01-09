import React, { useState, useEffect, useRef } from "react";
import { ref, push, update, remove } from "firebase/database";
import { db } from "../firebase";
import { COLOR_MATRIX } from "../constants";
import type { CategoriesData, BoardData } from "../types";

interface CategoryDialogProps {
  categories: CategoriesData;
  boardData: BoardData;
  onClose: () => void;
  onApply: (catId: string, workerId: string, colIndex: number) => void;
}

export function CategoryDialog({
  categories,
  boardData,
  onClose,
  onApply,
}: CategoryDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");

  // Renaming State
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Focus and Success Feedback State
  const [focusNewItemIndex, setFocusNewItemIndex] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Effect to handle auto-focus of new items
  useEffect(() => {
    if (focusNewItemIndex !== null && itemInputRefs.current[focusNewItemIndex]) {
      itemInputRefs.current[focusNewItemIndex]?.focus();
      setFocusNewItemIndex(null);
    }
  }, [categories, focusNewItemIndex]);

  const handleCreate = () => {
    if (!newCatName.trim()) return;
    const refCat = ref(db, "categories");
    push(refCat, {
      name: newCatName,
      items: ["Example Item"],
      color: "Green",
    });
    setNewCatName("");
  };

  const updateItems = (id: string, newItems: string[]) => {
    update(ref(db, `categories/${id}`), { items: newItems });
  };

  const updateColor = (id: string, color: string) => {
    update(ref(db, `categories/${id}`), { color });
  };

  // Renaming Handlers
  const startRenaming = (e: React.MouseEvent, id: string, currentName: string) => {
    e.stopPropagation();
    setEditingCatId(id);
    setRenameValue(currentName);
  };

  const saveRename = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (renameValue.trim()) {
      update(ref(db, `categories/${id}`), { name: renameValue });
    }
    setEditingCatId(null);
    setRenameValue("");
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCatId(null);
    setRenameValue("");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Success Overlay */}
        {successMessage && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white border-2 border-emerald-100 p-8 rounded-2xl shadow-xl text-center max-w-sm">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">✓</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Success</h3>
              <p className="text-slate-600 mb-6">{successMessage}</p>
              <button onClick={() => setSuccessMessage(null)} className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition w-full">Okay</button>
            </div>
          </div>
        )}

        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-2xl font-bold text-slate-800">Category Sets</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
        </div>

        <div className="flex-1 overflow-auto flex">
          {/* LEFT SIDEBAR: LIST */}
          <div className="w-1/3 border-r p-6 overflow-y-auto">
            <div className="flex gap-2 mb-6">
              <input type="text" placeholder="Category Name" className="flex-1 px-3 py-2 border rounded-lg text-sm" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} />
              <button onClick={handleCreate} className="bg-indigo-600 text-white px-3 rounded-lg font-bold">+</button>
            </div>

            <div className="space-y-2">
              {Object.entries(categories).map(([id, cat]) => (
                <div
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`p-4 rounded-xl cursor-pointer transition border flex justify-between items-center group ${
                    selectedId === id ? "bg-indigo-50 border-indigo-200" : "hover:bg-slate-50 border-transparent"
                  }`}
                >
                  {editingCatId === id ? (
                    <div className="flex gap-2 items-center flex-1">
                      <input type="text" value={renameValue} onClick={(e) => e.stopPropagation()} onChange={(e) => setRenameValue(e.target.value)} className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-400 outline-none" autoFocus />
                      <button onClick={(e) => saveRename(e, id)} className="text-green-600 font-bold hover:bg-green-50 p-1 rounded">✓</button>
                      <button onClick={cancelRename} className="text-slate-400 font-bold hover:bg-slate-100 p-1 rounded">✕</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${COLOR_MATRIX[cat.color || "Green"].shades[1].bg}`} />
                        <span className="font-bold text-slate-700">{cat.name}</span>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => startRenaming(e, id, cat.name)} className="text-slate-400 hover:text-blue-600" title="Rename">✏️</button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(ref(db, `categories/${id}`));
                            if (selectedId === id) setSelectedId(null);
                          }}
                          className="text-red-400 hover:text-red-600"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE: DETAILS */}
          <div className="flex-1 p-8 bg-white overflow-y-auto">
            {selectedId ? (
              <div className="space-y-8">
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Category Color</h3>
                  <div className="flex gap-2">
                    {Object.values(COLOR_MATRIX).map((family) => (
                      <button
                        key={family.name}
                        onClick={() => updateColor(selectedId, family.name)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          family.shades[1].bg
                        } ${categories[selectedId].color === family.name ? "border-slate-800 scale-110" : "border-transparent"}`}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Edit Items</h3>
                  <div className="space-y-2">
                    {(categories[selectedId].items || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          ref={(el) => { itemInputRefs.current[idx] = el; }}
                          type="text"
                          value={item}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const currentItems = categories[selectedId].items || [];
                              const newItems = [...currentItems, ""];
                              updateItems(selectedId, newItems);
                              setFocusNewItemIndex(currentItems.length);
                            }
                          }}
                          onChange={(e) => {
                            const newItems = [...categories[selectedId].items];
                            newItems[idx] = e.target.value;
                            updateItems(selectedId, newItems);
                          }}
                        />
                        <button
                          onClick={() => {
                            const newItems = categories[selectedId].items.filter((_, i) => i !== idx);
                            updateItems(selectedId, newItems);
                          }}
                          className="text-slate-300 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => updateItems(selectedId, [...(categories[selectedId].items || []), "New Item"])}
                      className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 transition font-bold text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                </section>

                <section className="pt-8 border-t">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Push Category to Board</h3>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(boardData).map(([wId, worker]) => (
                      <div key={wId} className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <span className="font-bold text-slate-800">{worker.name}</span>
                        <div className="flex gap-2">
                          {["Assigned", "Active", "Done"].map((label, idx) => (
                            <button
                              key={label}
                              onClick={() => {
                                onApply(selectedId, wId, idx);
                                setSuccessMessage(`Successfully added items to ${worker.name}`);
                              }}
                              className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition shadow-sm"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 italic">
                Select a category from the left to start editing or pushing notes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}