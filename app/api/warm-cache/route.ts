import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/provider";
import type { GroceryItem, Retailer } from "@/lib/types";

export const maxDuration = 60;

interface WarmCacheRequestBody {
  item: GroceryItem;
  stores: Retailer[];
}

/**
 * Scrapes a single item across all provided stores, populating the KV cache.
 * Called fire-and-forget from the client as users build their list.
 * The cached results are later read by /api/pricing when the user compares.
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

  // Scrape this item at each store sequentially to avoid Browserless rate limits
  for (const store of stores) {
    await searchProducts([sanitizedItem], store).catch(() => []);
  }

  return NextResponse.json({ success: true });
}
