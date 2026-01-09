import { useEffect } from "react";
import { ref, onDisconnect, set, serverTimestamp } from "firebase/database";
import { db } from "../firebase";
import type { User } from "firebase/auth";

export function usePresence(user: User | null) {
  useEffect(() => {
    if (!user) return;

    const userStatusRef = ref(db, `/presence/${user.uid}`);

    onDisconnect(userStatusRef).remove();

    set(userStatusRef, {
      userId: user.uid,
      userName: user.displayName || "Anonymous",
      photoURL: user.photoURL || "",
      online: true,
      lastActive: serverTimestamp(),
    });

  }, [user]);
}