import React, { useState, useRef, useMemo } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  isDialogOpen,
  closeDialog,
  Dialog,
  boardDataAtom,
  workerOrderModeAtom,
  personalWorkerPositionsAtom,
  userAtom,
} from "../atoms";
import { DatabaseService } from "../DatabaseService";
import { STYLE_MAP, getSolidColorClass } from "../constants";

export function WorkerOrderDialog() {
  const isOpen = useAtomValue(isDialogOpen(Dialog.WORKER_ORDER));

  if (!isOpen) return null;
  return <WorkerOrderDialogContent />;
}

function WorkerOrderDialogContent() {
  const close = useSetAtom(closeDialog);
  const boardData = useAtomValue(boardDataAtom);
  const personalPositions = useAtomValue(personalWorkerPositionsAtom);
  const user = useAtomValue(userAtom);
  const [workerOrderMode, setWorkerOrderMode] = useAtom(workerOrderModeAtom);

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(0);

  // Drag and Drop State
  const listRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropState, setDropState] = useState<{
    index: number;
    top: number;
  } | null>(null);

  // Define resetDrag BEFORE it is called in useEffect
  const resetDrag = () => {
    setDraggedId(null);
    setDropState(null);
  };

  const workers = useMemo(() => {
    return Object.entries(boardData)
      .map(([id, data]) => {
        let position = Number.MAX_SAFE_INTEGER;
        if (workerOrderMode === "personal") {
          position = personalPositions[id] ?? Number.MAX_SAFE_INTEGER;
        } else {
          position = data.position ?? Number.MAX_SAFE_INTEGER;
        }
        return {
          id,
          name: data.name,
          color: data.defaultColor ?? 0,
          position,
        };
      })
      .sort((a, b) => {
        if (a.position === b.position) return a.name.localeCompare(b.name);
        return a.position - b.position;
      });
  }, [boardData, personalPositions, workerOrderMode]);

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
    const items = Array.from(listRef.current.children).filter((child) =>
      child.hasAttribute("data-worker-id"),
    ) as HTMLElement[];

    if (items.length === 0) return;

    const relativeMouseY =
      e.clientY - listRef.current.getBoundingClientRect().top;

    let closestIndex = items.length;
    let closestTop =
      items[items.length - 1].offsetTop + items[items.length - 1].offsetHeight;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const midpoint = item.offsetTop + item.offsetHeight / 2;

      if (relativeMouseY < midpoint) {
        closestIndex = i;
        closestTop = item.offsetTop;
        break;
      }
    }

    setDropState({ index: closestIndex, top: closestTop });
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();

    if (draggedId && dropState) {
      const currentIndex = workers.findIndex((w) => w.id === draggedId);
      if (currentIndex === -1) return resetDrag();

      const newWorkers = [...workers];
      const [removed] = newWorkers.splice(currentIndex, 1);

      const insertAt =
        dropState.index > currentIndex ? dropState.index - 1 : dropState.index;

      if (insertAt === currentIndex) {
        resetDrag();
        return;
      }

      newWorkers.splice(insertAt, 0, removed);

      const updates: Record<string, number> = {};
      newWorkers.forEach((w, index) => {
        updates[w.id] = (index + 1) * 1000;
      });

      if (workerOrderMode === "personal" && user) {
        await DatabaseService.updatePersonalWorkerPositions(user.uid, updates);
      } else {
        await DatabaseService.updateWorkerPositions(updates);
      }
    }
    resetDrag();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (
      scrollContainerRef.current &&
      !scrollContainerRef.current.contains(e.relatedTarget as Node)
    ) {
      setDropState(null);
    }
  };

  const handleUpdateWorker = async (id: string, newName: string, newColor: number) => {
    await DatabaseService.updateWorker(id, { name: newName, defaultColor: newColor });
  };

  const handleDeleteWorker = async (id: string) => {
    await DatabaseService.deleteWorker(id);
  };

  const handleAddWorker = async () => {
    if (!newName.trim()) return;

    try {
      const newId =  await DatabaseService.createWorker(newName, newColor);
      if (newId) {
        const maxPos =
          workers.length > 0
            ? Math.max(...workers.map((w) => w.position))
            : 0;

        const newPos = maxPos + 1000;

        if (workerOrderMode === "personal" && user) {
          await DatabaseService.updatePersonalWorkerPositions(user.uid, { [newId]: newPos });
        } else {
          await DatabaseService.updateWorkerPositions({ [newId]: newPos });
        }

        setIsAdding(false);
        setNewName("");
        setNewColor(0);
        setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (e) {
      console.error("Failed to add worker", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden max-h-[85vh] animate-in fade-in zoom-in-95 border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              Manage Workers
            </h2>
            <button
              onClick={() => close()}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>

          <div
            className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1 cursor-pointer select-none"
            onClick={() =>
              setWorkerOrderMode(
                workerOrderMode === "global" ? "personal" : "global"
              )
            }
          >
            <div
              className={`flex-1 text-center py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                workerOrderMode === "global"
                  ? "bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Global
            </div>
            <div
              className={`flex-1 text-center py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                workerOrderMode === "personal"
                  ? "bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Personal
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          className="p-4 overflow-y-auto flex-grow relative"
        >
          <p className={`text-xs  mb-4   ${
              workerOrderMode === "global" ? "text-red-600" : "text-blue-600"
            }`}>
            Drag and drop to reorder. {workerOrderMode === "global"
              ? "Updating the order for ALL users"
              : "Updating your personal ordering"}   Changes apply immediately.
          </p>

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
                  transform: "translateY(-50%)",
                }}
              />
            )}

            {workers.map((worker) => (
              <WorkerListItem
                key={worker.id}
                worker={worker}
                isDragged={draggedId === worker.id}
                onDragStart={(e) => handleDragStart(e, worker.id)}
                onDragEnd={resetDrag}
                onUpdate={handleUpdateWorker}
                onDelete={handleDeleteWorker}
              />
            ))}

            {/* Add Worker Section */}
            {isAdding ? (
              <div className="p-3 border rounded shadow-sm bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95">
                <div className="flex flex-col gap-3">
                  <input
                    autoFocus
                    type="text"
                    placeholder="New Worker Name"
                    className="w-full px-2 py-1.5 border dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-400 outline-none transition-all"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddWorker();
                      if(e.key === "Escape") {
                        setNewColor(0);
                        setNewName("");
                        setIsAdding(false)
                      }
                    }}
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1.5">
                      {STYLE_MAP.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setNewColor(index)}
                          className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${getSolidColorClass(
                            index
                          )} ${
                            newColor === index
                              ? "border-slate-800 dark:border-slate-200 scale-110 ring-1 ring-offset-1 ring-slate-400"
                              : "border-transparent"
                          }`}
                          title={`Color ${index + 1}`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddWorker}
                        disabled={!newName.trim()}
                        className="w-7 h-7 flex items-center justify-center bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Confirm Add"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setNewName("");
                          setNewColor(0);
                        }}
                        className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 rounded hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                className="p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center justify-center gap-2 group bg-slate-50/50 dark:bg-slate-800/30"
              >
                <span className="font-bold text-lg group-hover:scale-110 transition-transform">
                  +
                </span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  Add Worker
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface WorkerListItemProps {
  worker: { id: string; name: string; position: number; color: number };
  isDragged: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onUpdate: (id: string, name: string, color: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function WorkerListItem({
  worker,
  isDragged,
  onDragStart,
  onDragEnd,
  onUpdate,
  onDelete,
}: WorkerListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editName, setEditName] = useState(worker.name);
  const [editColor, setEditColor] = useState(worker.color);

  const handleSave = async () => {
    if (editName.trim()) {
      await onUpdate(worker.id, editName, editColor);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-500 flex flex-col gap-3">
        <input
          autoFocus
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full px-2 py-1 border dark:border-slate-600 rounded text-sm bg-white dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-400 outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setIsEditing(false);
              setEditName(worker.name);
              setEditColor(worker.color);
            }
          }}
        />
        <div className="flex justify-between items-center">
          <div className="flex gap-1.5">
            {STYLE_MAP.map((_, index) => (
              <button
                key={index}
                onClick={() => setEditColor(index)}
                className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${getSolidColorClass(
                  index
                )} ${
                  editColor === index
                    ? "border-slate-800 dark:border-slate-200 scale-110 ring-1 ring-offset-1 ring-slate-400"
                    : "border-transparent"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="text-green-600 dark:text-green-400 font-bold hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded">✓</button>
            <button onClick={() => { setIsEditing(false); setEditName(worker.name); setEditColor(worker.color); }} className="text-slate-400 dark:text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded">✕</button>
          </div>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="p-3 border rounded shadow-sm bg-white dark:bg-slate-800 border-red-200 dark:border-red-900 flex justify-between items-center">
        <span className="text-sm font-bold text-red-600 dark:text-red-400">Delete {worker.name}?</span>
        <div className="flex gap-2">
          <button
            onClick={() => onDelete(worker.id)}
            className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded font-bold hover:bg-red-200"
          >
            Yes
          </button>
          <button
            onClick={() => setIsDeleting(false)}
            className="px-2 py-1 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 text-xs rounded font-bold hover:bg-slate-200"
          >
            No
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-worker-id={worker.id}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`
        p-3 border rounded shadow-sm cursor-grab active:cursor-grabbing transition-colors flex justify-between items-center group
        ${isDragged ? "opacity-25 bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-600" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"}
      `}
    >
      <div className="flex items-center gap-3">
        <div className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400" title="Drag to reorder">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className={`w-3 h-3 rounded-full ${getSolidColorClass(worker.color)}`} />
        <span className="font-medium text-slate-700 dark:text-slate-200 select-none">{worker.name}</span>
      </div>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => { setIsEditing(true); setEditName(worker.name); setEditColor(worker.color); }} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" title="Edit">✏️</button>
        <button onClick={() => setIsDeleting(true)} className="text-red-400 hover:text-red-600 dark:hover:text-red-400" title="Delete">🗑️</button>
      </div>
    </div>
  );
}
