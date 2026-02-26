import { atom } from "jotai";

export const workerToDeleteAtom = atom<{ id: string; name: string } | null>(
  null,
);

export const editingWorkerAtom = atom<{
  id: string;
  name: string;
  color: number;
} | null>(null);
