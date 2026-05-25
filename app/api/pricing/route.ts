import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/provider";
import { compareRetailerPrices } from "@/lib/pricing";
import { kvSet, RESULTS_PREFIX } from "@/lib/kv";
import { sendSMS } from "@/lib/twilio";
import type { GroceryItem, Retailer, StoredResults } from "@/lib/types";

export const maxDuration = 60;

interface PricingRequestBody {
  items: GroceryItem[];
  stores: Retailer[];
  phone?: string;
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

export async function POST(request: Request) {
  let body: PricingRequestBody;

  try {
    body = (await request.json()) as PricingRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { items, stores, phone } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array" },
      { status: 400 }
    );
  }
  if (!Array.isArray(stores) || stores.length === 0) {
    return NextResponse.json(
      { error: "stores must be a non-empty array" },
      { status: 400 }
    );
  }

  const sanitizedItems = items.map((item) => ({
    ...item,
    name: item.name.trim().slice(0, 80),
    brandPref: item.brandPref?.trim().slice(0, 40) || undefined,
  }));

  // Scrape stores sequentially with a total time budget.
  // Most items should be pre-cached via /api/warm-cache.
  // Stop early if running out of time — return whatever stores completed.
  const startTime = Date.now();
  const retailerMatches = [];
  for (const store of stores) {
    const elapsed = Date.now() - startTime;
    if (elapsed >= TOTAL_BUDGET_MS) {
      console.warn(`[api/pricing] total budget exhausted after ${elapsed}ms, skipping remaining stores`);
      break;
    }
    const remaining = TOTAL_BUDGET_MS - elapsed;
    const storeTimeout = Math.min(STORE_TIMEOUT_MS, remaining);
    try {
      const matches = await withTimeout(
        searchProducts(sanitizedItems, store),
        storeTimeout
      );
      if (matches) {
        retailerMatches.push({ retailer: store, items: matches });
      } else {
        console.warn(`[api/pricing] timeout for store ${store.name}, skipping`);
      }
    } catch {
      console.warn(`[api/pricing] error for store ${store.name}, skipping`);
    }
  }

  if (retailerMatches.length === 0) {
    return NextResponse.json(
      { error: "Could not fetch prices from any store. Please try again." },
      { status: 500 }
    );
  }

  const comparisons = compareRetailerPrices(retailerMatches);

  // Store results in KV for shareable link (48hr TTL)
  const resultId = crypto.randomUUID().slice(0, 8);
  const stored: StoredResults = {
    comparisons,
    items: sanitizedItems,
    createdAt: Date.now(),
  };
  await kvSet(`${RESULTS_PREFIX}${resultId}`, stored, 172800);

  // Fire-and-forget SMS if phone provided
  if (phone) {
    const cheapest = comparisons[0];
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://grovr.app";
    const msg = [
      `Grovr: Your shopping list is ready!`,
      `Total estimated cost: $${cheapest.subtotal.toFixed(2)}`,
      `Recommended store: ${cheapest.retailer.name}`,
      ``,
      `Shopping cart link: ${baseUrl}/results/${resultId}`,
    ].join("\n");
    sendSMS(phone, msg).catch((err) => console.error("[notify] SMS failed:", err));
  }

  return NextResponse.json({ comparisons, resultId });
}
