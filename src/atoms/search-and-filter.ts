import { atom } from "jotai";

export const searchQueryAtom = atom("");
export const selectedCategoriesAtom = atom<string[]>([]);