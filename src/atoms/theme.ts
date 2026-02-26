import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { DatabaseService } from "../DatabaseService";
import { userAtom } from "./user";


const _darkModeStorageAtom = atom(false);

export const darkModeDomEffect = atomEffect((get) => {
  if (get(_darkModeStorageAtom)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
});
export const darkModeSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (user) {
    const unsubscribe = DatabaseService.subscribeToTheme(user.uid, (isDark) => {
      set(_darkModeStorageAtom, isDark);
    });
    return () => unsubscribe();
  } else {
    set(_darkModeStorageAtom, false);
  }
});
export const darkModeAtom = atom(
  (get) => get(_darkModeStorageAtom),
  (get, set, newMode: boolean) => {
    // Optimistic Update
    set(_darkModeStorageAtom, newMode);

    // Write to Database if logged in
    const user = get(userAtom);
    if (user) {
      DatabaseService.saveTheme(user.uid, newMode);
    }
  },
);