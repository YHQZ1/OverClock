import { useEffect, useRef } from "react";

type Options = {
  enabled?: boolean;
  /** Also fire while the user is typing in a text field (e.g. Escape). */
  inInputs?: boolean;
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/** Bind several keys (case-insensitive) to handlers while mounted. */
export function useShortcuts(bindings: Record<string, () => void>, { enabled = true, inInputs = false }: Options = {}) {
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (!inInputs && isTyping(e.target)) return;
      // "shift+1" style bindings use the physical key, since Shift changes e.key ("1" → "!").
      const physical = e.code.replace(/^(Digit|Key)/, "").toLowerCase();
      const key = e.shiftKey && e.code !== "ShiftLeft" && e.code !== "ShiftRight" ? `shift+${physical}` : e.key.toLowerCase();
      const handler = Object.entries(bindingsRef.current).find(([k]) => k.toLowerCase() === key)?.[1];
      if (!handler) return;
      e.preventDefault();
      handler();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, inInputs]);
}

/** Bind a single key (case-insensitive) to a handler while mounted. */
export function useShortcut(key: string, handler: () => void, options?: Options) {
  useShortcuts({ [key]: handler }, options);
}
