import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/provider";
import type { GroceryItem, Retailer } from "@/lib/types";

export const maxDuration = 60;

interface WarmCacheRequestBody {
  item: GroceryItem;
  stores: Retailer[];
}

/** Total time budget for all store scraping (ms). Leave headroom before Vercel's 60s kill. */
const TOTAL_BUDGET_MS = 50_000;
/** Per-store scrape timeout (ms). */
const STORE_TIMEOUT_MS = 20_000;

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

  // Scrape sequentially with a total time budget — cache whatever succeeds
  const startTime = Date.now();
  let cached = 0;
  for (const store of stores) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= TOTAL_BUDGET_MS) {
      console.warn(`[warm-cache] budget exhausted after ${elapsed}ms, cached ${cached}/${stores.length} stores`);
      break;
    }
    const remaining = TOTAL_BUDGET_MS - elapsed;
    const storeTimeout = Math.min(STORE_TIMEOUT_MS, remaining);
    try {
      const result = await withTimeout(
        searchProducts([sanitizedItem], store),
        storeTimeout
      );
      if (result) cached++;
    } catch {
      // skip this store, continue with next
    }
  }

  return NextResponse.json({ success: true, storesCached: cached });
}
