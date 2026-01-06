import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove,
  DataSnapshot,
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

type BoardData = Record<string, WorkerData>;

interface DragOrigin {
  workerId: string;
  colIndex: number;
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [boardData, setBoardData] = useState<BoardData>({});
  const [dragOrigin, setDragOrigin] = useState<DragOrigin | null>(null);

  // Modal States
  const [isWorkerDialogOpen, setIsWorkerDialogOpen] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState("");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workerToDelete, setWorkerToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => setUser(u));
    const boardRef = ref(db, "boarddata");
    const unsubscribeDb = onValue(boardRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as BoardData | null;
      setBoardData(data || {});
    });

    const handleGlobalDragEnd = () => setDragOrigin(null);
    window.addEventListener("dragend", handleGlobalDragEnd);

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
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
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header Area */}
      <div className="p-4 border-b bg-white z-50 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-700">Because Band Board</h1>

        <div className="flex gap-3">
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

      {/* Main Board Area */}
      {/* We use py-8 but NO px-8 to ensure sticky left-0 hits the screen edge */}
      <div className="flex-1 overflow-auto py-8">
        <div className="min-w-[100%] flex flex-col">
          
          {/* Header Row */}
          <div className="flex mb-6 items-center">
            {/* Sticky mask for header to align with rows */}
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

          {/* Worker Rows */}
          {Object.entries(boardData).map(([workerId, worker]) => (
            <div
              key={workerId}
              className="flex mb-8 min-h-[250px]"
            >
              {/* STICKY WORKER NAME COLUMN (THE MASK) */}
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

              {/* COLUMNS (Drop Zones) - Set to 40% each */}
              {[0, 1, 2].map((colIndex) => (
                <div key={colIndex} className="w-[40%] flex-none px-4">
                  <DropZone
                    workerId={workerId}
                    colIndex={colIndex}
                    notes={worker.notes || {}}
                    dragOrigin={dragOrigin}
                    onDragStart={(origin) => setDragOrigin(origin)}
                    onDragEnd={() => setDragOrigin(null)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Add Worker Dialog */}
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

      {/* Delete Confirmation Dialog */}
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
              ? This will permanently remove the worker and{" "}
              <span className="text-red-600 font-semibold">
                all associated notes
              </span>
              .
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

// --- SUB-COMPONENTS ---

interface DropZoneProps {
  workerId: string;
  colIndex: number;
  notes: Record<string, Note>;
  dragOrigin: DragOrigin | null;
  onDragStart: (origin: DragOrigin) => void;
  onDragEnd: () => void;
}

function DropZone({
  workerId,
  colIndex,
  notes,
  dragOrigin,
  onDragStart,
  onDragEnd,
}: DropZoneProps) {
  const [isOver, setIsOver] = useState(false);
  const [autoEditId, setAutoEditId] = useState<string | null>(null);

  const isDraggingFromHere =
    dragOrigin?.workerId === workerId && dragOrigin?.colIndex === colIndex;

  const sortedNotes = Object.entries(notes)
    .filter(([_, n]) => n.column === colIndex)
    .sort((a, b) => (a[1].position || 0) - (b[1].position || 0));

  const handleMove = (
    noteId: string,
    oldWorkerId: string,
    newPosition: number
  ) => {
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
      className={`bg-slate-200/40 border-2 rounded-lg p-4 flex flex-col gap-4 transition-all relative group/zone min-h-[180px] h-full ${
        isOver
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
          : "border-dashed border-transparent"
      }`}
    >
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] auto-rows-min gap-4 flex-grow">
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
            e.currentTarget.classList.add("bg-red-100", "border-red-500", "scale-[1.02]");
          }}
          onDragLeave={(e) =>
            e.currentTarget.classList.remove("bg-red-100", "border-red-500", "scale-[1.02]")
          }
          onDrop={handleTrashDrop}
          className="h-12 border-2 border-dashed border-red-300 rounded-lg flex items-center justify-center text-red-500 transition-all gap-2 bg-white/50 animate-in slide-in-from-bottom-2 duration-200"
        >
          <span className="text-lg">🗑️</span>
          <span className="text-xs font-bold uppercase tracking-wider">Drop to Delete</span>
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
}: StickyNoteProps) {
  const [dropIndicator, setDropIndicator] = useState<"left" | "right" | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isNew && !isEditing) {
      setIsEditing(true);
      onEditStarted?.();
    }
  }, [isNew, isEditing, onEditStarted]);

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
    if (isEditing) return;
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
        draggable={!isEditing}
        onDoubleClick={() => setIsEditing(true)}
        onDragStart={(e) => {
          if (isEditing) return;
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
        }}
        className={`${shade.bg} ${
          shade.border
        } p-4 rotate-[-0.5deg] border-l-4 min-h-[180px] aspect-square flex flex-col transition-all group/note
          ${isDragging ? "opacity-30 grayscale-[0.5]" : "opacity-100"}
          ${
            isEditing
              ? "ring-4 ring-cyan-400 shadow-2xl scale-[1.02] rotate-0 z-20 cursor-text"
              : "shadow-sm hover:shadow-md cursor-grab"
          }
        `}
      >
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

        <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity bg-white/60 backdrop-blur-sm mx-4 py-1.5 rounded-full shadow-sm z-30 border border-white/50">
          {Object.values(COLOR_MATRIX).map((family) => (
            <button
              key={family.name}
              onClick={(e) => {
                e.stopPropagation();
                set(ref(db, `boarddata/${workerId}/notes/${id}/color`), family.name);
              }}
              className={`w-3.5 h-3.5 rounded-full ${family.shades[1].bg} border border-black/10 hover:scale-125 transition-transform shadow-sm`}
            />
          ))}
          <div className="w-px h-3 bg-black/10 mx-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              remove(ref(db, `boarddata/${workerId}/notes/${id}`));
            }}
            className="text-[10px] text-slate-500 hover:text-red-600 font-bold px-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// --- COLOR CONFIG ---
