import { atom } from "jotai";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { auth } from "../firebase";
import { snapshotsAtom } from "./snapshots";


const _userStorageAtom = atom<User | null>(null);

_userStorageAtom.onMount = (setSelf) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setSelf(user);
  });
  return () => unsubscribe();
};

export const userAtom = atom((get) => get(_userStorageAtom));

export const logoutAtom = atom(null, async (get, set) => {
  const user = get(userAtom);
  if (user) {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = new Date().toLocaleDateString();
    await set(
      snapshotsAtom,
      `${user.displayName} logged out @ ${timeStr} on ${dateStr}`,
    );
  }
  await signOut(auth);
});