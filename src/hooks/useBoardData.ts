import { useState, useEffect } from "react";
import { DatabaseService } from "../DatabaseService";
import type { User } from "firebase/auth";
import type { BoardData, CategoriesData, LocksData, AllPresenceData } from "../types";

export function useBoardData(user: User | null) {
  const [boardData, setBoardData] = useState<BoardData>({});
  const [categories, setCategories] = useState<CategoriesData>({});
  const [locks, setLocks] = useState<LocksData>({});
  const [presence, setPresence] = useState<AllPresenceData>({});

  useEffect(() => {
    if (!user) {
      setBoardData({});
      setCategories({});
      setLocks({});
      setPresence({});
      return;
    }

    const unsubBoard = DatabaseService.subscribeToBoardData(setBoardData);
    const unsubCats = DatabaseService.subscribeToCategories(setCategories);
    const unsubLocks = DatabaseService.subscribeToLocks(setLocks);
    const unsubPresence = DatabaseService.subscribeToPresence(setPresence);

    return () => {
      unsubBoard();
      unsubCats();
      unsubLocks();
      unsubPresence();
    };
  }, [user]);

  return { boardData, categories, locks, presence };
}