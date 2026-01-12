import React, { useMemo } from "react";
import type { PropsWithChildren } from "react";
import useDocumentEvent from "./hooks/useDocumentEvent";
import { useSetAtom } from "jotai";
import { contextMenuPosAtom } from "./atoms";

const EventBoundary: React.FC<PropsWithChildren> = ({ children }) => {
  const setContextMenuPos = useSetAtom(contextMenuPosAtom);
  const hideContextMenuHandler = useMemo(
    () => (e: MouseEvent) => {
      if (e.isWithinContextMenu) return;
      setContextMenuPos(null);
    },
    [setContextMenuPos]
  );

  useDocumentEvent("click", hideContextMenuHandler);

  return <>{children}</>;
};

export default EventBoundary;
