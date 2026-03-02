import { atom } from "jotai";
import type { NoteContextTarget } from "../types";

export const noteContextTargetAtom = atom<NoteContextTarget | null>(null);