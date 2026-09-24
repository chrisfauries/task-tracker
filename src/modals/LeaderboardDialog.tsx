import React, { useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { isDialogOpen, closeDialog, Dialog, boardDataAtom } from "../atoms";

export function LeaderboardDialog() {
  const isOpen = useAtomValue(isDialogOpen(Dialog.LEADERBOARD));
  if (!isOpen) return null;
  return <LeaderboardDialogContent />;
}

function LeaderboardDialogContent() {
  const close = useSetAtom(closeDialog);
  const boardData = useAtomValue(boardDataAtom);
  
  const { startOfDay, startOfWeek, startOfMonth } = useMemo(() => {
    const now = new Date();
    
    // Today
    const day = new Date(now).setHours(0, 0, 0, 0);
    
    // This Week (Sunday - Saturday)
    const week = new Date(now);
    week.setDate(now.getDate() - now.getDay());
    week.setHours(0, 0, 0, 0);
    
    // This Month
    const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    return { startOfDay: day, startOfWeek: week.getTime(), startOfMonth: month };
  }, []);

  const stats = useMemo(() => {
    return Object.entries(boardData).map(([id, worker]) => {
      const timestamps = Object.values(worker.stats?.completedTasks || {});
      return {
        id,
        name: worker.name,
        daily: timestamps.filter((t) => t >= startOfDay).length,
        weekly: timestamps.filter((t) => t >= startOfWeek).length,
        monthly: timestamps.filter((t) => t >= startOfMonth).length,
      };
    });
  }, [boardData, startOfDay, startOfWeek, startOfMonth]);

  const renderBarChart = (title: string, dataKey: "daily" | "weekly" | "monthly") => {
    // Sort array by count (high to low)
    const sorted = [...stats].sort((a, b) => b[dataKey] - a[dataKey]);
    const maxCount = sorted.length > 0 ? sorted[0][dataKey] : 0;

    // Create an array of unique scores to calculate dense ranking for ties
    const uniqueScores = Array.from(new Set(sorted.map(w => w[dataKey])));

    if (maxCount === 0) {
      return (
        <div className="mb-10 last:mb-0">
          <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            {title}
          </h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">No tasks completed yet.</p>
        </div>
      );
    }

    const getMedal = (rank: number) => {
      switch(rank) {
        case 1: return <span title="1st Place">🥇</span>;
        case 2: return <span title="2nd Place">🥈</span>;
        case 3: return <span title="3rd Place">🥉</span>;
        default: return <></>;
      }
    };

    return (
      <div className="mb-10 last:mb-0">
        <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
          {title}
        </h4>
        <div className="flex flex-col gap-3">
          {sorted.map((worker) => {
            const count = worker[dataKey];
            if (count === 0 && maxCount > 0) return null; // Only show workers who have points
            
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
            // Rank is the index of the score in the uniqueScores array + 1
            const rank = uniqueScores.indexOf(count) + 1; 

            return (
              <div key={worker.id} className="grid grid-cols-[100px_1fr_40px] items-center gap-4">
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate text-right">
                  {worker.name} {getMedal(rank)}
                </div>
                <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="text-sm font-mono font-bold text-slate-500 text-left">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer"
        onClick={() => close()}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 md:p-10 shadow-2xl border border-slate-200/60 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        
        <button
          onClick={() => close()}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mb-2 text-center uppercase tracking-widest">
          Leaderboard
        </h3>
        <p className="text-sm font-medium text-slate-400 dark:text-slate-500 text-center mb-8 tracking-wide">
          Tasks completed today, this week, and this month.
        </p>

        {renderBarChart("Today", "daily")}
        {renderBarChart("This Week", "weekly")}
        {renderBarChart("This Month", "monthly")}
        
      </div>
    </div>
  );
}