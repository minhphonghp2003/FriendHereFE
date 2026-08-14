/**
 * Online/offline status tracking.
 *
 * A tiny pub/sub module that mirrors `navigator.onLine` and the browser
 * `online` / `offline` events. Both the axios adapter (non-React) and React
 * components subscribe to this.
 */

type StatusListener = (online: boolean) => void;

const listeners = new Set<StatusListener>();

let online =
  typeof navigator !== "undefined" ? navigator.onLine : true;

export function isOnline(): boolean {
  return online;
}

export function setOnline(value: boolean): void {
  if (online === value) return;
  online = value;
  listeners.forEach((fn) => fn(value));
}

/** Subscribe to online/offline transitions. Returns an unsubscribe fn. */
export function subscribe(listener: StatusListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Attach window `online`/`offline` listeners.
 * Returns a cleanup function (no-op on SSR).
 */
export function initOfflineStatus(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = () => setOnline(true);
  const handleOffline = () => setOnline(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Sync initial value in case the page loaded while offline.
  setOnline(navigator.onLine);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
