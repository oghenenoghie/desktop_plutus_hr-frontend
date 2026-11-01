"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

import { useOverlayLayer } from "@/components/ui/overlay-stack";

const FIELDS = "input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled])";
const FOCUSABLE = `${FIELDS}, button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])`;

/**
 * Centered dialog for short create/edit workflows that should not navigate
 * away — including on top of an open Drawer (e.g. "New Customer" from an
 * invoice). Same contract as Drawer: portal to body, Escape and backdrop
 * click close it, keyboard users land on its first field and go back to
 * whatever opened it. On top of that it keeps Tab inside itself, and only
 * the topmost overlay answers Escape, so closing it never closes the drawer
 * underneath.
 *
 * Only ever mount it in response to a client interaction (every call site
 * renders it from state that starts closed): it portals to `document.body`
 * during render, which doesn't exist while the page is pre-rendered.
 */
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
  const pressStartedOnBackdrop = useRef(false);
  const isTop = useOverlayLayer();

  // Re-registered when the caller passes a new onClose (usually an inline
  // arrow, so on every parent render) — which is why focus is handled in a
  // separate mount-only effect below.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!isTop()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.current.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      const inside = active instanceof Node && panel.current.contains(active);
      if (event.shiftKey && (!inside || active === first || active === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, isTop]);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // The first field, not the header's close button.
    const first = panel.current?.querySelector<HTMLElement>(FIELDS) ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel.current)?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto overscroll-contain bg-black/55 p-4"
      role="presentation"
      // Close only on a click that both started and ended on the backdrop:
      // selecting text in a field and releasing outside the panel is not a
      // request to throw the form away.
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Portalled events still bubble through the React tree — keep this
        // click away from a Drawer's backdrop handler underneath.
        event.stopPropagation();
        if (event.target === event.currentTarget && pressStartedOnBackdrop.current) onClose();
        pressStartedOnBackdrop.current = false;
      }}
      // Likewise a submit from a form in here must never reach a form the
      // modal was rendered inside (e.g. a purchase order being drafted).
      onSubmit={(event) => event.stopPropagation()}
    >
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`my-auto flex max-h-[min(90dvh,900px)] w-full flex-col overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl outline-none ${size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl"}`}
      >
        <header className="mb-5 flex items-center justify-between gap-4">
          <h2 id={titleId} className="text-[17px] font-extrabold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-soft hover:bg-bg"
          >
            ✕
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
