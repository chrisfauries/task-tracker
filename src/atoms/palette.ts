import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { DatabaseService } from "../DatabaseService";
import { userAtom } from "./user";

export const DEFAULT_PALETTE_HEX = [
  "#10B981", // Green
  "#3B82F6", // Blue
  "#EAB308", // Yellow
  "#EF4444", // Red
  "#F97316", // Orange
  "#A855F7", // Purple
  "#EC4899", // Pink
];


const _customPalettePrimitiveAtom = atom<string[]>(DEFAULT_PALETTE_HEX);
const _customPaletteStorageAtom = atom(
  (get) => get(_customPalettePrimitiveAtom),
  (_, set, newColors: string[]) => {
    set(_customPalettePrimitiveAtom, newColors);
    if (newColors && newColors.length > 0) {
      newColors.forEach((color, index) => {
        document.documentElement.style.setProperty(
          `--color-user-${index + 1}`,
          color,
        );
      });
    }
  },
);

export const customPaletteSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_customPaletteStorageAtom, DEFAULT_PALETTE_HEX);
    return;
  }
  const unsubscribe = DatabaseService.subscribeToCustomPalette((colors) => {
    if (colors && Array.isArray(colors) && colors.length > 0) {
      set(_customPaletteStorageAtom, colors);
    }
  });
  return () => unsubscribe();
});

export const customPaletteAtom = atom(
  (get) => get(_customPaletteStorageAtom),
  (_, set, newColors: string[]) => {
    set(_customPaletteStorageAtom, newColors);
    DatabaseService.saveCustomPalette(newColors);
  },
);