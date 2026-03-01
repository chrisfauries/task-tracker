import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { DatabaseService } from "../DatabaseService";
import type { LockData, LocksData } from "../types";
import { userAtom } from "./user";
import { selectAtom } from "jotai/utils";
import { atomFamily } from "jotai-family";

const _locksStorageAtom = atom<LocksData>({});

export const locksAtom = atom(
  (get) => get(_locksStorageAtom),
  (_, set, newData: LocksData) => set(_locksStorageAtom, newData),
);

export const lockFamily = atomFamily((noteId: string) =>
  selectAtom(locksAtom, (locks) => locks[noteId] ?? null),
);

export const locksSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_locksStorageAtom, {});
    return;
  }
  const unsubscribe = DatabaseService.subscribeToLocks((data) => {
    set(_locksStorageAtom, data);
  });
  return () => unsubscribe();
});