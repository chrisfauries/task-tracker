import { useState, useEffect } from "react";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { useAtom, useSetAtom } from "jotai";
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
import { AppSettingsMenu } from "./AppSettingsMenu";
import { Login } from "./Login";
import { SnapshotDialog } from "./modals/SnapshotDialog";
import { CategoryManagementDialog } from "./modals/CategoryManagementDialog";
import { ImportExportDialog } from "./modals/ImportExportDialog";
import { AddToCategoryDialog } from "./modals/AddToCategoryDialog";
import { CustomColorsDialog } from "./modals/CustomColorDialog";
import {
  AddWorkerDialog,
  EditWorkerDialog,
  DeleteWorkerDialog,
} from "./modals/WorkerModals";
import {
  isAddWorkerDialogOpenAtom,
  isEditWorkerDialogOpenAtom,
  editingWorkerAtom,
  isDeleteWorkerDialogOpenAtom,
  workerToDeleteAtom,
  isCustomColorsDialogOpenAtom,
  customPaletteAtom
} from "./atoms";

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
  const setIsAddWorkerDialogOpen = useSetAtom(isAddWorkerDialogOpenAtom);
  const setIsEditWorkerDialogOpen = useSetAtom(isEditWorkerDialogOpenAtom);
  const setEditingWorker = useSetAtom(editingWorkerAtom);
  const setIsDeleteWorkerDialogOpen = useSetAtom(isDeleteWorkerDialogOpenAtom);
  const setWorkerToDelete = useSetAtom(workerToDeleteAtom);
  const [isImportExportDialogOpen, setIsImportExportDialogOpen] =
    useState(false);
  const [isCustomColorsDialogOpen, setIsCustomColorsDialogOpen] = useAtom(isCustomColorsDialogOpenAtom);
  
  // Custom Palette State
  const [customPalette] = useAtom(customPaletteAtom);

  // SYNC: Update CSS Variables when customPalette changes
  useEffect(() => {
    if (customPalette && customPalette.length > 0) {
      customPalette.forEach((color, index) => {
        document.documentElement.style.setProperty(`--color-user-${index + 1}`, color);
      });
    }
  }, [customPalette]);

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

  const handleEditWorkerStart = (id: string, currentName: string) => {
    // Default to 0 (Green) if missing
    const currentColor = boardData[id]?.defaultColor !== undefined ? boardData[id]?.defaultColor : 0;
    setEditingWorker({ id, name: currentName, color: currentColor });
    setIsEditWorkerDialogOpen(true);
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

    for (const [index, text] of category.items.entries()) {
      await DatabaseService.createNote(workerId, {
        text,
        column: colIndex,
        color: category.color !== undefined ? category.color : 0,
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

      <AppSettingsMenu
        onLogout={handleLogout}
        onOpenImportExport={() => setIsImportExportDialogOpen(true)}
        onOpenAddWorker={() => setIsAddWorkerDialogOpen(true)}
      />

      <TopBanner
        user={user}
        history={history}
        future={future}
        presence={presence}
        onUndo={handleUndo}
        onRedo={handleRedo}
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
          setIsDeleteWorkerDialogOpen(true);
        }}
      />

      {/* DIALOGS */}
      <AddToCategoryDialog />
      <SnapshotDialog />
      <AddWorkerDialog />
      <EditWorkerDialog />
      <DeleteWorkerDialog />
      <CategoryManagementDialog
        boardData={boardData}
        onApply={handleApplyCategory}
      />
      
      {isCustomColorsDialogOpen && (
        <CustomColorsDialog 
          onClose={() => setIsCustomColorsDialogOpen(false)}
          onSave={(colors) => DatabaseService.saveCustomPalette(colors)}
        />
      )}

      {isImportExportDialogOpen && (
        <ImportExportDialog
          onClose={() => setIsImportExportDialogOpen(false)}
          onExport={handleExport}
          onImport={handleImport}
        />
      )}
    </div>
  );
}