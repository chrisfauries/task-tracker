import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
    
    const currentOrders = Object.values(categories).map(c => c.order || 0);
    const maxOrder = currentOrders.length > 0 ? Math.max(...currentOrders) : -1;
    
    await DatabaseService.createCategory(name, 0, maxOrder + 1);
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

  const handleReorder = async (draggedId: string, newIndex: number) => {
    const sortedCategories = Object.entries(categories)
      .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
      .map(([id]) => id);

    const currentIndex = sortedCategories.indexOf(draggedId);
    if (currentIndex === -1) return;
    
    const newList = [...sortedCategories];
    newList.splice(currentIndex, 1);

    const insertAt = newIndex > currentIndex ? newIndex - 1 : newIndex;
    newList.splice(insertAt, 0, draggedId);

    const updates = [];
    for (let i = 0; i < newList.length; i++) {
      const id = newList[i];
      const currentOrder = categories[id].order;
      if (currentOrder !== i) {
        updates.push(DatabaseService.updateCategory(id, { order: i }));
      }
    }

    await Promise.all(updates);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-[80%] max-w-[80%] max-h-[90vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
        
        <SuccessNotification 
          message={successMessage} 
          onClose={() => setSuccessMessage(null)} 
        />

        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Category Sets</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl">
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
            onReorder={handleReorder}
          />

          <div className="flex-1 p-8 bg-white dark:bg-slate-900 overflow-y-auto">
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
                <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 italic">
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
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 border-2 border-emerald-100 dark:border-emerald-900/30 p-8 rounded-2xl shadow-xl text-center max-w-sm">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          ✓
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Success</h3>
        <p className="text-slate-600 dark:text-slate-300 mb-6">{message}</p>
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
  onReorder: (draggedId: string, newIndex: number) => void;
}

function CategorySidebar({ categories, selectedId, onSelect, onCreate, onDelete, onRename, onReorder }: CategorySidebarProps) {
  const [newCatName, setNewCatName] = useState("");
  
  // Drag and Drop State
  const listRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropState, setDropState] = useState<{ index: number; top: number } | null>(null);

  // Auto-scroll State
  const autoScrollSpeed = useRef<number>(0);
  const animationFrameId = useRef<number | null>(null);

  const sortedCategories = useMemo(() => {
    return Object.entries(categories)
      .sort(([, a], [, b]) => {
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        return orderA - orderB;
      });
  }, [categories]);

  const handleCreateClick = () => {
    onCreate(newCatName);
    setNewCatName("");
  };

  // --- Auto Scroll Logic ---
  const performAutoScroll = useCallback(() => {
    if (scrollContainerRef.current && autoScrollSpeed.current !== 0) {
      scrollContainerRef.current.scrollTop += autoScrollSpeed.current;
      animationFrameId.current = requestAnimationFrame(performAutoScroll);
    } else {
      animationFrameId.current = null;
    }
  }, []);

  const stopAutoScroll = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    autoScrollSpeed.current = 0;
  };

  // --- DnD Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    if (!listRef.current || !draggedId || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    const { top, bottom } = container.getBoundingClientRect();
    const mouseY = e.clientY;

    // --- 1. Auto Scroll Calculation ---
    // Increased zone size to 100px so it triggers earlier
    const zoneSize = 100;
    const maxSpeed = 15; // Slightly faster max speed for smoother feel

    if (mouseY < top + zoneSize) {
      // Top Zone: Scroll Up
      const distance = Math.max(0, mouseY - top);
      const intensity = 1 - distance / zoneSize; 
      autoScrollSpeed.current = -Math.max(2, intensity * maxSpeed); 
      if (!animationFrameId.current) performAutoScroll();

    } else if (mouseY > bottom - zoneSize) {
      // Bottom Zone: Scroll Down
      const distance = Math.max(0, bottom - mouseY);
      const intensity = 1 - distance / zoneSize;
      autoScrollSpeed.current = Math.max(2, intensity * maxSpeed);
      if (!animationFrameId.current) performAutoScroll();

    } else {
      stopAutoScroll();
    }

    // --- 2. Drop Index Calculation ---
    const items = Array.from(listRef.current.children).filter(
        (child) => child.hasAttribute("data-category-id")
    ) as HTMLElement[];

    if (items.length === 0) return;

    const relativeMouseY = e.clientY - listRef.current.getBoundingClientRect().top;

    let closestIndex = items.length;
    let closestTop = items[items.length - 1].offsetTop + items[items.length - 1].offsetHeight;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Compare relative mouse position to the vertical midpoint of each item
        const midpoint = item.offsetTop + (item.offsetHeight / 2);
        
        if (relativeMouseY < midpoint) {
            closestIndex = i;
            closestTop = item.offsetTop;
            break;
        }
    }

    setDropState({ index: closestIndex, top: closestTop });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    stopAutoScroll(); 
    if (draggedId && dropState) {
        onReorder(draggedId, dropState.index);
    }
    resetDrag();
  };

  const handleDragLeave = (e: React.DragEvent) => {
      // Only stop if we actually left the scroll container
      if (scrollContainerRef.current && !scrollContainerRef.current.contains(e.relatedTarget as Node)) {
          stopAutoScroll();
          setDropState(null);
      }
  };

  const resetDrag = () => {
    setDraggedId(null);
    setDropState(null);
    stopAutoScroll();
  };

  return (
    <div 
      ref={scrollContainerRef}
      className="w-1/3 border-r dark:border-slate-700 p-6 overflow-y-auto relative bg-slate-50 dark:bg-slate-800"
    >
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Category Name"
          className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 dark:text-white"
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
        />
        <button onClick={handleCreateClick} className="bg-indigo-600 text-white px-3 rounded-lg font-bold">
          +
        </button>
      </div>

      <div 
        ref={listRef}
        className="space-y-2 relative min-h-[50px]"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        {draggedId && dropState && (
            <div 
                data-testid="drop-indicator"
                className="absolute left-0 right-0 h-1 bg-blue-500 rounded-full z-20 pointer-events-none transition-all duration-75"
                style={{ 
                    top: dropState.top,
                    transform: 'translateY(-50%)' 
                }}
            />
        )}

        {sortedCategories.map(([id, cat]) => (
          <CategoryListItem
            key={id}
            id={id}
            name={cat.name}
            color={cat.color}
            isSelected={selectedId === id}
            onSelect={() => onSelect(id)}
            onDelete={() => onDelete(id)}
            onRename={(newName) => onRename(id, newName)}
            isDragged={draggedId === id}
            onDragStart={(e) => handleDragStart(e, id)}
            onDragEnd={resetDrag}
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
  isDragged: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

function CategoryListItem({ 
  id,
  name, 
  color, 
  isSelected, 
  onSelect, 
  onDelete, 
  onRename,
  isDragged,
  onDragStart,
  onDragEnd
}: CategoryListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renameValue, setRenameValue] = useState(name);

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
      <div 
        data-category-id={id}
        className={`p-4 rounded-xl border flex justify-between items-center bg-white dark:bg-slate-700 border-indigo-200 dark:border-indigo-500`}
      >
        <div className="flex gap-2 items-center flex-1">
          <input
            type="text"
            value={renameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameValue(e.target.value)}
            className="w-full px-2 py-1 border dark:border-slate-500 rounded text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white dark:bg-slate-900 dark:text-white"
            autoFocus
          />
          <button onClick={saveRename} className="text-green-600 dark:text-green-400 font-bold hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded">✓</button>
          <button onClick={cancelRename} className="text-slate-400 dark:text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded">✕</button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div 
        data-category-id={id}
        className={`p-4 rounded-xl border flex justify-between items-center bg-white dark:bg-slate-700 border-red-200 dark:border-red-900`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="text-sm font-bold text-red-600 dark:text-red-400">Delete this?</span>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setIsDeleting(false);
              }}
              className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded font-bold hover:bg-red-200 dark:hover:bg-red-900/60"
            >
              Yes
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDeleting(false);
              }}
              className="px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs rounded font-bold hover:bg-slate-200 dark:hover:bg-slate-500"
            >
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  const dragStyles = isDragged ? "opacity-25 bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-600" : "";

  return (
    <div
      data-category-id={id}
      onClick={onSelect}
      draggable={!isEditing && !isDeleting}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`p-4 rounded-xl cursor-pointer transition border flex justify-between items-center group relative 
        ${isSelected 
            ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" 
            : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-transparent"}
        ${dragStyles}
      `}
    >
      <div className="flex items-center gap-3">
        <div 
            className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
        </div>

        <div className={`w-3 h-3 rounded-full ${getSolidColorClass(color)}`} />
        <span className="font-bold text-slate-700 dark:text-slate-200 select-none">{name}</span>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={startRenaming} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" title="Rename">✏️</button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDeleting(true);
            setIsEditing(false);
          }}
          className="text-red-400 hover:text-red-600 dark:hover:text-red-400"
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

