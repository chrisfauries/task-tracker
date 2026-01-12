import React, { useState } from "react";

interface CustomColorsDialogProps {
  onClose: () => void;
  onSave?: (colors: string[]) => void;
}

// Initial defaults approximating the current Tailwind palette
const DEFAULT_PALETTE = [
  "#10B981", // Green (Emerald-500)
  "#3B82F6", // Blue (Blue-500)
  "#EAB308", // Yellow (Yellow-500)
  "#EF4444", // Red (Red-500)
  "#F97316", // Orange (Orange-500)
  "#A855F7", // Purple (Purple-500)
  "#EC4899", // Pink (Pink-500)
];

const SLOT_NAMES = ["Green", "Blue", "Yellow", "Red", "Orange", "Purple", "Pink"];

export function CustomColorsDialog({ onClose, onSave }: CustomColorsDialogProps) {
  const [colors, setColors] = useState<string[]>(DEFAULT_PALETTE);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColors = [...colors];
    newColors[selectedIndex] = e.target.value;
    setColors(newColors);
  };

  const handleReset = () => {
    setColors(DEFAULT_PALETTE);
  };

  const handleSave = () => {
    if (onSave) onSave(colors);
    onClose();
  };

  // Helper to generate visual previews of the shades
  // In a real implementation, this logic would generate the actual styles used by the app
  const getPreviewStyles = (baseColor: string) => {
    return {
      shade0: {
        backgroundColor: `${baseColor}20`, // ~12% opacity (Light bg)
        borderColor: `${baseColor}60`,    // ~37% opacity (Border)
        color: baseColor,                 // Text
      },
      shade1: {
        backgroundColor: `${baseColor}60`, // ~37% opacity (Medium bg)
        borderColor: baseColor,           // Solid border
        color: "#000000",                 // Dark text (simplified)
      },
      shade2: {
        backgroundColor: `${baseColor}10`, // Very faint
        border: `1px dashed ${baseColor}40`,
        color: "#94a3b8",
      }
    };
  };

  const currentStyles = getPreviewStyles(colors[selectedIndex]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Customize Color Palette</h2>
            <p className="text-slate-500 text-sm">Choose 7 colors to use across your board.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col md:flex-row h-[500px]">
          
          {/* Left Panel: Slot Selection */}
          <div className="w-full md:w-1/3 bg-slate-50 border-r p-6 overflow-y-auto">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Color Slots</h3>
            <div className="space-y-3">
              {colors.map((color, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-4 p-3 rounded-xl border-2 transition-all ${
                    selectedIndex === idx 
                      ? "bg-white border-indigo-600 shadow-md ring-1 ring-indigo-100" 
                      : "bg-white border-transparent hover:border-slate-300"
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-full shadow-inner border border-black/5" 
                    style={{ backgroundColor: color }}
                  />
                  <div className="text-left">
                    <div className="text-sm font-bold text-slate-700">{SLOT_NAMES[idx] || `Slot ${idx + 1}`}</div>
                    <div className="text-xs text-slate-400 font-mono uppercase">{color}</div>
                  </div>
                  {selectedIndex === idx && (
                    <div className="ml-auto text-indigo-600 font-bold">👉</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Picker & Preview */}
          <div className="flex-1 p-8 bg-white flex flex-col gap-8 overflow-y-auto">
            
            {/* Picker Section */}
            <section>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                Edit {SLOT_NAMES[selectedIndex]}
              </h3>
              <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer">
                  <div 
                    className="w-24 h-24 rounded-2xl shadow-lg border-4 border-white ring-1 ring-slate-200 overflow-hidden"
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
                  <label className="block text-xs font-bold text-slate-500 mb-1">Hex Code</label>
                  <input 
                    type="text" 
                    value={colors[selectedIndex]}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newColors = [...colors];
                      newColors[selectedIndex] = val;
                      setColors(newColors);
                    }}
                    className="w-full px-4 py-2 border rounded-lg font-mono text-slate-700 focus:ring-2 focus:ring-indigo-400 outline-none uppercase"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Select a color to automatically generate the light, medium, and transparent shades used in the UI.
                  </p>
                </div>
              </div>
            </section>

            {/* Preview Section */}
            <section className="flex-1 bg-slate-50 rounded-2xl p-6 border border-slate-100">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Preview</h3>
              
              <div className="space-y-4">
                {/* Card Preview (Shade 0 - Default Task) */}
                <div 
                  className="p-4 rounded-xl border-l-4 shadow-sm"
                  style={{ 
                    backgroundColor: currentStyles.shade0.backgroundColor,
                    borderLeftColor: currentStyles.shade0.borderColor,
                    color: currentStyles.shade0.color
                  }}
                >
                  <div className="font-bold text-sm mb-1">Task Card (Active)</div>
                  <div className="text-xs opacity-80">This is how a standard active task will look on the board.</div>
                </div>

                {/* Header Preview (Shade 1 - Stronger/Header) */}
                <div 
                  className="p-3 rounded-lg text-center font-bold text-sm shadow-sm"
                  style={{
                    backgroundColor: currentStyles.shade1.backgroundColor,
                    borderColor: currentStyles.shade1.borderColor,
                    color: "#1e293b" // Dark slate for contrast in this preview
                  }}
                >
                   Category Header / Strong Label
                </div>

                 {/* Placeholder Preview (Shade 2 - Faint) */}
                 <div 
                  className="p-4 rounded-xl text-center text-xs font-medium border-2 border-dashed"
                  style={{
                    backgroundColor: currentStyles.shade2.backgroundColor,
                    borderColor: currentStyles.shade2.border.split(' ')[2], // Extract color from border string
                    color: currentStyles.shade2.color
                  }}
                >
                   + Drop zone or empty state placeholder
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
          <button 
            onClick={handleReset}
            className="text-slate-500 text-sm font-bold hover:text-slate-700 px-4 py-2"
          >
            Reset Defaults
          </button>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-bold text-slate-600 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              className="px-6 py-2 rounded-lg font-bold text-white bg-slate-900 hover:bg-slate-800 transition shadow-lg"
            >
              Save Palette
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}