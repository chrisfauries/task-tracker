import React, { useState, useEffect, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { DatabaseService } from "../DatabaseService";
import { DEFAULT_PALETTE_HEX, getSolidColorClass } from "../constants";
import { isCategoryManagementDialogOpenAtom, categoriesAtom } from "../atoms";
import type { CategoriesData, BoardData } from "../types";

interface CategoryDialogProps {
  boardData: BoardData;
  onApply: (catId: string, workerId: string, colIndex: number) => void;
}

export function CategoryManagementDialog({
  boardData,
  onApply,
}: CategoryDialogProps) {
  const isOpen = useAtomValue(isCategoryManagementDialogOpenAtom);
  
  if (!isOpen) return null;

  return <CategoryManagementDialogContent boardData={boardData} onApply={onApply} />;
}

function CategoryManagementDialogContent({
  boardData,
  onApply,
}: CategoryDialogProps) {
  const setIsOpen = useSetAtom(isCategoryManagementDialogOpenAtom);
  const categories = useAtomValue(categoriesAtom);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClose = () => setIsOpen(false);

  const handleCreate = async (name: string) => {
    if (!name.trim()) return;
    await DatabaseService.createCategory(name);
  };

  const handleDelete = async (id: string) => {
    await DatabaseService.deleteCategory(id);
    if (selectedId === id) setSelectedId(null);
  };

  const handleRename = async (id: string, newName: string) => {
    if (newName.trim()) {
      await DatabaseService.updateCategory(id, { name: newName });
    }
  };

  const updateItems = async (id: string, newItems: string[]) => {
    await DatabaseService.updateCategory(id, { items: newItems });
  };

  const updateColor = async (id: string, color: number) => {
    await DatabaseService.updateCategory(id, { color });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-200">
        
        <SuccessNotification 
          message={successMessage} 
          onClose={() => setSuccessMessage(null)} 
        />

        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-2xl font-bold text-slate-800">Category Sets</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-2xl">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto flex">
          <CategorySidebar
            categories={categories}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={handleCreate}
            onDelete={handleDelete}
            onRename={handleRename}
          />

          <div className="flex-1 p-8 bg-white overflow-y-auto">
            {selectedId && categories[selectedId] ? (
              <CategoryEditor
                category={categories[selectedId]}
                categoryId={selectedId}
                boardData={boardData}
                onUpdateItems={(newItems) => updateItems(selectedId, newItems)}
                onUpdateColor={(newColor) => updateColor(selectedId, newColor)}
                onApply={(workerId, colIndex) => {
                   onApply(selectedId, workerId, colIndex);
                   setSuccessMessage(`Successfully added items to ${boardData[workerId]?.name || 'Worker'}`);
                }}
              />
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

// --- Sub Components ---

function SuccessNotification({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border-2 border-emerald-100 p-8 rounded-2xl shadow-xl text-center max-w-sm">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          ✓
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Success</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-700 transition w-full"
        >
          Okay
        </button>
      </div>
    </div>
  );
}


interface CategorySidebarProps {
  categories: CategoriesData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}

function CategorySidebar({ categories, selectedId, onSelect, onCreate, onDelete, onRename }: CategorySidebarProps) {
  const [newCatName, setNewCatName] = useState("");

  const handleCreateClick = () => {
    onCreate(newCatName);
    setNewCatName("");
  };

  return (
    <div className="w-1/3 border-r p-6 overflow-y-auto">
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Category Name"
          className="flex-1 px-3 py-2 border rounded-lg text-sm"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
        />
        <button onClick={handleCreateClick} className="bg-indigo-600 text-white px-3 rounded-lg font-bold">
          +
        </button>
      </div>

      <div className="space-y-2">
        {Object.entries(categories).map(([id, cat]) => (
          <CategoryListItem
            key={id}
            id={id}
            name={cat.name}
            color={cat.color}
            isSelected={selectedId === id}
            onSelect={() => onSelect(id)}
            onDelete={() => onDelete(id)}
            onRename={(newName) => onRename(id, newName)}
          />
        ))}
      </div>
    </div>
  );
}

interface CategoryListItemProps {
  id: string;
  name: string;
  color?: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newName: string) => void;
}

function CategoryListItem({ id, name, color, isSelected, onSelect, onDelete, onRename }: CategoryListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameValue, setRenameValue] = useState(name);

  // Reset local state if selection changes
  useEffect(() => {
    if (!isSelected) {
      setIsEditing(false);
      setIsDeleting(false);
    }
  }, [isSelected]);

  const startRenaming = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setRenameValue(name);
    setIsDeleting(false);
  };

  const saveRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRename(renameValue);
    setIsEditing(false);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
    setRenameValue(name);
  };

  if (isEditing) {
    return (
      <div className={`p-4 rounded-xl border flex justify-between items-center bg-white border-indigo-200`}>
        <div className="flex gap-2 items-center flex-1">
          <input
            type="text"
            value={renameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameValue(e.target.value)}
            className="w-full px-2 py-1 border rounded text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
            autoFocus
          />
          <button onClick={saveRename} className="text-green-600 font-bold hover:bg-green-50 p-1 rounded">✓</button>
          <button onClick={cancelRename} className="text-slate-400 font-bold hover:bg-slate-100 p-1 rounded">✕</button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className={`p-4 rounded-xl border flex justify-between items-center bg-white border-red-200`}>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm font-bold text-red-600">Delete this?</span>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setIsDeleting(false);
              }}
              className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-bold hover:bg-red-200"
            >
              Yes
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(false);
              }}
              className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded font-bold hover:bg-slate-200"
            >
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-xl cursor-pointer transition border flex justify-between items-center group ${
        isSelected ? "bg-indigo-50 border-indigo-200" : "hover:bg-slate-50 border-transparent"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${getSolidColorClass(color)}`} />
        <span className="font-bold text-slate-700">{name}</span>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={startRenaming} className="text-slate-400 hover:text-blue-600" title="Rename">✏️</button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDeleting(true);
            setIsEditing(false);
          }}
          className="text-red-400 hover:text-red-600"
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

interface CategoryEditorProps {
  category: { name: string; items?: string[]; color?: number };
  categoryId: string;
  boardData: BoardData;
  onUpdateItems: (items: string[]) => void;
  onUpdateColor: (color: number) => void;
  onApply: (workerId: string, colIndex: number) => void;
}

function CategoryEditor({ category, categoryId, boardData, onUpdateItems, onUpdateColor, onApply }: CategoryEditorProps) {
  return (
    <div className="space-y-8">
      <ColorPicker currentColor={category.color} onPick={onUpdateColor} />
      <ItemsList items={category.items || []} onUpdate={onUpdateItems} />
      <PushToBoard boardData={boardData} onApply={onApply} />
    </div>
  );
}

function ColorPicker({ currentColor, onPick }: { currentColor?: number; onPick: (c: number) => void }) {
  return (
    <section>
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Category Color</h3>
      <div className="flex gap-2">
        {DEFAULT_PALETTE_HEX.map((_, index) => (
          <button
            key={index}
            onClick={() => onPick(index)}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
              getSolidColorClass(index)
            } ${currentColor === index ? "border-slate-800 scale-110" : "border-transparent"}`}
          />
        ))}
      </div>
    </section>
  );
}

