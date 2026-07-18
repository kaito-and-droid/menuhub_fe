"use client";

import { RefObject, useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal-dialog behavior for a container element:
 * - Locks background scroll while open.
 * - Traps Tab focus inside the dialog.
 * - Closes on Escape.
 * - Moves focus into the dialog on open and returns it to the previously
 *   focused element (e.g. the trigger) on close.
 */
export function useDialogA11y(
  dialogRef: RefObject<HTMLElement | null>,
  open: boolean,
  onClose: () => void,
): void {
  // Keep the latest onClose without forcing the main effect to re-run.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const trigger = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialog) return;
      const nodes = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const activeInDialog = dialog.contains(document.activeElement);
      if (e.shiftKey) {
        if (!activeInDialog || document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!activeInDialog || document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      trigger?.focus?.();
    };
  }, [open, dialogRef]);
}
