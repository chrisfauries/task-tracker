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
    // Goal #1: Entire app takes all vertical space
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden">
      {/* Header Area */}
      <div className="p-4 border-b bg-white z-30">
        <h1 className="text-xl font-bold text-slate-700">Because Band Board</h1>
      </div>

      {/* Main Board Area (Scrollable) */}
      <div className="flex-1 overflow-auto p-8">
        <div className="min-w-max">
          {/* Header Row: Sticky Worker Spacer + Column Labels */}
          <div className="grid grid-cols-[min-content_minmax(400px,1fr)_minmax(400px,1fr)_minmax(200px,10%)] gap-4 mb-6">
            <div className="w-12 sticky left-0 bg-slate-50 z-20"></div>{" "}
            {/* Spacer for sticky column */}
            {["Assigned", "In Progress", "Completed"].map((h) => (
              <div
                key={h}
                className="text-center font-bold text-slate-400 uppercase text-xs tracking-widest"
              >
                {h}
              </div>
            ))}
          </div>

          {/* Worker Rows */}
          {Object.entries(boardData).map(([workerId, worker]) => (
            <div
              key={workerId}
              // Goal #3: Grid ratios ensuring Assigned/In-Progress dominate horizontal space
              className="grid grid-cols-[min-content_minmax(400px,1fr)_minmax(400px,1fr)_minmax(200px,10%)] gap-4 mb-4 min-h-[180px]"
            >
              {/* Goal #2: Sticky Worker Name Column */}
              <div className="sticky left-0 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-md z-20 p-2 min-w-[48px] h-full">
                <span
                  className="font-bold text-slate-700 whitespace-nowrap"
                  style={{
                    writingMode: "vertical-lr",
                    transform: "rotate(180deg)",
                  }}
                >
                  {worker.name}
                </span>
              </div>

              {[0, 1, 2].map((colIndex) => (
                <DropZone
                  key={colIndex}
                  workerId={workerId}
                  colIndex={colIndex}
                  notes={worker.notes || {}}
                  dragOrigin={dragOrigin}
                  onDragStart={(origin) => setDragOrigin(origin)}
                  onDragEnd={() => setDragOrigin(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
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
      className={`bg-slate-200/40 border-2 rounded-lg p-4 flex flex-col gap-3 transition-all relative group/zone min-h-[150px] ${
        isOver
          ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
          : "border-dashed border-transparent"
      }`}
    >
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

      <div className="flex flex-col items-center justify-center">
        {isDraggingFromHere ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.classList.add("bg-red-100", "border-red-500");
            }}
            onDragLeave={(e) =>
              e.currentTarget.classList.remove("bg-red-100", "border-red-500")
            }
            onDrop={handleTrashDrop}
            className="w-full border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center p-4 text-red-500 transition-all"
          >
            <span className="text-xl">🗑️</span>
          </div>
        ) : (
          <button
            onClick={addNote}
            className="opacity-0 group-hover/zone:opacity-100 text-slate-400 hover:text-slate-600 self-center text-2xl mt-auto transition-opacity"
          >
            +
          </button>
        )}
      </div>
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
  const [dropIndicator, setDropIndicator] = useState<"top" | "bottom" | null>(
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

  const handleNoteDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropIndicator(null);
    onDragEnd();
    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;
    try {
      const { noteId, oldWorkerId } = JSON.parse(rawData);
      if (noteId === id) return;
      let newPos: number;
      if (dropIndicator === "top") {
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
      onDragOver={(e) => {
        if (isEditing) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        const midPoint = rect.top + rect.height / 2;
        setDropIndicator(e.clientY < midPoint ? "top" : "bottom");
      }}
      onDragLeave={() => setDropIndicator(null)}
      onDrop={handleNoteDrop}
    >
      {dropIndicator && (
        <div
          className={`absolute left-0 right-0 h-1 bg-blue-500 rounded-full z-50 pointer-events-none ${
            dropIndicator === "top" ? "-top-[8px]" : "-bottom-[8px]"
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
        } p-4 rotate-[-0.5deg] hover:rotate-0 transition-all relative group/note border-l-4 min-h-[100px] flex flex-col
          ${isDragging ? "opacity-30 grayscale-[0.5]" : "opacity-100"}
          ${
            isEditing
              ? "ring-4 ring-cyan-400 shadow-2xl scale-[1.02] rotate-0 z-20 cursor-text"
              : "shadow-sm hover:shadow-md cursor-grab"
          }
        `}
      >
        <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity bg-white/50 backdrop-blur-sm rounded-full px-2 py-1 shadow-sm z-30">
          {Object.values(COLOR_MATRIX).map((family) => (
            <button
              key={family.name}
              onClick={() =>
                set(
                  ref(db, `boarddata/${workerId}/notes/${id}/color`),
                  family.name
                )
              }
              className={`w-3 h-3 rounded-full ${family.shades[1].bg} border border-black/10 hover:scale-125 transition-transform`}
            />
          ))}
          <button
            onClick={() => remove(ref(db, `boarddata/${workerId}/notes/${id}`))}
            className="text-[10px] text-slate-500 hover:text-red-600 font-bold ml-1"
          >
            ✕
          </button>
        </div>
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
          className={`outline-none ${shade.text} text-sm font-medium leading-snug flex-grow whitespace-pre-wrap`}
        >
          {text}
        </div>
      </div>
    </div>
  );
}

// --- COLOR CONFIG ---
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
