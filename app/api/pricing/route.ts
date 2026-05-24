import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/provider";
import { compareRetailerPrices } from "@/lib/pricing";
import { kvSet, RESULTS_PREFIX } from "@/lib/kv";
import { sendSMS } from "@/lib/twilio";
import type { GroceryItem, Retailer, StoredResults } from "@/lib/types";

export const maxDuration = 60; // fallback for cold cache; most items pre-cached via /api/warm-cache

interface PricingRequestBody {
  items: GroceryItem[];
  stores: Retailer[];
  phone?: string;
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

  try {
    // Scrape stores sequentially to avoid Browserless rate limits.
    // Most items should be pre-cached via /api/warm-cache.
    const retailerMatches = [];
    for (const store of stores) {
      const matches = await searchProducts(sanitizedItems, store);
      retailerMatches.push({ retailer: store, items: matches });
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
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://grovr.com";
      const msg = [
        `Grovr found your best deal!`,
        `${cheapest.retailer.name} has your ${sanitizedItems.length} item${sanitizedItems.length !== 1 ? "s" : ""} for $${cheapest.subtotal.toFixed(2)}.`,
        `View results: ${baseUrl}/results/${resultId}`,
      ].join(" ");
      sendSMS(phone, msg).catch((err) => console.error("[notify] SMS failed:", err));
    }

    return NextResponse.json({ comparisons, resultId });
  } catch (err) {
    console.error("[api/pricing]", err);
    return NextResponse.json(
      { error: "Failed to fetch pricing" },
      { status: 500 }
    );
  }
}
