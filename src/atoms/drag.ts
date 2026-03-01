import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import type { DragOrigin } from "../types";
import { userAtom } from "./user";

// Drag Origin Atom
export const dragOriginAtom = atom<DragOrigin | null>(null);

export const isDraggingAtom = atom((get) => get(dragOriginAtom) !== null);


export const dragOriginEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) return;
  const handleGlobalDragEnd = () => set(dragOriginAtom, null);
  window.addEventListener("dragend", handleGlobalDragEnd);
  return () => window.removeEventListener("dragend", handleGlobalDragEnd);
});