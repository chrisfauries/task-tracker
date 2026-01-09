export const COLUMN_NAMES = {
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
} as const;

export type COLUMN_NAME = typeof COLUMN_NAMES[keyof typeof COLUMN_NAMES];

export const BELL_SOUND_URL = "/bell.mp3";

export const COLOR_MATRIX: Record<string, any> = {
  Green: {
    name: "Green",
    shades: {
      0: {
        bg: "bg-emerald-100",
        border: "border-emerald-400",
        text: "text-emerald-900",
      },
      1: {
        bg: "bg-emerald-300",
        border: "border-emerald-600",
        text: "text-emerald-950",
      },
      2: {
        bg: "bg-emerald-50/50",
        border: "border-emerald-200",
        text: "text-slate-400",
      },
    },
  },
  Blue: {
    name: "Blue",
    shades: {
      0: {
        bg: "bg-blue-100",
        border: "border-blue-400",
        text: "text-blue-900",
      },
      1: {
        bg: "bg-blue-300",
        border: "border-blue-600",
        text: "text-blue-950",
      },
      2: {
        bg: "bg-blue-50/50",
        border: "border-blue-200",
        text: "text-slate-400",
      },
    },
  },
  Yellow: {
    name: "Yellow",
    shades: {
      0: {
        bg: "bg-yellow-100",
        border: "border-yellow-400",
        text: "text-yellow-900",
      },
      1: {
        bg: "bg-yellow-300",
        border: "border-yellow-600",
        text: "text-yellow-950",
      },
      2: {
        bg: "bg-yellow-50/50",
        border: "border-yellow-200",
        text: "text-slate-400",
      },
    },
  },
  Red: {
    name: "Red",
    shades: {
      0: { bg: "bg-red-100", border: "border-red-400", text: "text-red-900" },
      1: { bg: "bg-red-300", border: "border-red-600", text: "text-red-950" },
      2: {
        bg: "bg-red-50/50",
        border: "border-red-200",
        text: "text-slate-400",
      },
    },
  },
  Orange: {
    name: "Orange",
    shades: {
      0: {
        bg: "bg-orange-100",
        border: "border-orange-400",
        text: "text-orange-900",
      },
      1: {
        bg: "bg-orange-300",
        border: "border-orange-600",
        text: "text-orange-950",
      },
      2: {
        bg: "bg-orange-50/50",
        border: "border-orange-200",
        text: "text-slate-400",
      },
    },
  },
  Purple: {
    name: "Purple",
    shades: {
      0: {
        bg: "bg-purple-100",
        border: "border-purple-400",
        text: "text-purple-900",
      },
      1: {
        bg: "bg-purple-300",
        border: "border-purple-600",
        text: "text-purple-950",
      },
      2: {
        bg: "bg-purple-50/50",
        border: "border-purple-200",
        text: "text-slate-400",
      },
    },
  },
  Pink: {
    name: "Pink",
    shades: {
      0: {
        bg: "bg-pink-100",
        border: "border-pink-400",
        text: "text-pink-900",
      },
      1: {
        bg: "bg-pink-300",
        border: "border-pink-600",
        text: "text-pink-950",
      },
      2: {
        bg: "bg-pink-50/50",
        border: "border-pink-200",
        text: "text-slate-400",
      },
    },
  },
};