const COLOR_MATRIX: Record<string, any> = {
  Green: { name: "Green", shades: { 0: { bg: "bg-emerald-100", border: "border-emerald-400", text: "text-emerald-900" }, 1: { bg: "bg-emerald-300", border: "border-emerald-600", text: "text-emerald-950" }, 2: { bg: "bg-emerald-50/50", border: "border-emerald-200", text: "text-slate-400" } } },
  Blue: { name: "Blue", shades: { 0: { bg: "bg-blue-100", border: "border-blue-400", text: "text-blue-900" }, 1: { bg: "bg-blue-300", border: "border-blue-600", text: "text-blue-950" }, 2: { bg: "bg-blue-50/50", border: "border-blue-200", text: "text-slate-400" } } },
  Yellow: { name: "Yellow", shades: { 0: { bg: "bg-yellow-100", border: "border-yellow-400", text: "text-yellow-900" }, 1: { bg: "bg-yellow-300", border: "border-yellow-600", text: "text-yellow-950" }, 2: { bg: "bg-yellow-50/50", border: "border-yellow-200", text: "text-slate-400" } } },
  Red: { name: "Red", shades: { 0: { bg: "bg-red-100", border: "border-red-400", text: "text-red-900" }, 1: { bg: "bg-red-300", border: "border-red-600", text: "text-red-950" }, 2: { bg: "bg-red-50/50", border: "border-red-200", text: "text-slate-400" } } },
  Orange: { name: "Orange", shades: { 0: { bg: "bg-orange-100", border: "border-orange-400", text: "text-orange-900" }, 1: { bg: "bg-orange-300", border: "border-orange-600", text: "text-orange-950" }, 2: { bg: "bg-orange-50/50", border: "border-orange-200", text: "text-slate-400" } } },
  Purple: { name: "Purple", shades: { 0: { bg: "bg-purple-100", border: "border-purple-400", text: "text-purple-900" }, 1: { bg: "bg-purple-300", border: "border-purple-600", text: "text-purple-950" }, 2: { bg: "bg-purple-50/50", border: "border-purple-200", text: "text-slate-400" } } },
  Pink: { name: "Pink", shades: { 0: { bg: "bg-pink-100", border: "border-pink-400", text: "text-pink-900" }, 1: { bg: "bg-pink-300", border: "border-pink-600", text: "text-pink-950" }, 2: { bg: "bg-pink-50/50", border: "border-pink-200", text: "text-slate-400" } } },
};