/**
 * GET response cache backed by IndexedDB.
 *
 * Each successful 2xx GET response is stored so that when the device goes
 * offline the same request can be served from cache.
 */

import axios from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { dbGet, dbPut, STORE_CACHE } from "./db";

export interface CachedEntry {
  key: string;
  data: unknown;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  savedAt: number;
}

/**
 * Build a deterministic cache key from an axios request config.
 * Uses the fully-resolved URL (baseURL + url + serialized params).
 */
export function buildCacheKey(config: InternalAxiosRequestConfig): string {
  return axios.getUri(config);
}

export async function getCached(key: string): Promise<CachedEntry | undefined> {
  return dbGet<CachedEntry>(STORE_CACHE, key);
}

export async function setCached(key: string, response: AxiosResponse): Promise<void> {
  const entry: CachedEntry = {
    key,
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: normalizeHeaders(response.headers),
    savedAt: Date.now(),
  };
  await dbPut(STORE_CACHE, entry);
}

/**
 * Reconstruct an AxiosResponse object from a cached entry.
 * The caller (axios dispatch) will run transformResponse on `data`.
 */
export function responseFromCache(
  config: InternalAxiosRequestConfig,
  entry: CachedEntry,
): AxiosResponse {
  return {
    data: entry.data,
    status: entry.status,
    statusText: entry.statusText,
    headers: entry.headers,
    config,
    request: {},
  };
}

function normalizeHeaders(headers: AxiosResponse["headers"] | unknown): Record<string, string> {
  if (!headers || typeof headers !== "object") return {};

  // AxiosHeaders instances expose a toJSON() method.
  const maybe = headers as { toJSON?: () => Record<string, string> };
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
