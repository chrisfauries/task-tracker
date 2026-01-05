import React, { useState, useEffect, DragEvent } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, push, remove, DataSnapshot } from 'firebase/database';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';

// --- TYPES ---
interface Note {
  text: string;
  column: number;
}

interface WorkerData {
  name: string;
  notes?: Record<string, Note>;
}

type BoardData = Record<string, WorkerData>;

interface DragData {
  noteId: string;
  oldWorkerId: string;
}

// --- CONFIG ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [boardData, setBoardData] = useState<BoardData>({});

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => setUser(u));
    
    const boardRef = ref(db, 'boarddata');
    const unsubscribeDb = onValue(boardRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as BoardData | null;
      setBoardData(data || {});
    });

    return () => { unsubscribeAuth(); unsubscribeDb(); };
  }, []);

  const addWorker = (): void => {
    const name = prompt("Worker Name:");
    if (name) push(ref(db, 'boarddata'), { name, notes: {} });
  };

  if (!user) return (
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
    <div className="min-h-screen bg-slate-50 p-8">
      <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">The way we do anything...</h1>
          <p className="text-slate-500 text-sm">Welcome, {user.displayName}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={addWorker} className="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600 font-medium transition shadow-sm">
            + Add Worker
          </button>
          <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-red-500 text-sm underline transition">Logout</button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {['Worker', 'Assigned', 'In Progress', 'Completed'].map(h => (
            <div key={h} className="text-center font-bold text-slate-500 uppercase text-xs tracking-widest">{h}</div>
          ))}
        </div>

        {Object.entries(boardData).map(([workerId, worker]) => (
          <div key={workerId} className="grid grid-cols-4 gap-4 mb-4 min-h-[180px]">
            <div className="bg-white border border-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 shadow-sm relative group">
              {worker.name}
              <button 
              // eslint-disable-next-line
                onClick={() => { if(confirm("Delete worker?")) remove(ref(db, `boarddata/${workerId}`)); }}
                className="absolute top-2 right-2 hidden group-hover:block text-slate-300 hover:text-red-500"
              >✕</button>
            </div>

            {[0, 1, 2].map(colIndex => (
              <DropZone key={colIndex} workerId={workerId} colIndex={colIndex} notes={worker.notes || {}} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

interface DropZoneProps {
  workerId: string;
  colIndex: number;
  notes: Record<string, Note>;
}

function DropZone({ workerId, colIndex, notes }: DropZoneProps) {
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const dragData: DragData = JSON.parse(e.dataTransfer.getData("application/json"));
    const { noteId, oldWorkerId } = dragData;
    
    onValue(ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`), (snap) => {
      const data = snap.val() as Note | null;
      if (data) {
        remove(ref(db, `boarddata/${oldWorkerId}/notes/${noteId}`));
        set(ref(db, `boarddata/${workerId}/notes/${noteId}`), { ...data, column: colIndex });
      }
    }, { onlyOnce: true });
  };

  const addNote = () => {
    push(ref(db, `boarddata/${workerId}/notes`), { text: "New Task", column: colIndex });
  };

  return (
    <div 
      onDragOver={(e) => e.preventDefault()} 
      onDrop={handleDrop}
      className="bg-slate-200/40 border-2 border-dashed border-transparent hover:border-slate-300 rounded-lg p-4 flex flex-col gap-3 transition-all relative group"
    >
      {Object.entries(notes)
        .filter(([_, n]) => n.column === colIndex)
        .map(([id, note]) => (
          <StickyNote key={id} id={id} text={note.text} workerId={workerId} />
        ))}
      <button 
        onClick={addNote} 
        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 self-center text-2xl transition-opacity mt-auto"
      >+</button>
    </div>
  );
}

interface StickyNoteProps {
  id: string;
  text: string;
  workerId: string;
}

function StickyNote({ id, text, workerId }: StickyNoteProps) {
  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    const dragData: DragData = { noteId: id, oldWorkerId: workerId };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
  };

  const updateText = (newText: string) => {
    set(ref(db, `boarddata/${workerId}/notes/${id}/text`), newText);
  };

  return (
    <div 
      draggable 
      onDragStart={onDragStart}
      className="bg-yellow-100 p-4 shadow-sm rotate-[-0.5deg] hover:rotate-0 hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative group border-l-4 border-yellow-400"
    >
      <button 
        onClick={() => remove(ref(db, `boarddata/${workerId}/notes/${id}`))} 
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-[10px] text-yellow-600 p-1"
      >✕</button>
      <div 
        contentEditable 
        suppressContentEditableWarning 
        onBlur={(e) => updateText(e.currentTarget.innerText)}
        className="outline-none text-yellow-900 text-sm font-medium leading-snug min-h-[1.5em]"
      >
        {text}
      </div>
    </div>
  );
}