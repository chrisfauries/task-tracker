import React, { useState, useEffect } from "react";
import { ref, push, remove, update, set } from "firebase/database";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";

// --- IMPORTED MODULES ---
import { db, auth, provider } from "./firebase";
import type { DragOrigin, BackupData } from "./types";

// --- HOOKS ---
import { usePresence } from "./hooks/usePresence";
import { useBoardData } from "./hooks/useBoardData";
import { useSnapshots } from "./hooks/useSnapshots";
import { useHistory } from "./hooks/useHistory";

// --- COMPONENTS ---
import { TopBanner } from "./TopBanner";
import { Board } from "./Board";
import { ContextMenu } from "./ContextMenu";
import { Login } from "./Login";
import { SnapshotDialog } from "./modals/SnapshotDialog";
import { CategoryDialog } from "./modals/CategoryManagementDialog";
import { ImportExportDialog } from "./modals/ImportExportDialog";
import { AddToCategoryDialog } from "./modals/AddToCategoryDialog";
import { AddWorkerDialog, EditWorkerDialog, DeleteWorkerDialog } from "./modals/WorkerModals";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  
  // Custom Hooks
  usePresence(user);
  const { boardData, categories, locks, presence } = useBoardData(user);
  const { saveSnapshot, trackActivity } = useSnapshots(user, boardData, categories);
  const { history, future, registerHistory, handleUndo, handleRedo } = useHistory(user, trackActivity);

  // Local UI State
  const [dragOrigin, setDragOrigin] = useState<DragOrigin | null>(null);

  // Modal States
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isImportExportDialogOpen, setIsImportExportDialogOpen] = useState(false);
  const [isSnapshotDialogOpen, setIsSnapshotDialogOpen] = useState(false);

  // Add Worker State
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerColor, setNewWorkerColor] = useState("Green");

  // Worker Edit State
  const [isEditWorkerDialogOpen, setIsEditWorkerDialogOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editWorkerName, setEditWorkerName] = useState("");
  const [editWorkerColor, setEditWorkerColor] = useState("Green");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<{ id: string; name: string; } | null>(null);

  // Context Menu State
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number; } | null>(null);
  const [targetNote, setTargetNote] = useState<{ id: string; workerId: string; text: string; } | null>(null);
  const [isAddToCatDialogOpen, setIsAddToCatDialogOpen] = useState(false);

  // Global click listener to close context menu
  useEffect(() => {
    const handleClick = () => setContextMenuPos(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  // Global drag end listener
  useEffect(() => {
    if (!user) return;
    const handleGlobalDragEnd = () => setDragOrigin(null);
    window.addEventListener("dragend", handleGlobalDragEnd);
    return () => window.removeEventListener("dragend", handleGlobalDragEnd);
  }, [user]);

  // Auth Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = () => {
    signInWithPopup(auth, provider);
  };

  const handleLogout = async () => {
    if (user) {
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const dateStr = new Date().toLocaleDateString();
      await saveSnapshot(`${user.displayName} logged out @ ${timeStr} on ${dateStr}`);
    }
    signOut(auth);
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    trackActivity();
    const workersRef = ref(db, "boarddata");
    push(workersRef, {
      name: newWorkerName,
      notes: {},
      defaultColor: newWorkerColor,
    });

    setNewWorkerName("");
    setNewWorkerColor("Green");
    setIsWorkerDialogOpen(false);
  };

  const handleEditWorkerStart = (id: string, currentName: string) => {
    setEditingWorkerId(id);
    setEditWorkerName(currentName);
    setEditWorkerColor(boardData[id]?.defaultColor || "Green");
    setIsEditWorkerDialogOpen(true);
  };

  const handleEditWorkerSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWorkerName.trim() || !editingWorkerId) return;

    trackActivity();
    const workerRef = ref(db, `boarddata/${editingWorkerId}`);
    update(workerRef, { name: editWorkerName, defaultColor: editWorkerColor });

    setIsEditWorkerDialogOpen(false);
    setEditingWorkerId(null);
    setEditWorkerName("");
    setEditWorkerColor("Green");
  };

  const confirmDeleteWorker = () => {
    if (workerToDelete) {
      trackActivity();
      remove(ref(db, `boarddata/${workerToDelete.id}`));
      setIsDeleteDialogOpen(false);
      setWorkerToDelete(null);
    }
  };

  const handleApplyCategory = (catId: string, workerId: string, colIndex: number) => {
    const category = categories[catId];
    if (!category || !category.items) return;

    trackActivity();
    const workerNotes = boardData[workerId]?.notes || {};
    const validPositions = Object.values(workerNotes)
      .filter((n) => n.column === colIndex && typeof n.position === "number" && !isNaN(n.position))
      .map((n) => n.position);
    const lastPos = validPositions.length > 0 ? Math.max(...validPositions) : 0;

    category.items.forEach((text, index) => {
      const newNoteRef = push(ref(db, `boarddata/${workerId}/notes`));
      set(newNoteRef, {
        text,
        column: colIndex,
        color: category.color || "Green",
        position: lastPos + 1000 + index * 10,
        categoryName: category.name,
      });
    });
  };

  const handleNoteContextMenu = (e: React.MouseEvent, noteId: string, workerId: string, text: string) => {
    e.preventDefault();
    setTargetNote({ id: noteId, workerId, text });
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleAssignCategory = (catId: string) => {
    if (!targetNote) return;
    const category = categories[catId];
    if (!category) return;
    trackActivity();

    update(ref(db, `boarddata/${targetNote.workerId}/notes/${targetNote.id}`), {
      categoryName: category.name,
      color: category.color || "Green",
    });

    const currentItems = category.items || [];
    const newItems = [...currentItems, targetNote.text];
    update(ref(db, `categories/${catId}`), { items: newItems });

    setIsAddToCatDialogOpen(false);
    setTargetNote(null);
  };

  const handleExport = () => {
    const backup: BackupData = { version: 1, timestamp: Date.now(), boardData, categories };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `board_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string) as BackupData;
        if (!json.boardData && !json.categories) {
          alert("Invalid backup file: Missing board data.");
          return;
        }
        trackActivity();
        await set(ref(db, "boarddata"), json.boardData || {});
        await set(ref(db, "categories"), json.categories || {});
        setIsImportExportDialogOpen(false);
        alert("Board restored successfully!");
      } catch (err) {
        console.error(err);
        alert("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden relative" style={{ fontFamily: "Georgia, serif" }}>
      <style>{`.note-scroll::-webkit-scrollbar { width: 6px; height: 6px; } .note-scroll::-webkit-scrollbar-track { background: transparent; } .note-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 3px; } .note-scroll:hover::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); }`}</style>

      {/* Context Menu Component */}
      <ContextMenu 
        position={contextMenuPos} 
        onClose={() => setContextMenuPos(null)} 
        onAddToCategory={() => setIsAddToCatDialogOpen(true)} 
      />

      {/* MAIN LAYOUT */}
      <TopBanner
        user={user}
        history={history}
        future={future}
        presence={presence}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onLogout={handleLogout}
        onOpenSnapshots={() => setIsSnapshotDialogOpen(true)}
        onOpenImportExport={() => setIsImportExportDialogOpen(true)}
        onOpenCategories={() => setIsCategoryDialogOpen(true)}
        onOpenAddWorker={() => setIsWorkerDialogOpen(true)}
      />

      <Board
        boardData={boardData}
        dragOrigin={dragOrigin}
        onDragStart={setDragOrigin}
        onDragEnd={() => setDragOrigin(null)}
        locks={locks}
        currentUser={user}
        onActivity={trackActivity}
        onHistory={registerHistory}
        onNoteContextMenu={handleNoteContextMenu}
        onEditWorker={handleEditWorkerStart}
        onDeleteWorker={(id, name) => { setWorkerToDelete({ id, name }); setIsDeleteDialogOpen(true); }}
      />

      {/* DIALOGS */}
      {isAddToCatDialogOpen && <AddToCategoryDialog categories={categories} onClose={() => setIsAddToCatDialogOpen(false)} onSelect={handleAssignCategory} />}
      {isCategoryDialogOpen && <CategoryDialog categories={categories} boardData={boardData} onClose={() => setIsCategoryDialogOpen(false)} onApply={handleApplyCategory} />}
      {isImportExportDialogOpen && <ImportExportDialog onClose={() => setIsImportExportDialogOpen(false)} onExport={handleExport} onImport={handleImport} />}
      {isSnapshotDialogOpen && <SnapshotDialog onClose={() => setIsSnapshotDialogOpen(false)} />}
      
      {isWorkerDialogOpen && <AddWorkerDialog name={newWorkerName} setName={setNewWorkerName} color={newWorkerColor} setColor={setNewWorkerColor} onClose={() => setIsWorkerDialogOpen(false)} onSubmit={handleAddWorker} />}
      {isEditWorkerDialogOpen && <EditWorkerDialog name={editWorkerName} setName={setEditWorkerName} color={editWorkerColor} setColor={setEditWorkerColor} onClose={() => setIsEditWorkerDialogOpen(false)} onSubmit={handleEditWorkerSave} />}
      {isDeleteDialogOpen && <DeleteWorkerDialog name={workerToDelete?.name || ""} onClose={() => setIsDeleteDialogOpen(false)} onConfirm={confirmDeleteWorker} />}
    </div>
  );
}