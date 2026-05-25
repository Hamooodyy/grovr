import { desc, eq, and } from "drizzle-orm";
import { db } from "./index";
import { priceSnapshots } from "./schema";

interface CachedPrice {
  matchedName: string;
  matchedSize?: string;
  price: number;
  retailerId: string;
}

interface PriceLookupResult {
  cached: CachedPrice;
  ageHours: number;
}

/**
 * Look up the most recent price for an item at a retailer.
 * Returns null if no snapshot exists.
 */
export async function getPrice(
  retailerId: string,
  itemName: string,
  brandPref?: string
): Promise<PriceLookupResult | null> {
  try {
    const rows = await db
      .select()
      .from(priceSnapshots)
      .where(
        and(
          eq(priceSnapshots.retailerId, retailerId),
          eq(priceSnapshots.itemName, itemName.toLowerCase().trim()),
          eq(priceSnapshots.brandPref, brandPref ?? "")
        )
      )
      .orderBy(desc(priceSnapshots.scrapedAt))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    const ageMs = Date.now() - new Date(row.scrapedAt).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Discard prices older than 7 days
    if (ageHours > 168) return null;

    return {
      cached: {
        matchedName: row.matchedName,
        matchedSize: row.matchedSize ?? undefined,
        price: parseFloat(row.price),
        retailerId: row.retailerId,
      },
      ageHours,
    };
  } catch (err) {
    console.warn("[db/price-cache] getPrice failed:", err);
    return null;
  }
}

/**
 * Append a price snapshot. Fire-and-forget — callers should `.catch(() => {})`.
 */
export async function writePrice(
  retailerId: string,
  itemName: string,
  brandPref: string | undefined,
  matchedName: string,
  matchedSize: string | undefined,
  price: number
): Promise<void> {
  try {
    await db.insert(priceSnapshots).values({
      retailerId,
      itemName: itemName.toLowerCase().trim(),
      brandPref: brandPref ?? "",
      matchedName,
      matchedSize: matchedSize ?? null,
      price: price.toFixed(2),
    });
  } catch (err) {
    console.warn("[db/price-cache] writePrice failed:", err);
  }
}
