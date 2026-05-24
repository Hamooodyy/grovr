import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/provider";
import type { GroceryItem, Retailer } from "@/lib/types";

export const maxDuration = 60;

interface WarmCacheRequestBody {
  item: GroceryItem;
  stores: Retailer[];
}

/** Per-store scrape timeout (ms). Skip stores that take too long. */
const STORE_TIMEOUT_MS = 45_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * Scrapes a single item across all provided stores, populating the KV cache.
 * Called fire-and-forget from the client as users build their list.
 * Stores that timeout or fail are skipped — whatever gets cached is useful.
 */
export async function POST(request: Request) {
  let body: WarmCacheRequestBody;

  try {
    body = (await request.json()) as WarmCacheRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { item, stores } = body;

  if (!item?.name || !Array.isArray(stores) || stores.length === 0) {
    return NextResponse.json({ error: "item and stores are required" }, { status: 400 });
  }

  const sanitizedItem: GroceryItem = {
    ...item,
    name: item.name.trim().slice(0, 80),
    brandPref: item.brandPref?.trim().slice(0, 40) || undefined,
  };

  // Scrape sequentially with per-store timeout — cache whatever succeeds
  let cached = 0;
  for (const store of stores) {
    try {
      const result = await withTimeout(
        searchProducts([sanitizedItem], store),
        STORE_TIMEOUT_MS
      );
      if (result) cached++;
    } catch {
      // skip this store, continue with next
    }
  }

  return NextResponse.json({ success: true, storesCached: cached });
}