function ItemsList({ items, onUpdate }: { items: string[]; onUpdate: (items: string[]) => void }) {
  const itemInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    if (focusIndex !== null && itemInputRefs.current[focusIndex]) {
      itemInputRefs.current[focusIndex]?.focus();
      setFocusIndex(null);
    }
  }, [items.length, focusIndex]);

  const handleChange = (idx: number, val: string) => {
    const newItems = [...items];
    newItems[idx] = val;
    onUpdate(newItems);
  };

  const handleDelete = (idx: number) => {
    const newItems = items.filter((_, i) => i !== idx);
    onUpdate(newItems);
  };

  const handleAdd = () => {
    onUpdate([...items, "New Item"]);
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const newItems = [...items, ""];
      onUpdate(newItems);
      setFocusIndex(items.length); 
    }
  };

  return (
    <section>
      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Edit Items</h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              ref={(el) => { itemInputRefs.current[idx] = el; }}
              type="text"
              value={item}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700"
              onKeyDown={(e) => handleKeyDown(e, idx)}
              onChange={(e) => handleChange(idx, e.target.value)}
            />
            <button onClick={() => handleDelete(idx)} className="text-slate-300 hover:text-red-500">
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={handleAdd}
          className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 transition font-bold text-sm"
        >
          + Add Item
        </button>
      </div>
    </section>
  );
}

function PushToBoard({ boardData, onApply }: { boardData: BoardData; onApply: (wId: string, colIdx: number) => void }) {
  return (
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
                  onClick={() => onApply(wId, idx)}
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
  );
}