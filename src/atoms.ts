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
export const isCategoryManagementDialogOpenAtom = atom(false);
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

// Worker Modal Atoms
export const isAddWorkerDialogOpenAtom = atom(false);

export const isEditWorkerDialogOpenAtom = atom(false);
export const editingWorkerAtom = atom<{ id: string; name: string; color: number } | null>(null);

export const isDeleteWorkerDialogOpenAtom = atom(false);
export const workerToDeleteAtom = atom<{ id: string; name: string } | null>(null);

// Custom Colors Dialog Atom
export const isCustomColorsDialogOpenAtom = atom(false);

// Due Date Dialog Atom
export const isDueDateDialogOpenAtom = atom(false);

// Import/Export Dialog Atom
export const isImportExportDialogOpenAtom = atom(false);

// Search and Filter Atoms (Non-persistent)
export const searchQueryAtom = atom("");
export const selectedCategoriesAtom = atom<string[]>([]);

// Custom Palette Atom
// Defaults match the CSS defaults
const DEFAULT_PALETTE = [
  "#10B981", "#3B82F6", "#EAB308", "#EF4444", "#F97316", "#A855F7", "#EC4899"
];
const _customPaletteStorageAtom = atom<string[]>(DEFAULT_PALETTE);

export const customPaletteAtom = atom(
  (get) => get(_customPaletteStorageAtom),
  (_, set, newColors: string[]) => {
    set(_customPaletteStorageAtom, newColors);
  }
);

customPaletteAtom.onMount = (setSelf) => {
  const unsubscribe = DatabaseService.subscribeToCustomPalette((colors) => {
    if (colors && Array.isArray(colors) && colors.length > 0) {
      setSelf(colors);
    }
  });
  return () => unsubscribe();
};