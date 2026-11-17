import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-primary-dark disabled:opacity-50",
  secondary: "border border-border bg-surface text-ink hover:bg-bg disabled:opacity-50",
  ghost: "text-ink-soft hover:text-ink disabled:opacity-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  // Compact, for a secondary action inside a toolbar (e.g. "Clear filters").
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-[22px] py-[11px] text-[13px]",
  lg: "px-[22px] py-[13px] text-[14px]",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = "primary", size = "md", className = "", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-btn font-extrabold transition-colors cursor-pointer disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
});
