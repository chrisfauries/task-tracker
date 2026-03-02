import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { DatabaseService } from "../DatabaseService";
import type { CategoriesData } from "../types";
import { userAtom } from "./user";
import { boardDataAtom } from "./board";
import { trackActivityAtom } from "./activity";

// Category Atoms
const _categoriesStorageAtom = atom<CategoriesData>({});

export const categoriesAtom = atom(
  (get) => get(_categoriesStorageAtom),
  (_, set, newData: CategoriesData) => set(_categoriesStorageAtom, newData),
);

export const categoriesSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_categoriesStorageAtom, {});
    return;
  }
  const unsubscribe = DatabaseService.subscribeToCategories((data) => {
    set(_categoriesStorageAtom, data);
  });
  return () => unsubscribe();
});

export const applyCategoryAtom = atom(
  null,
  async (
    get,
    set,
    {
      catId,
      workerId,
      colIndex,
    }: { catId: string; workerId: string; colIndex: number },
  ) => {
    const categories = get(categoriesAtom);
    const boardData = get(boardDataAtom);

    const category = categories[catId];
    if (!category || !category.items) return;

    set(trackActivityAtom);

    const workerNotes = boardData[workerId]?.notes || {};
    const validPositions = Object.values(workerNotes)
      .filter(
        (n) =>
          n.column === colIndex &&
          typeof n.position === "number" &&
          !isNaN(n.position),
      )
      .map((n) => n.position);
    const lastPos = validPositions.length > 0 ? Math.max(...validPositions) : 0;

    for (const [index, text] of category.items.entries()) {
      await DatabaseService.createNote(workerId, {
        text,
        column: colIndex,
        color: category.color !== undefined ? category.color : 0,
        position: lastPos + 1000 + index * 10,
        categoryName: category.name,
      });
    }
  },
);