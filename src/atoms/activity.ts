import { atom } from "jotai";
import { auth } from "../firebase";
import { snapshotsAtom } from "./snapshots";

const _activityTimeoutAtom = atom<ReturnType<typeof setTimeout> | null>(null);

export const trackActivityAtom = atom(null, (get, set) => {
  const currentTimeout = get(_activityTimeoutAtom);
  if (currentTimeout) {
    clearTimeout(currentTimeout);
  }

  const newTimeout = setTimeout(() => {
    const user = auth.currentUser;
    if (user) {
      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = new Date().toLocaleDateString();
      set(
        snapshotsAtom,
        `${user.displayName} made changes @ ${timeStr} on ${dateStr}`,
      );
    }
  }, 60000 * 5); // 5 minutes

  set(_activityTimeoutAtom, newTimeout);
});