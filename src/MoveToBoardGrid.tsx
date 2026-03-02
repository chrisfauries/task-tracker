import { useAtomValue, useSetAtom } from "jotai";
import { boardDataAtom, contextMenuPosAtom, noteContextTargetAtom, registerHistoryAtom, trackActivityAtom, workerIdsAtom } from "./atoms";
import { DatabaseService } from "./DatabaseService";

export function MoveToBoardGrid() {
  const boardData = useAtomValue(boardDataAtom);
  const workerIds = useAtomValue(workerIdsAtom);
  const target = useAtomValue(noteContextTargetAtom);
  const setPosition = useSetAtom(contextMenuPosAtom);
  const onHistory = useSetAtom(registerHistoryAtom);
  const onActivity = useSetAtom(trackActivityAtom);

  if (!target) return null;

  const handleMove = async (newWorkerId: string, newCol: number) => {
    if (!target.id || !target.workerId || target.column === undefined || target.position === undefined) return;

    // Find max position in target column to place at the bottom
    const targetWorker = boardData[newWorkerId];
    let maxPos = 0;
    if (targetWorker?.notes) {
      Object.values(targetWorker.notes).forEach((n) => {
        if (n.column === newCol && n.position > maxPos) {
          maxPos = n.position;
        }
      });
    }
    const newPos = maxPos + 1000;

    const noteData = await DatabaseService.getNote(target.workerId, target.id);
    if (!noteData) return;

    const updatedNote = { ...noteData, column: newCol, position: newPos };

    onActivity();
    onHistory({
      type: "MOVE",
      noteId: target.id,
      prevWorkerId: target.workerId,
      prevCol: target.column,
      prevPos: target.position,
      newWorkerId,
      newCol,
      newPos,
    });

    await DatabaseService.moveNote(target.id, target.workerId, newWorkerId, updatedNote);
    setPosition(null);
  };

  return (
    <div className="p-2 w-64 max-h-[600px] overflow-y-auto">
      <div className="flex items-center mb-2 px-2">
        <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex-1 text-center pr-4">Move to...</h3>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {workerIds.map((wId) => {
          const worker = boardData[wId];
          if (!worker) return null;
          return (
            <div key={wId} className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-100 dark:border-slate-700/50">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 px-1 truncate text-center">{worker.name}</span>
            <div className="flex gap-1 w-full">
              {["Assigned", "Active", "Done"].map((label, idx) => (
                <button
                  key={label}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.nativeEvent.isWithinContextMenu = true;
                    handleMove(wId, idx);
                  }}
                  className="flex-1 px-1 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[9px] font-bold uppercase tracking-tighter hover:bg-indigo-600 hover:text-white hover:border-indigo-600 dark:hover:bg-indigo-600 dark:hover:border-indigo-600 dark:text-slate-200 transition shadow-sm text-center"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}