import { NextResponse } from "next/server";
import { searchProduct } from "@/lib/kroger";
import { compareRetailerPrices } from "@/lib/pricing";
import type { GroceryItem, Retailer } from "@/lib/types";

interface PricingRequestBody {
  items: GroceryItem[];
  stores: Retailer[];
}

export async function POST(request: Request) {
  let body: PricingRequestBody;

  try {
    body = (await request.json()) as PricingRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { items, stores } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
  }
  if (!Array.isArray(stores) || stores.length === 0) {
    return NextResponse.json({ error: "stores must be a non-empty array" }, { status: 400 });
  }

  try {
    // Fan out: search every item at every store in parallel
    const retailerMatches = await Promise.all(
      stores.map(async (store) => {
        const matches = await Promise.all(
          items.map((item) => searchProduct(item, store.id))
        );
        return { retailer: store, items: matches };
      })
    );

    const comparisons = compareRetailerPrices(retailerMatches);
    return NextResponse.json({ comparisons });
  } catch (err) {
    console.error("[api/pricing]", err);
    return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 });
  }
}
