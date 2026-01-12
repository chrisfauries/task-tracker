import React, {  useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { COLOR_MATRIX } from "../constants";
import { DatabaseService } from "../DatabaseService";
import {
  isAddWorkerDialogOpenAtom,
  isEditWorkerDialogOpenAtom,
  editingWorkerAtom,
  isDeleteWorkerDialogOpenAtom,
  workerToDeleteAtom,
} from "../atoms";

export function AddWorkerDialog() {
  if(!useAtomValue(isAddWorkerDialogOpenAtom)) return null;

  return <AddWorkerDialogContent />;
}

 function AddWorkerDialogContent() {
  const  setIsOpen = useSetAtom(isAddWorkerDialogOpenAtom);
  const [name, setName] = useState("");
  const [color, setColor] = useState("Green");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await DatabaseService.createWorker(name, color);
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Add New Worker
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            placeholder="Worker or Student Name"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none mb-6"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Default Note Color
            </label>
            <div className="flex justify-center gap-2">
              {Object.values(COLOR_MATRIX).map((family) => (
                <button
                  key={family.name}
                  type="button"
                  onClick={() => setColor(family.name)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    family.shades[1].bg
                  } ${
                    color === family.name
                      ? "border-slate-800 scale-110"
                      : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Add to Board
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditWorkerDialog() {
 const isOpen = useAtomValue(isEditWorkerDialogOpenAtom);
  const editingWorker = useAtomValue(editingWorkerAtom);
  
  if(!isOpen || !editingWorker) return null;
  return <EditWorkerDialogContent />;
}

 function EditWorkerDialogContent() {
  const  setIsOpen = useSetAtom(isEditWorkerDialogOpenAtom);
  const [editingWorker, setEditingWorker] = useAtom(editingWorkerAtom);

  const [name, setName] = useState(editingWorker?.name || "");
  const [color, setColor] = useState(editingWorker?.color || "Green");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !editingWorker) return;

    await DatabaseService.updateWorker(editingWorker.id, {
      name: name,
      defaultColor: color,
    });

    setIsOpen(false);
    setEditingWorker(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingWorker(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Edit Worker Name
        </h2>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type="text"
            placeholder="Worker or Student Name"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none mb-6"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Default Note Color
            </label>
            <div className="flex justify-center gap-2">
              {Object.values(COLOR_MATRIX).map((family) => (
                <button
                  key={family.name}
                  type="button"
                  onClick={() => setColor(family.name)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    family.shades[1].bg
                  } ${
                    color === family.name
                      ? "border-slate-800 scale-110"
                      : "border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DeleteWorkerDialog() {
  if(!useAtomValue(isDeleteWorkerDialogOpenAtom)) return null;

  return <DeleteWorkerDialogContent />;
}

function DeleteWorkerDialogContent() {
  const  setIsOpen = useSetAtom(isDeleteWorkerDialogOpenAtom);
  const [workerToDelete, setWorkerToDelete] = useAtom(workerToDeleteAtom);

  const handleConfirm = async () => {
    if (workerToDelete) {
      await DatabaseService.deleteWorker(workerToDelete.id);
      setIsOpen(false);
      setWorkerToDelete(null);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setWorkerToDelete(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-t-4 border-red-500 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Row?</h2>
        <p className="text-slate-600 mb-6">
          Are you sure you want to delete{" "}
          <span className="font-bold text-slate-900">
            {workerToDelete?.name}
          </span>
          ?
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
          >
            Keep Row
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
          >
            Delete Everything
          </button>
        </div>
      </div>
    </div>
  );
}
