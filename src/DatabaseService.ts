import {
  ref,
  set,
  get,
  remove,
  update,
  onValue,
  push,
  query,
  orderByChild,
  limitToLast,
  onDisconnect,
  serverTimestamp,

} from "firebase/database";
import type { Unsubscribe } from "firebase/auth";
import { db } from "./firebase";
import type { User } from "firebase/auth";
import type {
  BoardData,
  CategoriesData,
  LocksData,
  AllPresenceData,
  Note,
  SavedSnapshot,
  SnapshotsData,
  WorkerData,
  Category
} from "./types";

export class DatabaseService {
  // ==========================================
  // Data Subscriptions
  // ==========================================

  static subscribeToBoardData(callback: (data: BoardData) => void): Unsubscribe {
    return onValue(ref(db, "boarddata"), (snap) => callback(snap.val() || {}));
  }

  static subscribeToCategories(callback: (data: CategoriesData) => void): Unsubscribe {
    return onValue(ref(db, "categories"), (snap) => callback(snap.val() || {}));
  }

  static subscribeToLocks(callback: (data: LocksData) => void): Unsubscribe {
    return onValue(ref(db, "locks"), (snap) => callback(snap.val() || {}));
  }

  static subscribeToPresence(callback: (data: AllPresenceData) => void): Unsubscribe {
    return onValue(ref(db, "presence"), (snap) => callback(snap.val() || {}));
  }

  static subscribeToSnapshots(callback: (data: SnapshotsData) => void): Unsubscribe {
    const q = query(ref(db, "snapshots"), orderByChild("timestamp"), limitToLast(50));
    return onValue(q, (snap) => callback(snap.val() || {}));
  }

  // ==========================================
  // Custom Palette Operations
  // ==========================================

  static async saveCustomPalette(colors: string[]): Promise<void> {
    await set(ref(db, "customPalette"), colors);
  }

  static subscribeToCustomPalette(callback: (colors: string[]) => void): Unsubscribe {
    return onValue(ref(db, "customPalette"), (snap) => callback(snap.val() || []));
  }

  // ==========================================
  // Note Operations
  // ==========================================

  static async getNote(workerId: string, noteId: string): Promise<Note | null> {
    const snap = await get(ref(db, `boarddata/${workerId}/notes/${noteId}`));
    return snap.exists() ? snap.val() : null;
  }

  static async createNote(workerId: string, noteData: Note): Promise<string | null> {
    const newRef = push(ref(db, `boarddata/${workerId}/notes`));
    await set(newRef, noteData);
    return newRef.key;
  }

  static async addNote(workerId: string, noteId: string, noteData: Note): Promise<void> {
    await set(ref(db, `boarddata/${workerId}/notes/${noteId}`), noteData);
  }

  static async deleteNote(workerId: string, noteId: string): Promise<void> {
    await remove(ref(db, `boarddata/${workerId}/notes/${noteId}`));
  }

  static async updateNoteText(workerId: string, noteId: string, text: string): Promise<void> {
    await set(ref(db, `boarddata/${workerId}/notes/${noteId}/text`), text);
  }

  static async updateNoteColor(workerId: string, noteId: string, color: number): Promise<void> {
    await set(ref(db, `boarddata/${workerId}/notes/${noteId}/color`), color);
  }

  static async updateNoteCategory(workerId: string, noteId: string, categoryName: string, color: number): Promise<void> {
    await update(ref(db, `boarddata/${workerId}/notes/${noteId}`), { categoryName, color });
  }

  static async moveNote(
    noteId: string,
    prevWorkerId: string,
    newWorkerId: string,
    noteData: Note
  ): Promise<void> {
    await set(ref(db, `boarddata/${newWorkerId}/notes/${noteId}`), noteData);
    if (prevWorkerId !== newWorkerId) {
      await remove(ref(db, `boarddata/${prevWorkerId}/notes/${noteId}`));
    }
  }

  // ==========================================
  // Lock Operations
  // ==========================================

  static async acquireLock(noteId: string, user: User): Promise<void> {
    const lockRef = ref(db, `locks/${noteId}`);
    await set(lockRef, {
      userId: user.uid,
      userName: user.displayName || "Unknown",
      timestamp: Date.now(),
    });
    onDisconnect(lockRef).remove();
  }

  static async releaseLock(noteId: string): Promise<void> {
    const lockRef = ref(db, `locks/${noteId}`);
    await remove(lockRef);
    onDisconnect(lockRef).cancel();
  }

  static async renewLock(noteId: string): Promise<void> {
    await update(ref(db, `locks/${noteId}`), { timestamp: Date.now() });
  }

  // ==========================================
  // Worker Operations
  // ==========================================

  static async createWorker(name: string, defaultColor: number): Promise<void> {
    await push(ref(db, "boarddata"), { name, notes: {}, defaultColor });
  }

  static async updateWorker(workerId: string, data: Partial<WorkerData>): Promise<void> {
    await update(ref(db, `boarddata/${workerId}`), data);
  }

  static async deleteWorker(workerId: string): Promise<void> {
    await remove(ref(db, `boarddata/${workerId}`));
  }

  // ==========================================
  // Category Operations
  // ==========================================

  static async createCategory(name: string, color: number = 0, order: number = 0): Promise<string | null> {
    const newRef = push(ref(db, "categories"));
    await set(newRef, { name, items: [], color, order });
    return newRef.key;
  }

  static async updateCategory(id: string, data: Partial<Category>): Promise<void> {
    await update(ref(db, `categories/${id}`), data);
  }

  static async deleteCategory(id: string): Promise<void> {
    await remove(ref(db, `categories/${id}`));
  }

  // ==========================================
  // Presence Operations
  // ==========================================

  static initializePresence(user: User): void {
    const userStatusRef = ref(db, `/presence/${user.uid}`);
    onDisconnect(userStatusRef).remove();
    set(userStatusRef, {
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      photoURL: user.photoURL || "",
      online: true,
      lastActive: serverTimestamp(),
    });
  }

  // ==========================================
  // Snapshot & Restore Operations
  // ==========================================

  static async saveSnapshot(
    user: User,
    reason: string,
    boardData: BoardData,
    categories: CategoriesData
  ): Promise<void> {
    const snapRef = ref(db, "snapshots");

    // Prune old snapshots
    try {
      const snapshot = await get(query(snapRef, orderByChild("timestamp")));
      if (snapshot.exists()) {
        const data = snapshot.val() as SnapshotsData;
        const entries = Object.entries(data).sort((a, b) => a[1].timestamp - b[1].timestamp);
        if (entries.length >= 100) {
          const updates: Record<string, null> = {};
          entries.slice(0, entries.length - 99).forEach(([key]) => (updates[key] = null));
          await update(snapRef, updates);
        }
      }
    } catch (e) {
      console.error("Error pruning snapshots", e);
    }

    const newSnap: SavedSnapshot = {
      title: reason,
      timestamp: Date.now(),
      boardData,
      categories,
      createdBy: user.displayName || "Unknown",
      creatorId: user.uid,
    };
    await push(snapRef, newSnap);
  }

  static async deleteSnapshot(snapshotId: string): Promise<void> {
    await remove(ref(db, `snapshots/${snapshotId}`));
  }

  static async restoreBackup(boardData: BoardData, categories: CategoriesData): Promise<void> {
    await set(ref(db, "boarddata"), boardData || {});
    await set(ref(db, "categories"), categories || {});
  }
}