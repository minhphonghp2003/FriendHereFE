/**
 * Outbox sync: replays queued mutations when connectivity is restored.
 *
 * Requests are replayed sequentially in queue order. On success the entry is
 * removed. If the server returns an HTTP response (any status) the entry is
 * also removed — the server has made a decision and retrying won't help. Only
 * pure network failures keep the entry for the next flush.
 */

import axios, { type AxiosInstance } from "axios";
import { getOutbox, removeFromOutbox } from "./outbox";
import { isOnline } from "./status";

let flushing = false;

export async function flushOutbox(client: AxiosInstance): Promise<void> {
  if (flushing || !isOnline()) return;
  flushing = true;

  try {
    const items = await getOutbox();

    for (const item of items) {
      if (!isOnline()) break;

      try {
        await client.request({
          method: item.method,
          url: item.url,
          params: item.params,
          data: item.data,
          headers: item.headers,
        });
        // Success → remove from outbox.
        if (item.id !== undefined) {
          await removeFromOutbox(item.id);
        }
      } catch (error) {
        const hasResponse = axios.isAxiosError(error) && error.response !== undefined;

        if (hasResponse) {
          // Server responded (even with an error) → don't retry.
          if (item.id !== undefined) {
            await removeFromOutbox(item.id);
          }
        }
        // Pure network failure → stop flushing; keep remaining items for later.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}
