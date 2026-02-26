import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { DatabaseService } from "../DatabaseService";
import type { SnapshotsData } from "../types";
import { userAtom } from "./user";
import { boardDataAtom } from "./board";
import { categoriesAtom } from "./categories";

const _snapshotsStorageAtom = atom<SnapshotsData | null>(null);
const _hasLoggedLoginSnapshotAtom = atom(false);

export const snapshotsLoadingAtom = atom(
  (get) => get(_snapshotsStorageAtom) === null,
);

export const snapshotsSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_snapshotsStorageAtom, null);
    return;
  }
  const unsubscribe = DatabaseService.subscribeToSnapshots((data) => {
    set(_snapshotsStorageAtom, data);
  });
  return () => unsubscribe();
});

export const snapshotsAtom = atom(
  (get) => {
    const data = get(_snapshotsStorageAtom);
    if (!data) return [];
    return Object.entries(data).sort((a, b) => b[1].timestamp - a[1].timestamp);
  },
  async (get, _, reason: string) => {
    const user = get(userAtom);
    if (!user) return;
    const boardData = get(boardDataAtom);
    const categories = get(categoriesAtom);
    await DatabaseService.saveSnapshot(user, reason, boardData, categories);
  },
);


export const snapshotsLoginSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  const hasLogged = get(_hasLoggedLoginSnapshotAtom);

  if (!user) {
    if (hasLogged) {
      set(_hasLoggedLoginSnapshotAtom, false);
    }
    return;
  }

  const boardData = get(boardDataAtom);
  const categories = get(categoriesAtom);

  if (
    !hasLogged &&
    Object.keys(boardData).length > 0 &&
    Object.keys(categories).length > 0
  ) {
    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const dateStr = new Date().toLocaleDateString();
    set(
      snapshotsAtom,
      `${user.displayName} logged in @ ${timeStr} on ${dateStr}`,
    );
    set(_hasLoggedLoginSnapshotAtom, true);
  }
});