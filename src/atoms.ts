import { atom } from "jotai";
import { DatabaseService } from "./DatabaseService";
import type { SnapshotsData, CategoriesData, AddToCategoryTarget } from "./types";

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

// Category Atoms
const _categoriesStorageAtom = atom<CategoriesData>({});
export const isAddToCategoryDialogOpenAtom = atom(false);
export const addToCategoryTargetAtom = atom<AddToCategoryTarget | null>(null);
export const categoriesAtom = atom(
  (get) => get(_categoriesStorageAtom),
  (_, set, newData: CategoriesData) => set(_categoriesStorageAtom, newData)
);

categoriesAtom.onMount = (setSelf) => {
  const unsubscribe = DatabaseService.subscribeToCategories((data) => {
    setSelf(data);
  });
  return () => unsubscribe();
};


// Context Menu State
export const contextMenuPosAtom = atom<{ x: number; y: number } | null>(null);
export const appSettingsMenuPosAtom = atom<{ x: number; y: number } | null>(null);