import React, { useState, useRef } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { isImportExportDialogOpenAtom, categoriesAtom, customPaletteAtom } from "../atoms";
import { DatabaseService } from "../DatabaseService";
import type { BoardData, BackupData } from "../types";
import { DEFAULT_PALETTE_HEX } from "../constants";

interface ImportExportDialogProps {
  boardData: BoardData;
}

export function ImportExportDialog({ boardData }: ImportExportDialogProps) {
  const isOpen = useAtomValue(isImportExportDialogOpenAtom);
  
  if (!isOpen) return null;

  return <ImportExportDialogContent boardData={boardData} />;
}

function ImportExportDialogContent({ boardData }: { boardData: BoardData }) {
  const setIsOpen = useSetAtom(isImportExportDialogOpenAtom);
  const categories = useAtomValue(categoriesAtom);
  const customColors = useAtomValue(customPaletteAtom);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmingImport, setConfirmingImport] = useState<File | null>(null);

  const handleClose = () => setIsOpen(false);

  const handleExport = () => {
    const backup: BackupData = {
      version: 1,
      timestamp: Date.now(),
      boardData,
      categories,
      customColors
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
        
        await DatabaseService.restoreBackup(
          json.boardData || {},
          json.categories || {},
          json.customColors || DEFAULT_PALETTE_HEX
        );
        setIsOpen(false);
        alert("Board restored successfully!");
      } catch (err) {
        console.error(err);
        alert("Failed to parse backup file.");
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setConfirmingImport(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Data Management</h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* EXPORT SECTION */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><span className="text-xl">💾</span> Export Backup</h3>
            <p className="text-sm text-blue-600 mb-4">Download a copy of the entire board state (Notes, Categories, and Rows) to your computer as a JSON file.</p>
            <button onClick={handleExport} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-sm">Download Backup</button>
          </div>

          <div className="w-full h-px bg-slate-200"></div>

          {/* IMPORT SECTION */}
          {!confirmingImport ? (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
              <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2"><span className="text-xl">📂</span> Import Backup</h3>
              <p className="text-sm text-amber-700 mb-4">
                Restore the board from a previously saved JSON file.<br />
                <span className="font-bold">Warning:</span> This will completely overwrite the current board.
              </p>
              <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-2.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-medium rounded-lg transition shadow-sm">Select Backup File...</button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
              <h3 className="font-bold text-red-800 mb-2 text-lg">⚠️ Are you sure?</h3>
              <p className="text-sm text-red-600 mb-6">
                You are about to overwrite the entire board with data from <span className="font-bold font-mono bg-red-100 px-1 rounded">{confirmingImport.name}</span>.<br /><br />
                This action <span className="font-bold underline">cannot be undone</span>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setConfirmingImport(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex-1 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    if (confirmingImport) handleImport(confirmingImport);
                  }} 
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md"
                >
                  Yes, Overwrite
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}