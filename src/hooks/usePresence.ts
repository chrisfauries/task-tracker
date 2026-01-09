import { useEffect } from "react";
import { DatabaseService } from "../DatabaseService";
import type { User } from "firebase/auth";

export function usePresence(user: User | null) {
  useEffect(() => {
    if (!user) return;
    DatabaseService.initializePresence(user);
  }, [user]);
}