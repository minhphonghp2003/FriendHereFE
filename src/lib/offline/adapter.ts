/**
 * Custom axios adapter with offline-first behaviour.
 *
 *   - When OFFLINE + GET     → serve from IndexedDB cache (or throw if no cache)
 *   - When OFFLINE + mutation → queue into outbox and reject with ERR_OFFLINE_QUEUED
 *   - When ONLINE  + GET     → network; on success cache the response.
 *                               On network failure fall back to cache.
 *   - When ONLINE  + mutation → network as usual.
 *
 * The default (browser xhr) adapter is resolved at module load and delegated to
 * for all real network requests.
 */

import axios from "axios";
import type { AxiosAdapter, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { isOnline } from "./status";
import { buildCacheKey, getCached, setCached, responseFromCache } from "./api-cache";
import { enqueueMutation } from "./outbox";

const defaultAdapter: AxiosAdapter = axios.getAdapter(axios.defaults.adapter ?? "xhr");

/**
 * Augment axios config so we can carry the "this was queued offline" flag
 * through to the response error interceptor without a separate data structure.
 */
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    _offlineQueued?: boolean;
  }
}

export const offlineFirstAdapter: AxiosAdapter = async (config) => {
  const method = (config.method ?? "get").toLowerCase();
  const key = buildCacheKey(config);
  const online = isOnline();

  // ── Offline GET → serve from cache ──────────────────────────────────────
  if (!online && method === "get") {
    const cached = await getCached(key);
    if (cached) {
      return responseFromCache(config, cached);
    }
    // No cached copy available — surface a clear offline error.
    throw createOfflineError("You are offline and no cached data is available.", config);
  }

  // ── Offline mutation → queue for later sync ─────────────────────────────
  if (!online && method !== "get") {
    await enqueueMutation({
      method,
      url: config.url ?? "",
      params: config.params,
      data: config.data,
      headers: plainHeaders(config.headers),
    });
    config._offlineQueued = true;
    throw createQueuedError(config);
  }

  // ── Online path: real network request ───────────────────────────────────
  try {
    const response = await defaultAdapter(config);

    // Cache successful GET responses for future offline use.
    if (method === "get" && response.status >= 200 && response.status < 300) {
      // Fire-and-forget; don't block the response on IndexedDB writes.
      void setCached(key, response);
    }

    return response;
  } catch (error) {
    // Network failure while "online" (e.g. flaky connection / server down)
    // → fall back to cached GET data if we have it.
    if (method === "get" && isNetworkError(error)) {
      const cached = await getCached(key);
      if (cached) {
        return responseFromCache(config, cached);
      }
    }
    throw error;
  }
};

function isNetworkError(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    !error.response &&
    (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
  );
}

function createOfflineError(message: string, config: InternalAxiosRequestConfig): AxiosError {
  return new axios.AxiosError(message, "ERR_NETWORK", config, null, undefined);
}

function createQueuedError(config: InternalAxiosRequestConfig): AxiosError {
  const error = new axios.AxiosError(
    "Queued offline — will sync when back online.",
    "ERR_OFFLINE_QUEUED",
    config,
    null,
    undefined,
  );
  return error;
}

function plainHeaders(
  headers: InternalAxiosRequestConfig["headers"] | undefined,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  const maybe = headers as unknown as { toJSON?: () => Record<string, string> };
  if (typeof maybe.toJSON === "function") {
    return maybe.toJSON();
  }
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number") {
      result[k] = String(v);
    }
  }
  return result;
}

export type { AxiosResponse };
