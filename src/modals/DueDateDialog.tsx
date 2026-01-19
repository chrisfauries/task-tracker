import React, { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { isDueDateDialogOpenAtom, addToCategoryTargetAtom } from "../atoms";
import { DatabaseService } from "../DatabaseService";

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function DueDateDialog() {
  const [isOpen, setIsOpen] = useAtom(isDueDateDialogOpenAtom);
  const target = useAtomValue(addToCategoryTargetAtom);

  // Initialize with the current due date (if any) or Today
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && target) {
      if (target.dueDate) {
        // Parse YYYY-MM-DD to set the view
        const [y, m, d] = target.dueDate.split("-").map(Number);
        const date = new Date(y, m - 1, d);
        setViewDate(date);
        setSelectedDateStr(target.dueDate);
      } else {
        setViewDate(new Date());
        setSelectedDateStr(null);
      }
    }
  }, [isOpen, target]);

  if (!isOpen || !target) return null;

  const handleClose = () => setIsOpen(false);

  const handleSave = async () => {
    if (target) {
      await DatabaseService.updateNoteDueDate(target.workerId, target.id, selectedDateStr);
    }
    setIsOpen(false);
  };

  const handleClear = async () => {
    if (target) {
      await DatabaseService.updateNoteDueDate(target.workerId, target.id, null);
    }
    setIsOpen(false);
  };

  // Calendar Helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const startDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
  const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

  const handleDateClick = (day: number) => {
    // Format as YYYY-MM-DD
    const m = currentMonth + 1;
    const mm = m < 10 ? `0${m}` : m;
    const dd = day < 10 ? `0${day}` : day;
    setSelectedDateStr(`${currentYear}-${mm}-${dd}`);
  };

  const isSelected = (day: number) => {
    if (!selectedDateStr) return false;
    const [y, m, d] = selectedDateStr.split("-").map(Number);
    return y === currentYear && m === (currentMonth + 1) && d === day;
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth &&
      today.getFullYear() === currentYear
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[320px] overflow-hidden">
        
        {/* Header */}
        <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
          <h2 className="font-bold text-lg">Set Due Date</h2>
          <button onClick={handleClose} className="text-indigo-100 hover:text-white">✕</button>
        </div>

        <div className="p-4">
          
          {/* Calendar Controls */}
          <div className="flex justify-between items-center mb-4">
            <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded text-slate-600">◀</button>
            <span className="font-bold text-slate-700">{MONTH_NAMES[currentMonth]} {currentYear}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded text-slate-600">▶</button>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-slate-400 font-bold uppercase">
            {DAYS_OF_WEEK.map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1 text-sm">
            {Array.from({ length: startDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);
              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square flex items-center justify-center rounded-full transition-colors font-medium
                    ${selected 
                      ? "bg-indigo-600 text-white shadow-md" 
                      : today 
                        ? "text-indigo-600 font-black bg-indigo-50 border border-indigo-100" 
                        : "text-slate-700 hover:bg-slate-100"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-6 border-t pt-4">
            <div className="flex gap-2">
              <button 
                onClick={handleSave}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-bold hover:bg-indigo-700 transition"
              >
                Set Date
              </button>
              <button 
                onClick={handleClear}
                className="px-4 py-2 text-slate-500 font-bold hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              >
                Clear
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}