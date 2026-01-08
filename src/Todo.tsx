import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove,
  update,
  onDisconnect,
  DataSnapshot,
  serverTimestamp,
} from "firebase/database";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";

// --- TYPES ---
interface Note {
  text: string;
  column: number;
  color?: string;
  position: number;
}

interface WorkerData {
  name: string;
  notes?: Record<string, Note>;
}

interface Category {
  name: string;
  items: string[];
  color?: string;
}

interface LockData {
  userId: string;
  userName: string;
  timestamp: number;
}

interface PresenceData {
  userId: string;
  userName: string;
  photoURL?: string;
  lastActive: number;
  online: boolean;
}

type BoardData = Record<string, WorkerData>;
type CategoriesData = Record<string, Category>;
type LocksData = Record<string, LockData>;
type AllPresenceData = Record<string, PresenceData>;

interface DragOrigin {
  workerId: string;
  colIndex: number;
}

interface BackupData {
  version: number;
  timestamp: number;
  boardData: BoardData;
  categories: CategoriesData;
}

// --- CONFIG ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// --- ASSETS ---
// Dummy path for the bell sound. Replace this file in your public folder.
const BELL_SOUND_URL = "/bell.mp3";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [boardData, setBoardData] = useState<BoardData>({});
  const [categories, setCategories] = useState<CategoriesData>({});
  const [locks, setLocks] = useState<LocksData>({});
  const [presence, setPresence] = useState<AllPresenceData>({});
  const [dragOrigin, setDragOrigin] = useState<DragOrigin | null>(null);

  // Modal States
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isImportExportDialogOpen, setIsImportExportDialogOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Setup Presence on Login
        const userStatusRef = ref(db, `/presence/${u.uid}`);

        // Remove on disconnect
        onDisconnect(userStatusRef).remove();

        // Set initial status
        set(userStatusRef, {
          userId: u.uid,
          userName: u.displayName || "Anonymous",
          photoURL: u.photoURL || "",
          online: true,
          lastActive: serverTimestamp(),
        });
      }
    });

    const boardRef = ref(db, "boarddata");
    const unsubscribeDb = onValue(boardRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as BoardData | null;
      setBoardData(data || {});
    });

    const catRef = ref(db, "categories");
    const unsubscribeCats = onValue(catRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as CategoriesData | null;
      setCategories(data || {});
    });

    // Listen for locks
    const locksRef = ref(db, "locks");
    const unsubscribeLocks = onValue(locksRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as LocksData | null;
      setLocks(data || {});
    });

    // Listen for presence (avatars)
    const presenceRef = ref(db, "presence");
    const unsubscribePresence = onValue(
      presenceRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val() as AllPresenceData | null;
        setPresence(data || {});
      }
    );

    const handleGlobalDragEnd = () => setDragOrigin(null);
    window.addEventListener("dragend", handleGlobalDragEnd);

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
      unsubscribeCats();
      unsubscribeLocks();
      unsubscribePresence();
      window.removeEventListener("dragend", handleGlobalDragEnd);
    };
  }, []);

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerName.trim()) return;

    const workersRef = ref(db, "boarddata");
    push(workersRef, {
      name: newWorkerName,
      notes: {},
    });

    setNewWorkerName("");
    setIsWorkerDialogOpen(false);
  };

  const confirmDeleteWorker = () => {
    if (workerToDelete) {
      remove(ref(db, `boarddata/${workerToDelete.id}`));
      setIsDeleteDialogOpen(false);
      setWorkerToDelete(null);
    }
  };

  const handleApplyCategory = (
    catId: string,
    workerId: string,
    colIndex: number
  ) => {
    const category = categories[catId];
    if (!category || !category.items) return;

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

    category.items.forEach((text, index) => {
      const newNoteRef = push(ref(db, `boarddata/${workerId}/notes`));
      set(newNoteRef, {
        text,
        column: colIndex,
        color: category.color || "Green",
        position: lastPos + 1000 + index * 10,
      });
    });
  };

  // --- IMPORT / EXPORT LOGIC ---
  const handleExport = () => {
    const backup: BackupData = {
      version: 1,
      timestamp: Date.now(),
      boardData,
      categories,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
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
        
        // Basic validation
        if (!json.boardData && !json.categories) {
          alert("Invalid backup file: Missing board data.");
          return;
        }

        // Update DB
        // We set these independently to ensure we don't accidentally wipe 'presence' or 'locks'
        // if we were to set the root object.
        await set(ref(db, "boarddata"), json.boardData || {});
        await set(ref(db, "categories"), json.categories || {});
        
        setIsImportExportDialogOpen(false);
        alert("Board restored successfully!");
      } catch (err) {
        console.error(err);
        alert("Failed to parse backup file. Please ensure it is a valid JSON file exported from this app.");
      }
    };
    reader.readAsText(file);
  };

  if (!user)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">Because Band</h1>
        <button
          onClick={() => signInWithPopup(auth, provider)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-lg"
        >
          Sign in with Google
        </button>
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden relative">
      <div className="p-4 border-b bg-white z-50 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-700">Because Band Board</h1>

        <div className="flex gap-3 items-center">
          {/* Avatar List */}
          <div className="flex -space-x-2 mr-4 border-r pr-4 border-slate-200">
            {Object.values(presence)
              .filter((p) => p.online)
              .map((p) => (
                <div
                  key={p.userId}
                  className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative title-tip"
                  title={p.userName}
                >
                  {p.photoURL ? (
                    <img
                      src={p.photoURL}
                      alt={p.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500">
                      {p.userName.charAt(0)}
                    </div>
                  )}
                  {/* Online dot */}
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
              ))}
          </div>
          
          <button
            onClick={() => setIsImportExportDialogOpen(true)}
            className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-md hover:bg-slate-200 text-sm font-medium transition shadow-sm"
          >
            Import/Export
          </button>
          <button
            onClick={() => setIsCategoryDialogOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium transition shadow-sm"
          >
            Categories
          </button>
          <button
            onClick={() => setIsWorkerDialogOpen(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 text-sm font-medium transition shadow-sm"
          >
            Add Worker
          </button>
          <button
            onClick={() => signOut(auth)}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-8">
        <div className="min-w-[100%] flex flex-col">
          <div className="flex mb-6 items-center">
            <div className="sticky left-0 bg-slate-50 z-40 w-24 pl-8 flex-none"></div>
            {["Assigned", "In Progress", "Completed"].map((h) => (
              <div
                key={h}
                className="w-[40%] flex-none text-center font-bold text-slate-400 uppercase text-xs tracking-widest px-4"
              >
                {h}
              </div>
            ))}
          </div>

          {Object.entries(boardData).map(([workerId, worker]) => (
            <div key={workerId} className="flex mb-8 min-h-[250px]">
              <div className="sticky left-0 bg-slate-50 z-30 pl-8 pr-4 flex-none w-24">
                <div className="bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-md h-full group relative overflow-hidden">
                  <button
                    onClick={() => {
                      setWorkerToDelete({ id: workerId, name: worker.name });
                      setIsDeleteDialogOpen(true);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white text-[10px] font-bold z-10"
                  >
                    ✕
                  </button>
                  <span
                    className="font-bold text-slate-700 whitespace-nowrap select-none"
                    style={{
                      writingMode: "vertical-lr",
                      transform: "rotate(180deg)",
                    }}
                  >
                    {worker.name}
                  </span>
                </div>
              </div>

              {[0, 1, 2].map((colIndex) => (
                <div key={colIndex} className="w-[40%] flex-none px-4">
                  <DropZone
                    workerId={workerId}
                    colIndex={colIndex}
                    notes={worker.notes || {}}
                    dragOrigin={dragOrigin}
                    onDragStart={(origin) => setDragOrigin(origin)}
                    onDragEnd={() => setDragOrigin(null)}
                    locks={locks}
                    currentUser={user}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Add New Worker
            </h2>
            <form onSubmit={handleAddWorker}>
              <input
                autoFocus
                type="text"
                placeholder="Worker or Student Name"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none mb-6"
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsWorkerDialogOpen(false)}
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
      )}

      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md border-t-4 border-red-500 animate-in fade-in zoom-in duration-200">
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Delete Row?
            </h2>
            <p className="text-slate-600 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-bold text-slate-900">
                {workerToDelete?.name}
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition"
              >
                Keep Row
              </button>
              <button
                onClick={confirmDeleteWorker}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTS ---

interface ImportExportDialogProps {
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

function ImportExportDialog({ onClose, onExport, onImport }: ImportExportDialogProps) {
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
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* EXPORT SECTION */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
              <span className="text-xl">💾</span> Export Backup
            </h3>
            <p className="text-sm text-blue-600 mb-4">
              Download a copy of the entire board state (Notes, Categories, and Rows) to your computer as a JSON file.
            </p>
            <button
              onClick={onExport}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition shadow-sm"
            >
              Download Backup
            </button>
          </div>

          <div className="w-full h-px bg-slate-200"></div>

          {/* IMPORT SECTION */}
          {!confirmingImport ? (
            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl">
              <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
                <span className="text-xl">📂</span> Import Backup
              </h3>
              <p className="text-sm text-amber-700 mb-4">
                Restore the board from a previously saved JSON file. 
                <br/>
                <span className="font-bold">Warning:</span> This will completely overwrite the current board.
              </p>
              <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 font-medium rounded-lg transition shadow-sm"
              >
                Select Backup File...
              </button>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-center">
              <h3 className="font-bold text-red-800 mb-2 text-lg">⚠️ Are you sure?</h3>
              <p className="text-sm text-red-600 mb-6">
                You are about to overwrite the entire board with data from <span className="font-bold font-mono bg-red-100 px-1 rounded">{confirmingImport.name}</span>.
                <br/><br/>
                This action <span className="font-bold underline">cannot be undone</span>.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setConfirmingImport(null);
                    if(fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex-1 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => onImport(confirmingImport)}
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

interface CategoryDialogProps {
  categories: CategoriesData;
  boardData: BoardData;
  onClose: () => void;
  onApply: (catId: string, workerId: string, colIndex: number) => void;
}

function CategoryDialog({
  categories,
  boardData,
  onClose,
  onApply,
}: CategoryDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState("");

  const handleCreate = () => {
    if (!newCatName.trim()) return;
    const refCat = ref(db, "categories");
    push(refCat, {
      name: newCatName,
      items: ["Example Item"],
      color: "Green",
    });
    setNewCatName("");
  };

  const updateItems = (id: string, newItems: string[]) => {
    update(ref(db, `categories/${id}`), { items: newItems });
  };

  const updateColor = (id: string, color: string) => {
    update(ref(db, `categories/${id}`), { color });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <h2 className="text-2xl font-bold text-slate-800">Category Sets</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto flex">
          <div className="w-1/3 border-r p-6 overflow-y-auto">
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Category Name"
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
              />
              <button
                onClick={handleCreate}
                className="bg-indigo-600 text-white px-3 rounded-lg font-bold"
              >
                +
              </button>
            </div>

            <div className="space-y-2">
              {Object.entries(categories).map(([id, cat]) => (
                <div
                  key={id}
                  onClick={() => setSelectedId(id)}
                  className={`p-4 rounded-xl cursor-pointer transition border flex justify-between items-center group ${
                    selectedId === id
                      ? "bg-indigo-50 border-indigo-200"
                      : "hover:bg-slate-50 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        COLOR_MATRIX[cat.color || "Green"].shades[1].bg
                      }`}
                    />
                    <span className="font-bold text-slate-700">{cat.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(ref(db, `categories/${id}`));
                      if (selectedId === id) setSelectedId(null);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 p-8 bg-white overflow-y-auto">
            {selectedId ? (
              <div className="space-y-8">
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Category Color
                  </h3>
                  <div className="flex gap-2">
                    {Object.values(COLOR_MATRIX).map((family) => (
                      <button
                        key={family.name}
                        onClick={() => updateColor(selectedId, family.name)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                          family.shades[1].bg
                        } ${
                          categories[selectedId].color === family.name
                            ? "border-slate-800 scale-110"
                            : "border-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </section>

                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Edit Items
                  </h3>
                  <div className="space-y-2">
                    {(categories[selectedId].items || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={item}
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none font-medium text-slate-700"
                          onChange={(e) => {
                            const newItems = [...categories[selectedId].items];
                            newItems[idx] = e.target.value;
                            updateItems(selectedId, newItems);
                          }}
                        />
                        <button
                          onClick={() => {
                            const newItems = categories[
                              selectedId
                            ].items.filter((_, i) => i !== idx);
                            updateItems(selectedId, newItems);
                          }}
                          className="text-slate-300 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() =>
                        updateItems(selectedId, [
                          ...(categories[selectedId].items || []),
                          "New Item",
                        ])
                      }
                      className="w-full py-3 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 transition font-bold text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                </section>

                <section className="pt-8 border-t">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                    Push Category to Board
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(boardData).map(([wId, worker]) => (
                      <div
                        key={wId}
                        className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200"
                      >
                        <span className="font-bold text-slate-800">
                          {worker.name}
                        </span>
                        <div className="flex gap-2">
                          {["Assigned", "Active", "Done"].map((label, idx) => (
                            <button
                              key={label}
                              onClick={() => onApply(selectedId, wId, idx)}
                              className="px-4 py-1.5 bg-white border border-slate-300 rounded-lg text-[10px] font-black uppercase tracking-tighter hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition shadow-sm"
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 italic">
                Select a category from the left to start editing or pushing
                notes
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DropZoneProps {
  workerId: string;
  colIndex: number;
  notes: Record<string, Note>;
  dragOrigin: DragOrigin | null;
  onDragStart: (origin: DragOrigin) => void;
  onDragEnd: () => void;
  locks: LocksData;
  currentUser: User | null;
}

function DropZone({
  workerId,
  colIndex,
  notes,
  dragOrigin,
  onDragStart,
  onDragEnd,
  locks,
  currentUser,
}: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [autoEditId, setAutoEditId] = useState<string | null>(null);

  const isDraggingFromHere =
    dragOrigin?.workerId === workerId && dragOrigin?.colIndex === colIndex;

  const sortedNotes = Object.entries(notes)
    .filter(
      ([_, n]) =>
        n.column === colIndex &&
        typeof n.position === "number" &&
        !isNaN(n.position)
    )
    .sort((a, b) => a[1].position - b[1].position);

  const handleMove = (
    noteId: string,
    oldWorkerId: string,
    newPosition: number
  ) => {
    if (isNaN(newPosition)) {
      console.error("Attempted to set NaN position");
      return;
    }

    // Play sound if moving INTO Completed column (index 2)
    // and the note wasn't already in the Completed column
    if (colIndex === 2 && dragOrigin && dragOrigin.colIndex !== 2) {
      new Audio(BELL_SOUND_URL)
        .play()
        .catch((e) => console.log("Audio play failed", e));
    }

    onValue(
      ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`),
      (snap) => {
        const data = snap.val();
        if (data) {
          remove(ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`));
          set(ref(db, `boarddata/${workerId}/notes/${noteId}`), {
            ...data,
            column: colIndex,
            position: newPosition,
          });
        }
      },
      { onlyOnce: true }
    );
  };

  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDragEnd();
    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    try {
      const { noteId, oldWorkerId } = JSON.parse(rawData);
      remove(ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`));
      remove(ref(db, `locks/${noteId}`));
    } catch (err) {
      console.error(err);
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDragEnd();
    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    try {
      const { noteId, oldWorkerId } = JSON.parse(rawData);
      const lastPos =
        sortedNotes.length > 0
          ? sortedNotes[sortedNotes.length - 1][1].position
          : 0;
      handleMove(noteId, oldWorkerId, lastPos + 1000);
      remove(ref(db, `locks/${noteId}`));
    } catch (err) {
      console.error(err);
    }
  };

  const addNote = () => {
    const lastPos =
      sortedNotes.length > 0
        ? sortedNotes[sortedNotes.length - 1][1].position
        : 0;
    const newNoteRef = push(ref(db, `boarddata/${workerId}/notes`));
    setAutoEditId(newNoteRef.key);
    set(newNoteRef, {
      text: "New Task",
      column: colIndex,
      position: lastPos + 1000,
    });
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsOver(true);
      }}
      onDragEnter={() => setIsOver(true)}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleContainerDrop}
      className={`bg-slate-200/40 border-2 rounded-lg p-4 flex flex-col gap-4 transition-all relative group/zone min-h-[160px] h-full ${
        isOver
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
          : "border-dashed border-transparent"
      }`}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] auto-rows-min gap-4 flex-grow">
        {sortedNotes.map(([id, note], index) => (
          <StickyNote
            key={id}
            id={id}
            text={note.text}
            color={note.color}
            column={colIndex}
            workerId={workerId}
            position={note.position}
            prevPos={index > 0 ? sortedNotes[index - 1][1].position : null}
            nextPos={
              index < sortedNotes.length - 1
                ? sortedNotes[index + 1][1].position
                : null
            }
            onReorder={handleMove}
            onDragStart={() => onDragStart({ workerId, colIndex })}
            onDragEnd={onDragEnd}
            isNew={id === autoEditId}
            onEditStarted={() => setAutoEditId(null)}
            locks={locks}
            currentUser={currentUser}
          />
        ))}

        <div className="flex items-center justify-center min-h-[100px] aspect-square">
          <button
            onClick={addNote}
            className="opacity-0 group-hover/zone:opacity-100 text-slate-400 hover:text-slate-600 text-3xl transition-opacity p-4 border-2 border-dashed border-slate-300 rounded-lg w-full h-full flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {isDraggingFromHere && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.currentTarget.classList.add(
              "bg-red-100",
              "border-red-500",
              "scale-[1.02]"
            );
          }}
          onDragLeave={(e) =>
            e.currentTarget.classList.remove(
              "bg-red-100",
              "border-red-500",
              "scale-[1.02]"
            )
          }
          onDrop={handleTrashDrop}
          className="h-12 border-2 border-dashed border-red-300 rounded-lg flex items-center justify-center text-red-500 transition-all gap-2 bg-white/50 animate-in slide-in-from-bottom-2 duration-200"
        >
          <span className="text-lg">🗑️</span>
          <span className="text-xs font-bold uppercase tracking-wider">
            Drop to Delete
          </span>
        </div>
      )}
    </div>
  );
}

interface StickyNoteProps {
  id: string;
  text: string;
  workerId: string;
  color?: string;
  column: number;
  position: number;
  prevPos: number | null;
  nextPos: number | null;
  onReorder: (noteId: string, oldWorkerId: string, newPos: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  isNew?: boolean;
  onEditStarted?: () => void;
  locks: LocksData;
  currentUser: User | null;
}

function StickyNote({
  id,
  text,
  color,
  column,
  workerId,
  position,
  prevPos,
  nextPos,
  onReorder,
  onDragStart,
  onDragEnd,
  isNew,
  onEditStarted,
  locks,
  currentUser,
}: StickyNoteProps) {
  const [dropIndicator, setDropIndicator] = useState<"left" | "right" | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  // Check Lock Status
  const lock = locks[id];
  const now = Date.now();
  const isLockValid = lock && now - lock.timestamp < 2 * 60 * 1000; // 2 minutes
  const isLockedByOther = isLockValid && lock.userId !== currentUser?.uid;
  const lockedByName = isLockedByOther ? lock.userName : null;

  // Lock Management Actions
  const acquireLock = async () => {
    if (!currentUser) return false;
    const lockRef = ref(db, `locks/${id}`);

    // Optimistically assume we can lock
    await set(lockRef, {
      userId: currentUser.uid,
      userName: currentUser.displayName || "Unknown",
      timestamp: Date.now(),
    });

    onDisconnect(lockRef).remove();
    return true;
  };

  const releaseLock = () => {
    if (!currentUser) return;
    remove(ref(db, `locks/${id}`));
    onDisconnect(ref(db, `locks/${id}`)).cancel();
  };

  const renewLock = () => {
    if (!currentUser) return;
    update(ref(db, `locks/${id}`), { timestamp: Date.now() });
  };

  // Renew lock periodically while interacting
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if ((isEditing || isDragging) && !isLockedByOther) {
      interval = setInterval(renewLock, 60 * 1000); // Renew every 60s
    }
    return () => clearInterval(interval);
  }, [isEditing, isDragging, isLockedByOther]);

  // Clean up lock if component unmounts while editing
  useEffect(() => {
    return () => {
      if (isEditing || isDragging) releaseLock();
    };
  }, [isEditing, isDragging]);

  useEffect(() => {
    if (isNew && !isEditing && !isLockedByOther) {
      acquireLock().then(() => {
        setIsEditing(true);
        onEditStarted?.();
      });
    }
  }, [isNew, isEditing, onEditStarted, isLockedByOther]);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      const range = document.createRange();
      const selection = window.getSelection();
      range.selectNodeContents(textRef.current);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [isEditing]);

  const handleDragOver = (e: React.DragEvent) => {
    if (isEditing || isLockedByOther) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();
    const midPointX = rect.left + rect.width / 2;
    setDropIndicator(e.clientX < midPointX ? "left" : "right");
  };

  const handleNoteDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const side = dropIndicator;
    setDropIndicator(null);
    onDragEnd();

    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    try {
      const { noteId, oldWorkerId } = JSON.parse(rawData);
      if (noteId === id) return;

      let newPos: number;
      if (side === "left") {
        newPos = prevPos !== null ? (prevPos + position) / 2 : position / 2;
      } else {
        newPos = nextPos !== null ? (nextPos + position) / 2 : position + 1000;
      }
      onReorder(noteId, oldWorkerId, newPos);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    releaseLock();
    if (textRef.current) {
      set(
        ref(db, `boarddata/${workerId}/notes/${id}/text`),
        textRef.current.innerText
      );
    }
  };

  const colorFamily = COLOR_MATRIX[color || "Green"] || COLOR_MATRIX.Green;
  const shade = colorFamily.shades[column] || colorFamily.shades[0];

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={() => setDropIndicator(null)}
      onDrop={handleNoteDrop}
    >
      {dropIndicator && (
        <div
          className={`absolute top-0 bottom-0 w-1 bg-blue-500 rounded-full z-50 pointer-events-none ${
            dropIndicator === "left" ? "-left-2" : "-right-2"
          }`}
        />
      )}

      <div
        draggable={!isEditing && !isLockedByOther}
        onDoubleClick={async () => {
          if (isLockedByOther) return;
          await acquireLock();
          setIsEditing(true);
        }}
        onDragStart={(e) => {
          if (isEditing || isLockedByOther) {
            e.preventDefault();
            return;
          }

          // Fire and forget lock (do not await, must be sync)
          acquireLock();

          e.dataTransfer.setData(
            "text/plain",
            JSON.stringify({ noteId: id, oldWorkerId: workerId })
          );
          onDragStart();
          setTimeout(() => setIsDragging(true), 0);
        }}
        onDragEnd={() => {
          setIsDragging(false);
          onDragEnd();
          releaseLock();
        }}
        className={`${shade.bg} ${
          shade.border
        } p-4 rotate-[-0.5deg] border-l-4 min-h-[160px] aspect-square flex flex-col transition-all group/note relative
          ${isDragging ? "opacity-30 grayscale-[0.5]" : "opacity-100"}
          ${
            isEditing
              ? "ring-4 ring-cyan-400 shadow-2xl scale-[1.02] rotate-0 z-20 cursor-text"
              : isLockedByOther
              ? "cursor-not-allowed opacity-80"
              : "shadow-sm hover:shadow-md cursor-grab"
          }
        `}
      >
        {isLockedByOther && (
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] z-40 flex flex-col items-center justify-center rounded-sm">
            <span className="text-2xl mb-1">🔒</span>
            <span className="text-white text-xs font-bold px-2 py-1 bg-black/50 rounded-full">
              {lockedByName}
            </span>
          </div>
        )}

        <div
          ref={textRef}
          contentEditable={isEditing}
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              textRef.current?.blur();
            }
          }}
          className={`outline-none ${shade.text} text-sm font-medium leading-snug flex-grow whitespace-pre-wrap overflow-y-auto pb-6`}
        >
          {text}
        </div>

        {!isLockedByOther && (
          <div className="absolute m-[8px] bottom-2 left-0 right-0 flex items-center justify-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm py-1.5 rounded-full shadow-sm z-30 border border-white/50">
            {Object.values(COLOR_MATRIX).map((family) => (
              <button
                key={family.name}
                onClick={async (e) => {
                  e.stopPropagation();
                  await acquireLock();
                  await set(
                    ref(db, `boarddata/${workerId}/notes/${id}/color`),
                    family.name
                  );
                  releaseLock();
                }}
                className={`w-3 h-3 rounded-full ${family.shades[1].bg} border border-black/10 hover:scale-125 transition-transform shadow-sm`}
              />
            ))}
            <div className="w-px h-3 bg-black/10 mx-1" />
            <button
              onClick={async (e) => {
                e.stopPropagation();
                if (isLockedByOther) return;
                remove(ref(db, `boarddata/${workerId}/notes/${id}`));
              }}
              className="text-[10px] text-slate-500 hover:text-red-600 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const COLOR_MATRIX: Record<string, any> = {
  Green: {
    name: "Green",
    shades: {
      0: {
        bg: "bg-emerald-100",
        border: "border-emerald-400",
        text: "text-emerald-900",
      },
      1: {
        bg: "bg-emerald-300",
        border: "border-emerald-600",
        text: "text-emerald-950",
      },
      2: {
        bg: "bg-emerald-50/50",
        border: "border-emerald-200",
        text: "text-slate-400",
      },
    },
  },
  Blue: {
    name: "Blue",
    shades: {
      0: {
        bg: "bg-blue-100",
        border: "border-blue-400",
        text: "text-blue-900",
      },
      1: {
        bg: "bg-blue-300",
        border: "border-blue-600",
        text: "text-blue-950",
      },
      2: {
        bg: "bg-blue-50/50",
        border: "border-blue-200",
        text: "text-slate-400",
      },
    },
  },
  Yellow: {
    name: "Yellow",
    shades: {
      0: {
        bg: "bg-yellow-100",
        border: "border-yellow-400",
        text: "text-yellow-900",
      },
      1: {
        bg: "bg-yellow-300",
        border: "border-yellow-600",
        text: "text-yellow-950",
      },
      2: {
        bg: "bg-yellow-50/50",
        border: "border-yellow-200",
        text: "text-slate-400",
      },
    },
  },
  Red: {
    name: "Red",
    shades: {
      0: { bg: "bg-red-100", border: "border-red-400", text: "text-red-900" },
      1: { bg: "bg-red-300", border: "border-red-600", text: "text-red-950" },
      2: {
        bg: "bg-red-50/50",
        border: "border-red-200",
        text: "text-slate-400",
      },
    },
  },
  Orange: {
    name: "Orange",
    shades: {
      0: {
        bg: "bg-orange-100",
        border: "border-orange-400",
        text: "text-orange-900",
      },
      1: {
        bg: "bg-orange-300",
        border: "border-orange-600",
        text: "text-orange-950",
      },
      2: {
        bg: "bg-orange-50/50",
        border: "border-orange-200",
        text: "text-slate-400",
      },
    },
  },
  Purple: {
    name: "Purple",
    shades: {
      0: {
        bg: "bg-purple-100",
        border: "border-purple-400",
        text: "text-purple-900",
      },
      1: {
        bg: "bg-purple-300",
        border: "border-purple-600",
        text: "text-purple-950",
      },
      2: {
        bg: "bg-purple-50/50",
        border: "border-purple-200",
        text: "text-slate-400",
      },
    },
  },
  Pink: {
    name: "Pink",
    shades: {
      0: {
        bg: "bg-pink-100",
        border: "border-pink-400",
        text: "text-pink-900",
      },
      1: {
        bg: "bg-pink-300",
        border: "border-pink-600",
        text: "text-pink-950",
      },
      2: {
        bg: "bg-pink-50/50",
        border: "border-pink-200",
        text: "text-slate-400",
      },
    },
  },
};