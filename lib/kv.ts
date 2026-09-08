/**
 * lib/kv.ts
 *
 * Thin wrapper around Vercel KV (Upstash Redis) for typed cache operations.
 *
 * Env vars (auto-injected by Vercel when KV store is linked):
 *   KV_REST_API_URL, KV_REST_API_TOKEN
 */

import { kv } from "@vercel/kv";

// Key prefixes
export const RECIPES_PREFIX = "recipes:";
export const GEO_PREFIX = "geo:";

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    return await kv.get<T>(key);
  } catch (err) {
    console.warn(`[kv] get failed for key "${key}":`, err);
    return null;
  }
}

export async function kvSet<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    await kv.set(key, value, { ex: ttlSeconds });
  } catch (err) {
    console.warn(`[kv] set failed for key "${key}":`, err);
  }
}
