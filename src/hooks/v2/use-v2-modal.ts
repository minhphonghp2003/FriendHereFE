"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Global single-active-modal manager for v2.
 * Only one modal may be open at a time across the whole v2 app.
 *
 * Usage:
 *   const { isOpen, open, close } = useV2Modal("user-detail");
 *   <MyDialog open={isOpen} onOpenChange={(o) => !o && close()} />
 */

export const V2_CLOSE_MODALS_EVENT = "v2:close-modals";
const V2_MODAL_OPEN_EVENT = "v2:modal-open";
const V2_MODAL_CLOSE_EVENT = "v2:modal-close";

export function useV2Modal(id: string) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => setActiveId((e as CustomEvent<string>).detail);
    const onClose = () => setActiveId(null);

    window.addEventListener(V2_MODAL_OPEN_EVENT, onOpen);
    window.addEventListener(V2_MODAL_CLOSE_EVENT, onClose);
    window.addEventListener(V2_CLOSE_MODALS_EVENT, onClose);
    return () => {
      window.removeEventListener(V2_MODAL_OPEN_EVENT, onOpen);
      window.removeEventListener(V2_MODAL_CLOSE_EVENT, onClose);
      window.removeEventListener(V2_CLOSE_MODALS_EVENT, onClose);
    };
  }, []);

  const open = useCallback(() => {
    window.dispatchEvent(new CustomEvent(V2_MODAL_OPEN_EVENT, { detail: id }));
    setActiveId(id);
  }, [id]);

  const close = useCallback(() => {
    window.dispatchEvent(new Event(V2_MODAL_CLOSE_EVENT));
  }, []);

  return {
    isOpen: activeId === id,
    open,
    close,
  };
}

/** Close every v2 modal (used by the nearby sheet etc.) */
export function closeAllV2Modals() {
  window.dispatchEvent(new Event(V2_CLOSE_MODALS_EVENT));
}
