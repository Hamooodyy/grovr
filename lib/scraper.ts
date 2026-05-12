/**
 * lib/scraper.ts
 *
 * Browserless-powered product price scraper (stub).
 *
 * Store discovery is handled by lib/google-places.ts.
 * Store configs (search URLs) live in lib/store-urls.ts.
 *
 * TODO: Implement Browserless integration to scrape each store's
 * own website for product prices.
 */

import type { GroceryItem, ProductMatch, Retailer } from "./types";

// ---------------------------------------------------------------------------
// Price cache
// ---------------------------------------------------------------------------

const PRICE_CACHE = new Map<string, { match: ProductMatch; expiresAt: number }>();
const PRICE_CACHE_TTL = 60 * 60 * 1_000; // 1 hour

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function scrapeProduct(
  item: GroceryItem,
  retailer: Retailer
): Promise<ProductMatch> {
  const cacheKey = `${retailer.id}:${item.name.toLowerCase().trim()}:${item.brandPref ?? ""}`;
  const cached = PRICE_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.match;

  // TODO: Replace with Browserless implementation
  console.warn(`[scraper] stub — no Browserless implementation yet for "${item.name}" @ ${retailer.id}`);
  const match: ProductMatch = {
    item,
    matchedName: item.name,
    price: 0,
    retailerId: retailer.id,
  };

  PRICE_CACHE.set(cacheKey, { match, expiresAt: Date.now() + PRICE_CACHE_TTL });
  return match;
}

export function buildCartUrl(retailer: Retailer): string {
  return retailer.storefrontUrl;
}
