import React, { useState, useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { isWorkerOrderDialogOpenAtom, boardDataAtom } from "../atoms";
import { DatabaseService } from "../DatabaseService";
import { Button } from "../Button";

export function WorkerOrderDialog() {
  const [isOpen, setIsOpen] = useAtom(isWorkerOrderDialogOpenAtom);
  const boardData = useAtomValue(boardDataAtom);
  const [workers, setWorkers] = useState<{ id: string; name: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Drag and Drop State
  const listRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropState, setDropState] = useState<{ index: number; top: number } | null>(null);

  // Define resetDrag BEFORE it is called in useEffect
  const resetDrag = () => {
    setDraggedId(null);
    setDropState(null);
  };

  // We explicitly only want to seed the local state when the modal opens to avoid 
  // external database updates resetting the user's active un-saved drag reordering.
  useEffect(() => {
    if (isOpen) {
      const sorted = Object.entries(boardData).map(([id, data]) => ({
        id,
        name: data.name,
        position: data.position ?? Number.MAX_SAFE_INTEGER
      })).sort((a, b) => {
         if (a.position === b.position) return a.name.localeCompare(b.name);
         return a.position - b.position;
      });
      setWorkers(sorted);
    } else {
      setWorkers([]);
      resetDrag();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  // --- DnD Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    if (!listRef.current || !draggedId) return;

    // --- Drop Index Calculation ---
    const items = Array.from(listRef.current.children).filter(
        (child) => child.hasAttribute("data-worker-id")
    ) as HTMLElement[];

    if (items.length === 0) return;

    const relativeMouseY = e.clientY - listRef.current.getBoundingClientRect().top;

    let closestIndex = items.length;
    let closestTop = items[items.length - 1].offsetTop + items[items.length - 1].offsetHeight;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
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
    
    if (draggedId && dropState) {
        const currentIndex = workers.findIndex((w) => w.id === draggedId);
        if (currentIndex === -1) return resetDrag();
        
        const newWorkers = [...workers];
        const [removed] = newWorkers.splice(currentIndex, 1);
        
        const insertAt = dropState.index > currentIndex ? dropState.index - 1 : dropState.index;
        newWorkers.splice(insertAt, 0, removed);
        
        setWorkers(newWorkers);
    }
    resetDrag();
  };

  const handleDragLeave = (e: React.DragEvent) => {
      if (scrollContainerRef.current && !scrollContainerRef.current.contains(e.relatedTarget as Node)) {
          setDropState(null);
      }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updates: Record<string, number> = {};
    workers.forEach((w, index) => {
      updates[w.id] = index * 1000;
    });
    
    await DatabaseService.updateWorkerPositions(updates);
    
    setIsSaving(false);
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Manage Worker Order
          </h2>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            ✕
          </button>
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="p-4 overflow-y-auto flex-grow relative"
        >
           <p className="text-xs text-slate-500 mb-4 dark:text-slate-400">Drag and drop to reorder. Changes apply on save.</p>
           
           <div 
             ref={listRef}
             className="flex flex-col gap-2 relative min-h-[50px]"
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

             {workers.map((worker) => (
                <div
                  key={worker.id}
                  data-worker-id={worker.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, worker.id)}
                  onDragEnd={resetDrag}
                  className={`
                    p-3 border rounded shadow-sm cursor-grab active:cursor-grabbing transition-colors
                    ${draggedId === worker.id 
                        ? "opacity-25 bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-600" 
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 cursor-grab select-none">⋮⋮</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 select-none">{worker.name}</span>
                  </div>
                </div>
             ))}
           </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
          <Button variant="neutral" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={isSaving}>
             {isSaving ? "Saving..." : "Save Order"}
          </Button>
        </div>
      </div>
    </div>
  )
}