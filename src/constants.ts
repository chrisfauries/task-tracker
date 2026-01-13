export const COLUMN_NAMES = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
} as const;

export type COLUMN_NAME = typeof COLUMN_NAMES[keyof typeof COLUMN_NAMES];

export const BELL_SOUND_URL = "/bell.mp3";

const STYLE_MAP = [
  { bg: "bg-user-1", border: "border-user-1", text: "text-user-1" }, // Index 0
  { bg: "bg-user-2", border: "border-user-2", text: "text-user-2" }, // Index 1
  { bg: "bg-user-3", border: "border-user-3", text: "text-user-3" }, // Index 2
  { bg: "bg-user-4", border: "border-user-4", text: "text-user-4" }, // Index 3
  { bg: "bg-user-5", border: "border-user-5", text: "text-user-5" }, // Index 4
  { bg: "bg-user-6", border: "border-user-6", text: "text-user-6" }, // Index 5
  { bg: "bg-user-7", border: "border-user-7", text: "text-user-7" }, // Index 6
];

export const getNoteStyles = (colorIndex: number | undefined, column: number) => {
  // Default to 0 if undefined or out of bounds
  const idx = typeof colorIndex === 'number' && colorIndex >= 0 && colorIndex <= 6 
    ? colorIndex 
    : 0;
  
  const base = STYLE_MAP[idx];

  // Logic matches the previous "shades" matrix logic but using opacity modifiers
  if (column === 0) {
    // Assigned / Standard (Light bg, darker border)
    return {
      bg: `${base.bg}/20`, 
      border: `${base.border}/60`, 
      text: "text-slate-700"
    };
  } else if (column === 1) {
    // In Progress / Active (Darker bg, solid border)
    return {
      bg: `${base.bg}/50`,
      border: base.border,
      text: "text-slate-900" 
    };
  } else {
    // Completed / Faint (Very light)
    return {
      bg: `${base.bg}/10`,
      border: `${base.border}/30`,
      text: "text-slate-400"
    };
  }
};

export const getSolidColorClass = (colorIndex: number | undefined) => {
  const idx = typeof colorIndex === 'number' && colorIndex >= 0 && colorIndex <= 6 
    ? colorIndex 
    : 0;
  return STYLE_MAP[idx].bg;
};

// Defines the raw hex codes for defaults only (used in atoms.ts/CustomColorDialog)
export const DEFAULT_PALETTE_HEX = [
  "#10B981", // Green
  "#3B82F6", // Blue
  "#EAB308", // Yellow
  "#EF4444", // Red
  "#F97316", // Orange
  "#A855F7", // Purple
  "#EC4899", // Pink
];