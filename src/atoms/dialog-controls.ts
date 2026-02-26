import { atom } from "jotai";
import { atomFamily } from "jotai-family";

export enum Dialog {
  NONE,
  ADD_WORKER,
  EDIT_WORKER,
  DELETE_WORKER,
  WORKER_ORDER,
  CUSTOM_COLORS,
  DUE_DATE,
  IMPORT_EXPORT,
  CATEGORY_MANAGEMENT,
  ADD_TO_CATEGORY,
  SNAPSHOT,
}

const _dialogAtom = atom<Dialog>(Dialog.NONE);

export const isDialogOpen = atomFamily((dialog: Dialog) =>
  atom((get) => get(_dialogAtom) === dialog),
);


export const openDialog = atom(null, (_, set, dialog: Dialog) =>
  set(_dialogAtom, dialog),
);

export const closeDialog = atom(null, (_, set) =>
  set(_dialogAtom, Dialog.NONE),
);
