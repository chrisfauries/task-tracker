import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "success" | "neutral";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({
  variant = "secondary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "px-4 py-2 rounded-md text-sm font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<ButtonVariant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    secondary:
      "bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200",
    neutral: "bg-slate-200 text-slate-700 hover:bg-slate-300",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}