"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

/** Centered dialog for short create/edit workflows that should not navigate away. */
export function Modal({
  title,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const first = panel.current?.querySelector<HTMLElement>(
      "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])",
    );
    (first ?? panel.current)?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/55 p-4"
      role="presentation"
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`my-auto flex max-h-[min(90vh,900px)] w-full flex-col overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl outline-none ${size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl"}`}
      >
        <header className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-[17px] font-extrabold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-soft hover:bg-bg">✕</button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