function CategoryEditor({ category, boardData, onUpdateItems, onUpdateColor, onApply }: CategoryEditorProps) {
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
      <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Category Color</h3>
      <div className="flex gap-2">
        {DEFAULT_PALETTE_HEX.map((_, index) => (
          <button
            key={index}
            onClick={() => onPick(index)}
            className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
              getSolidColorClass(index)
            } ${currentColor === index ? "border-slate-800 dark:border-slate-200 scale-110" : "border-transparent"}`}
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
      const newItems = [...items];
      newItems.splice(idx + 1, 0, "");
      onUpdate(newItems);
      setFocusIndex(idx + 1); 
    }
  };

  return (
    <section>
      <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Edit Items</h3>
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              ref={(el) => { itemInputRefs.current[idx] = el; }}
              type="text"
              value={item}
              className="flex-1 px-4 py-2 border dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800"
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
          className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition font-bold text-sm"
        >
          + Add Item
        </button>
      </div>
    </section>
  );
}

function PushToBoard({ boardData, onApply }: { boardData: BoardData; onApply: (wId: string, colIdx: number) => void }) {
  return (
    <section className="pt-8 border-t dark:border-slate-700">
      <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Push Category to Board</h3>
      <div className="grid grid-cols-1 gap-3">
        {Object.entries(boardData).map(([wId, worker]) => (
          <div key={wId} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-200">{worker.name}</span>
            <div className="flex gap-2">
              {["Assigned", "Active", "Done"].map((label, idx) => (
                <button
                  key={label}
                  onClick={() => onApply(wId, idx)}
                  className="px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:border-indigo-600 dark:text-slate-300 transition shadow-sm"
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