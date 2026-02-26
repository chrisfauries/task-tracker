import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { DatabaseService } from "../DatabaseService";
import type { AllPresenceData } from "../types";
import { userAtom } from "./user";

const _presenceStorageAtom = atom<AllPresenceData>({});

export const presenceAtom = atom(
  (get) => get(_presenceStorageAtom),
  (_, set, newData: AllPresenceData) => set(_presenceStorageAtom, newData),
);

export const presenceSyncEffect = atomEffect((get, set) => {
  const user = get(userAtom);
  if (!user) {
    set(_presenceStorageAtom, {});
    return;
  }
  const unsubscribe = DatabaseService.subscribeToPresence((data) => {
    set(_presenceStorageAtom, data);
  });
  DatabaseService.initializePresence(user);
  return () => unsubscribe();
});