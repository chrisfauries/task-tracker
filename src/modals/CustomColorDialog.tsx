import React, { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { customPaletteAtom, isCustomColorsDialogOpenAtom } from "../atoms";
import { DatabaseService } from "../DatabaseService";
import { DEFAULT_PALETTE_HEX } from "../constants";

export function CustomColorsDialog() {
  const isOpen = useAtomValue(isCustomColorsDialogOpenAtom);

  if (!isOpen) return null;

  return <CustomColorsDialogContent />;
}

// Updated to generic names as requested
const SLOT_NAMES = ["One", "Two", "Three", "Four", "Five", "Six", "Seven"];

function CustomColorsDialogContent() {
  const setIsOpen = useSetAtom(isCustomColorsDialogOpenAtom);
  // Read the current live palette from the global state (which is synced with DB)
  const currentPalette = useAtomValue(customPaletteAtom);
  
  // Initialize local state for editing
  const [colors, setColors] = useState<string[]>(currentPalette);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const handleClose = () => setIsOpen(false);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColors = [...colors];
    newColors[selectedIndex] = e.target.value;
    setColors(newColors);
  };

  const handleReset = () => {
    setColors(DEFAULT_PALETTE_HEX);
  };

  const handleSave = () => {
    DatabaseService.saveCustomPalette(colors);
    handleClose();
  };

  // Helper to generate visual previews of the shades
  const getPreviewStyles = (baseColor: string) => {
    return {
      assigned: {
        backgroundColor: `${baseColor}80`,
        borderColor: `${baseColor}60`,    
        color: "#525252ff",                 
      },
      inProgress: {
        backgroundColor: `${baseColor}D0`, 
        borderColor: baseColor,           
        color: "#0f172a",                 
      },
      completed: {
        backgroundColor: `${baseColor}30`, 
        borderColor: `${baseColor}30`,
        color: "#94a3b8",
      }
    };
  };

  const currentStyles = getPreviewStyles(colors[selectedIndex]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border dark:border-slate-700">
        
        {/* Header */}
        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Customize Color Palette</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Choose 7 colors to use across your board.</p>
          </div>
          <button 
            onClick={handleClose} 
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          
          {/* Left Panel: Slot Selection */}
          <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-800 border-r dark:border-slate-700 p-6 overflow-y-auto">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Color Slots</h3>
            <div className="space-y-3">
              {colors.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${
                    selectedIndex === idx 
                      ? "bg-white dark:bg-slate-700 border-indigo-600 shadow-md ring-1 ring-indigo-100 dark:ring-indigo-900" 
                      : "bg-white dark:bg-slate-900 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-full shadow-inner border border-black/5" 
                    style={{ backgroundColor: color }}
                  />
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{SLOT_NAMES[idx] || `Slot ${idx + 1}`}</div>
                    <div className="text-xs text-slate-400 font-mono uppercase">{color}</div>
                  </div>
                  {selectedIndex === idx && (
                    <div className="ml-auto text-indigo-600 dark:text-indigo-400 font-bold">👉</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Picker & Preview */}
          <div className="flex-1 p-8 bg-white dark:bg-slate-900 flex flex-col gap-8 overflow-y-auto">
            
            {/* Picker Section */}
            <section>
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                Edit {SLOT_NAMES[selectedIndex]}
              </h3>
              <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer">
                  <div 
                    className="w-24 h-24 rounded-2xl shadow-lg border-4 border-white dark:border-slate-700 ring-1 ring-slate-200 dark:ring-slate-600 overflow-hidden"
                    style={{ backgroundColor: colors[selectedIndex] }}
                  />
                  <input
                    type="color"
                    value={colors[selectedIndex]}
                    onChange={handleColorChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-2xl">
                    <span className="text-white drop-shadow-md font-bold text-sm">Change</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Hex Code</label>
                  <input 
                    type="text" 
                    value={colors[selectedIndex]}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newColors = [...colors];
                      newColors[selectedIndex] = val;
                      setColors(newColors);
                    }}
                    className="w-full px-4 py-2 border dark:border-slate-600 rounded-lg font-mono text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-indigo-400 outline-none uppercase"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Select a color to automatically generate the light, medium, and transparent shades used in the UI.
                  </p>
                </div>
              </div>
            </section>

            {/* Preview Section */}
            <section className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 flex flex-col">
              <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Preview</h3>
              
              <div className="flex-1 flex items-center justify-between gap-4">
                {/* Assigned (Standard) */}
                <div 
                  className="flex-1 aspect-[3/4] rounded-xl border-l-4 shadow-sm p-4 flex flex-col relative rotate-[-1deg] transition-transform hover:scale-105"
                  style={{ 
                    backgroundColor: currentStyles.assigned.backgroundColor,
                    borderLeftColor: currentStyles.assigned.borderColor,
                    color: currentStyles.assigned.color
                  }}
                >
                  <div className="font-bold text-sm mb-2">Assigned</div>
                  <div className="text-xs opacity-80 leading-relaxed">
                    Task is ready to be picked up.
                  </div>
                </div>

                {/* In Progress (Active/Darker) */}
                <div 
                  className="flex-1 aspect-[3/4] rounded-xl border-l-4 shadow-md p-4 flex flex-col relative rotate-[1deg] scale-105 z-10"
                  style={{
                    backgroundColor: currentStyles.inProgress.backgroundColor,
                    borderLeftColor: currentStyles.inProgress.borderColor,
                    color: currentStyles.inProgress.color
                  }}
                >
                   <div className="font-bold text-sm mb-2">In Progress</div>
                   <div className="text-xs opacity-90 leading-relaxed">
                    Currently being worked on.
                  </div>
                </div>

                 {/* Completed (Faint) */}
                 <div 
                  className="flex-1 aspect-[3/4] rounded-xl border-l-4 p-4 flex flex-col relative rotate-[-1deg] opacity-90 transition-transform hover:scale-105"
                  style={{
                    backgroundColor: currentStyles.completed.backgroundColor,
                    borderLeftColor: currentStyles.completed.borderColor,
                    color: currentStyles.completed.color
                  }}
                >
                   <div className="font-bold text-sm mb-2">Completed</div>
                   <div className="text-xs opacity-80 leading-relaxed">
                    Task finished.
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex justify-between items-center">
          <button 
            onClick={handleReset}
            className="text-slate-500 dark:text-slate-400 text-sm font-bold hover:text-slate-700 dark:hover:text-slate-200 px-4 py-2"
          >
            Reset Defaults
          </button>
          <div className="flex gap-3">
            <button 
              onClick={handleClose}
              className="px-6 py-2 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 rounded-lg font-bold text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 transition shadow-lg"
            >
              Save Palette
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}