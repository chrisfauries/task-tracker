import { useRef, useEffect } from "react";
import {
  ref,
  push,
  get,
  remove,
  query,
  orderByChild,
} from "firebase/database";
import { db } from "../firebase";
import type { User } from "firebase/auth";
import type {
  BoardData,
  CategoriesData,
  SavedSnapshot,
  SnapshotsData,
} from "../types";

export function useSnapshots(
  user: User | null,
  boardData: BoardData,
  categories: CategoriesData
) {
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoggedLoginSnapshot = useRef(false);
  const boardDataRef = useRef<BoardData>(boardData);
  const categoriesRef = useRef<CategoriesData>(categories);

  useEffect(() => {
    boardDataRef.current = boardData;
  }, [boardData]);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  useEffect(() => {
    if (!user) {
      hasLoggedLoginSnapshot.current = false;
    }
  }, [user]);

  const saveSnapshot = async (reason: string) => {
    if (!user) return;
    const snapRef = ref(db, "snapshots");

    try {
      const snapshot = await get(query(snapRef, orderByChild("timestamp")));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const entries = Object.entries(data as SnapshotsData).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        );
        if (entries.length >= 100) {
          const toRemove = entries.slice(0, entries.length - 99);
          for (const [key] of toRemove) {
            await remove(ref(db, `snapshots/${key}`));
          }
        }
      }
    } catch (e) {
      console.error("Error pruning snapshots", e);
    }

    const newSnap: SavedSnapshot = {
      title: reason,
      timestamp: Date.now(),
      boardData: boardDataRef.current,
      categories: categoriesRef.current,
      createdBy: user.displayName || "Unknown",
      creatorId: user.uid,
    };
    push(snapRef, newSnap);
  };

  const trackActivity = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      if (user) {
        const timeStr = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const dateStr = new Date().toLocaleDateString();
        saveSnapshot(
          `${user.displayName} made changes @ ${timeStr} on ${dateStr}`
        );
      }
    }, 60000 * 5); // 5 minutes
  };

  useEffect(() => {
    if (
      user &&
      Object.keys(boardData).length > 0 &&
      Object.keys(categories).length > 0 &&
      !hasLoggedLoginSnapshot.current
    ) {
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = new Date().toLocaleDateString();
      saveSnapshot(`${user.displayName} logged in @ ${timeStr} on ${dateStr}`);
      hasLoggedLoginSnapshot.current = true;
    }
  }, [user, boardData, categories]);

  useEffect(() => {
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, []);

  return { saveSnapshot, trackActivity };
}