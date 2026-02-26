import { atom } from "jotai";

interface Position {
  x: number;
  y: number;
}

export const contextMenuPosAtom = atom<Position | null>(null);
export const appSettingsMenuPosAtom = atom<Position | null>(null);
