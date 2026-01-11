import { atom } from "jotai";
import { DatabaseService } from "./DatabaseService";
import type { SnapshotsData } from "./types";

// Snapshot Atoms
const _snapshotsStorageAtom = atom<SnapshotsData>({});
export const isSnapshotDialogOpenAtom = atom(false);
export const snapshotsLoadingAtom = atom(true);
export const snapshotsAtom = atom(
  (get) =>
    Object.entries(get(_snapshotsStorageAtom)).sort(
      (a, b) => b[1].timestamp - a[1].timestamp
    ),
  (_, set, newData: SnapshotsData) => {
    set(_snapshotsStorageAtom, newData);
    set(snapshotsLoadingAtom, false);
  }
);

snapshotsAtom.onMount = (setSelf) => {
  const unsubscribe = DatabaseService.subscribeToSnapshots((data) => {
    setSelf(data);
  });

  return () => unsubscribe();
};
