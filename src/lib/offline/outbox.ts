/**
 * Outbox: a queue of mutations (POST/PUT/DELETE) created while the device was
 * offline. The entries are replayed sequentially once connectivity is restored.
 */

import { dbGetAll, dbPut, dbDelete, dbCount, STORE_OUTBOX } from "./db";

export interface QueuedMutation {
  id?: number;
  method: string;
  url: string;
  params?: unknown;
  data?: unknown;
  headers?: Record<string, string>;
  queuedAt: number;
  attempts: number;
}

type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

function notifyChange(): void {
  listeners.forEach((fn) => fn());
}

/** Subscribe to outbox changes (enqueue / remove). Returns an unsubscribe fn. */
export function subscribeOutboxChange(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function enqueueMutation(
  mutation: Omit<QueuedMutation, "id" | "queuedAt" | "attempts">,
): Promise<void> {
  const entry: QueuedMutation = {
    ...mutation,
    queuedAt: Date.now(),
    attempts: 0,
  };
  await dbPut(STORE_OUTBOX, entry);
  notifyChange();
}

export async function getOutbox(): Promise<QueuedMutation[]> {
  const items = await dbGetAll<QueuedMutation>(STORE_OUTBOX);
  // Oldest first so we replay in queue order.
  return items.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function removeFromOutbox(id: number): Promise<void> {
  await dbDelete(STORE_OUTBOX, id);
  notifyChange();
}

export async function countOutbox(): Promise<number> {
  return dbCount(STORE_OUTBOX);
}
