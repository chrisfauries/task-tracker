import { useRef, useEffect } from "react";
import { DatabaseService } from "../DatabaseService";
import type { User } from "firebase/auth";
import type { BoardData, CategoriesData } from "../types";

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
    await DatabaseService.saveSnapshot(user, reason, boardDataRef.current, categoriesRef.current);
  };

  const trackActivity = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      if (user) {
        const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const dateStr = new Date().toLocaleDateString();
        saveSnapshot(`${user.displayName} made changes @ ${timeStr} on ${dateStr}`);
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
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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