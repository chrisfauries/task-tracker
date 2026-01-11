import { useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import {
  isSnapshotDialogOpenAtom,
  snapshotsAtom,
  snapshotsLoadingAtom,
} from "../atoms";
import { DatabaseService } from "../DatabaseService";
import type { SavedSnapshot } from "../types";

export function SnapshotDialog() {
  const setIsOpen = useSetAtom(isSnapshotDialogOpenAtom);
  const sortedSnapshots = useAtomValue(snapshotsAtom);
  const loading = useAtomValue(snapshotsLoadingAtom);

  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleClose = () => setIsOpen(false);

  const handleRestore = async (snap: SavedSnapshot) => {
    try {
      await DatabaseService.restoreBackup(
        snap.boardData || {},
        snap.categories || {}
      );
      alert("Board restored successfully!");
      setConfirmRestoreId(null);
      handleClose();
    } catch (e) {
      console.error(e);
      alert("Error restoring snapshot.");
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await DatabaseService.deleteSnapshot(key);
      setConfirmDeleteId(null);
    } catch (e) {
      console.error(e);
      alert("Error deleting snapshot.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span>⏱️</span> Version History
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Auto-saved snapshots of the board state.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="text-center py-12 text-slate-400 italic">
              Loading snapshots...
            </div>
          ) : sortedSnapshots.length === 0 ? (
            <div className="text-center py-12 text-slate-400 italic">
              No snapshots available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSnapshots.map(([key, snap]) => (
                <div
                  key={key}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">
                        {snap.title}
                      </h3>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(snap.timestamp).toLocaleString()} • by{" "}
                        {snap.createdBy}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {confirmRestoreId === key ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                          <button
                            onClick={() => handleRestore(snap)}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700"
                          >
                            Yes, Restore
                          </button>
                          <button
                            onClick={() => setConfirmRestoreId(null)}
                            className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmDeleteId(null);
                            setConfirmRestoreId(key);
                          }}
                          className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-indigo-100 transition"
                        >
                          Restore
                        </button>
                      )}
                      {confirmDeleteId === key ? (
                        <div className="flex items-center gap-2 animate-in slide-in-from-right-2">
                          <button
                            onClick={() => handleDelete(key)}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700"
                          >
                            Confirm Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-300"
                          >
                            X
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setConfirmRestoreId(null);
                            setConfirmDeleteId(key);
                          }}
                          className="p-2 text-slate-300 hover:text-red-500 transition"
                          title="Delete Snapshot"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
