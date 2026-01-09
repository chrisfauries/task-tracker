import React from "react";
import { COLOR_MATRIX } from "../constants";

interface AddWorkerDialogProps {
  name: string;
  setName: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddWorkerDialog({ name, setName, color, setColor, onClose, onSubmit }: AddWorkerDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Add New Worker</h2>
        <form onSubmit={onSubmit}>
          <input autoFocus type="text" placeholder="Worker or Student Name" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none mb-6" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Default Note Color</label>
            <div className="flex justify-center gap-2">
              {Object.values(COLOR_MATRIX).map((family) => (
                <button key={family.name} type="button" onClick={() => setColor(family.name)} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${family.shades[1].bg} ${color === family.name ? "border-slate-800 scale-110" : "border-transparent"}`} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Add to Board</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditWorkerDialogProps {
  name: string;
  setName: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EditWorkerDialog({ name, setName, color, setColor, onClose, onSubmit }: EditWorkerDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Edit Worker Name</h2>
        <form onSubmit={onSubmit}>
          <input autoFocus type="text" placeholder="Worker or Student Name" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none mb-6" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Default Note Color</label>
            <div className="flex justify-center gap-2">
              {Object.values(COLOR_MATRIX).map((family) => (
                <button key={family.name} type="button" onClick={() => setColor(family.name)} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${family.shades[1].bg} ${color === family.name ? "border-slate-800 scale-110" : "border-transparent"}`} />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteWorkerDialogProps {
  name: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteWorkerDialog({ name, onClose, onConfirm }: DeleteWorkerDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-t-4 border-red-500 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Row?</h2>
        <p className="text-slate-600 mb-6">Are you sure you want to delete <span className="font-bold text-slate-900">{name}</span>?</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition">Keep Row</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">Delete Everything</button>
        </div>
      </div>
    </div>
  );
}