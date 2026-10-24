"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

// A side panel for "add/create without leaving the page" — same dismiss
// shape as ConfirmDialog (portal to body, backdrop click + Escape) but a
// slide-over sized for a form rather than a confirm/cancel choice. Keyboard
// users land on its first field when it opens and go back to whatever
// opened it when it closes; screen readers announce it by its title.
export function Drawer({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  // "lg" for a wide table (analytics drill-down) rather than a form.
  size?: "md" | "lg";
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first = panel.current?.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
    );
    (first ?? panel.current)?.focus();
    return () => opener?.focus();
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        ref={panel}
        tabIndex={-1}
        className={`flex h-full w-full ${size === "lg" ? "max-w-[960px]" : "max-w-[440px]"} flex-col overflow-y-auto border-l border-border bg-surface p-6 outline-none`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-[17px] font-extrabold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-panel border border-border px-2.5 py-1 text-[13px] font-bold text-ink-soft"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
