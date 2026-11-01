"use client";

import { useCallback, useEffect, useRef } from "react";

// Every open Drawer, Modal and ConfirmDialog registers here while it's
// mounted, in the order they opened. They all listen for Escape on
// `document`, so without this a modal opened over a drawer (e.g. "New
// Customer" from an invoice) would close both on one keypress and throw
// away what was typed into the drawer. Only the overlay on top acts.
const stack: object[] = [];

// Returns a stable `isTop()` for use inside event handlers.
export function useOverlayLayer(): () => boolean {
  const token = useRef<object | null>(null);

  useEffect(() => {
    const layer = {};
    token.current = layer;
    stack.push(layer);
    return () => {
      const index = stack.lastIndexOf(layer);
      if (index !== -1) stack.splice(index, 1);
    };
  }, []);

  return useCallback(() => token.current !== null && stack[stack.length - 1] === token.current, []);
}
