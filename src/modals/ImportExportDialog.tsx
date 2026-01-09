import React, { useState, useRef } from "react";

interface ImportExportDialogProps {
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export function ImportExportDialog({
  onClose,
  onExport,
  onImport,
}: ImportExportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmingImport, setConfirmingImport] = useState<File | null>(null);

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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* EXPORT SECTION */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2"><span className="text-xl">💾</span> Export Backup</h3>
            <p className="text-sm text-blue-600 mb-4">Download a copy of the entire board state (Notes, Categories, and Rows) to your computer as a JSON file.</p>
            <button onClick={onExport} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-sm">Download Backup</button>
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
                <button onClick={() => onImport(confirmingImport)} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md">Yes, Overwrite</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}