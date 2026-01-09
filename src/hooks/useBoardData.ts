import { useState, useEffect } from "react";
import { ref, onValue, DataSnapshot } from "firebase/database";
import { db } from "../firebase";
import type { User } from "firebase/auth";
import type {
  BoardData,
  CategoriesData,
  LocksData,
  AllPresenceData,
} from "../types";

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

    const locksRef = ref(db, "locks");
    const unsubscribeLocks = onValue(locksRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val() as LocksData | null;
      setLocks(data || {});
    });

    const presenceRef = ref(db, "presence");
    const unsubscribePresence = onValue(
      presenceRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val() as AllPresenceData | null;
        setPresence(data || {});
      }
    );

    return () => {
      unsubscribeDb();
      unsubscribeCats();
      unsubscribeLocks();
      unsubscribePresence();
    };
  }, [user]);

  return { boardData, categories, locks, presence };
}