import React, { useState, useEffect } from "react";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth, provider } from "./firebase";
import { DatabaseService } from "./DatabaseService";
import type { DragOrigin, BackupData } from "./types";
import { usePresence } from "./hooks/usePresence";
import { useBoardData } from "./hooks/useBoardData";
import { useSnapshots } from "./hooks/useSnapshots";
import { useHistory } from "./hooks/useHistory";
import { TopBanner } from "./TopBanner";
import { Board } from "./Board";
import { ContextMenu } from "./ContextMenu";
import { Login } from "./Login";
import { SnapshotDialog } from "./modals/SnapshotDialog";
import { CategoryDialog } from "./modals/CategoryManagementDialog";
import { ImportExportDialog } from "./modals/ImportExportDialog";
import { AddToCategoryDialog } from "./modals/AddToCategoryDialog";
import {
  AddWorkerDialog,
  EditWorkerDialog,
  DeleteWorkerDialog,
} from "./modals/WorkerModals";

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  // Custom Hooks
  usePresence(user);
  const { boardData, categories, locks, presence } = useBoardData(user);
  const { saveSnapshot, trackActivity } = useSnapshots(
    user,
    boardData,
    categories
  );
  const { history, future, registerHistory, handleUndo, handleRedo } =
    useHistory(user, trackActivity);

  // Local UI State
  const [dragOrigin, setDragOrigin] = useState<DragOrigin | null>(null);

  // Modal States
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isImportExportDialogOpen, setIsImportExportDialogOpen] =
    useState(false);

  // Add Worker State
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerColor, setNewWorkerColor] = useState("Green");

  // Worker Edit State
  const [isEditWorkerDialogOpen, setIsEditWorkerDialogOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editWorkerName, setEditWorkerName] = useState("");
  const [editWorkerColor, setEditWorkerColor] = useState("Green");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    const handleGlobalDragEnd = () => setDragOrigin(null);
    window.addEventListener("dragend", handleGlobalDragEnd);
    return () => window.removeEventListener("dragend", handleGlobalDragEnd);
  }, [user]);

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
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = new Date().toLocaleDateString();
      await saveSnapshot(
        `${user.displayName} logged out @ ${timeStr} on ${dateStr}`
      );
    }
    signOut(auth);
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    trackActivity();
    await DatabaseService.createWorker(newWorkerName, newWorkerColor);

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

  const handleEditWorkerSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWorkerName.trim() || !editingWorkerId) return;

    trackActivity();
    await DatabaseService.updateWorker(editingWorkerId, {
      name: editWorkerName,
      defaultColor: editWorkerColor,
    });

    setIsEditWorkerDialogOpen(false);
    setEditingWorkerId(null);
    setEditWorkerName("");
    setEditWorkerColor("Green");
  };

  const confirmDeleteWorker = async () => {
    if (workerToDelete) {
      trackActivity();
      await DatabaseService.deleteWorker(workerToDelete.id);
      setIsDeleteDialogOpen(false);
      setWorkerToDelete(null);
    }
  };

  const handleApplyCategory = async (
    catId: string,
    workerId: string,
    colIndex: number
  ) => {
    const category = categories[catId];
    if (!category || !category.items) return;

    trackActivity();
    const workerNotes = boardData[workerId]?.notes || {};
    const validPositions = Object.values(workerNotes)
      .filter(
        (n) =>
          n.column === colIndex &&
          typeof n.position === "number" &&
          !isNaN(n.position)
      )
      .map((n) => n.position);
    const lastPos = validPositions.length > 0 ? Math.max(...validPositions) : 0;

    // We can iterate and create notes
    for (const [index, text] of category.items.entries()) {
      await DatabaseService.createNote(workerId, {
        text,
        column: colIndex,
        color: category.color || "Green",
        position: lastPos + 1000 + index * 10,
        categoryName: category.name,
      });
    }
  };

  const handleExport = () => {
    const backup: BackupData = {
      version: 1,
      timestamp: Date.now(),
      boardData,
      categories,
    };
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute(
      "download",
      `board_backup_${new Date().toISOString().split("T")[0]}.json`
    );
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
        await DatabaseService.restoreBackup(
          json.boardData || {},
          json.categories || {}
        );
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
    <div
      className="h-screen flex flex-col bg-slate-50 overflow-hidden relative"
      style={{ fontFamily: "Georgia, serif" }}
    >

      <ContextMenu />

      <TopBanner
        user={user}
        history={history}
        future={future}
        presence={presence}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onLogout={handleLogout}
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
        onEditWorker={handleEditWorkerStart}
        onDeleteWorker={(id, name) => {
          setWorkerToDelete({ id, name });
          setIsDeleteDialogOpen(true);
        }}
      />

      {/* DIALOGS */}
      <AddToCategoryDialog />
      <SnapshotDialog />

      {isCategoryDialogOpen && (
        <CategoryDialog
          categories={categories}
          boardData={boardData}
          onClose={() => setIsCategoryDialogOpen(false)}
          onApply={handleApplyCategory}
        />
      )}
      {isImportExportDialogOpen && (
        <ImportExportDialog
          onClose={() => setIsImportExportDialogOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
      {isWorkerDialogOpen && (
        <AddWorkerDialog
          name={newWorkerName}
          setName={setNewWorkerName}
          color={newWorkerColor}
          setColor={setNewWorkerColor}
          onClose={() => setIsWorkerDialogOpen(false)}
          onSubmit={handleAddWorker}
        />
      )}
      {isEditWorkerDialogOpen && (
        <EditWorkerDialog
          name={editWorkerName}
          setName={setEditWorkerName}
          color={editWorkerColor}
          setColor={setEditWorkerColor}
          onClose={() => setIsEditWorkerDialogOpen(false)}
          onSubmit={handleEditWorkerSave}
        />
      )}
      {isDeleteDialogOpen && (
        <DeleteWorkerDialog
          name={workerToDelete?.name || ""}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={confirmDeleteWorker}
        />
      )}
    </div>
  );
}
