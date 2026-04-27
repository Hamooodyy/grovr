import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildCartUrl } from "@/lib/provider";
import type { Retailer, ProductMatch } from "@/lib/types";

const USE_SCRAPER = process.env.USE_SCRAPER === "true";

interface ScraperCartBody {
  retailer: Retailer;
  items: ProductMatch[];
}

interface KrogerCartBody {
  items: Array<{ upc: string; quantity: number }>;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: ScraperCartBody | KrogerCartBody;
  try {
    body = (await request.json()) as ScraperCartBody | KrogerCartBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Scraper path — return a cart deep link; user completes checkout on retailer site
  if (USE_SCRAPER) {
    const { retailer, items } = body as ScraperCartBody;
    if (!retailer || !Array.isArray(items)) {
      return NextResponse.json({ error: "retailer and items are required" }, { status: 400 });
    }
    const url = await buildCartUrl(retailer, items);
    return NextResponse.json({ cartUrl: url });
  }

  // Kroger path — original OAuth cart write
  const { getValidKrogerToken, addToCart } = await import("@/lib/kroger");
  const { items } = body as KrogerCartBody;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
  }
  try {
    const userToken = await getValidKrogerToken(userId);
    await addToCart(userToken, items);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "KROGER_AUTH_REQUIRED") {
      return NextResponse.json({ error: "KROGER_AUTH_REQUIRED" }, { status: 401 });
    }
    console.error("[api/cart]", err);
    return NextResponse.json({ error: "Failed to add items to cart" }, { status: 500 });
  }
}
