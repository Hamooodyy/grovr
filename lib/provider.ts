/**
 * lib/provider.ts — Data source router
 *
 * Store discovery uses Google Places API (lib/google-places.ts).
 * Product pricing uses Browserless scraping (lib/scraper.ts).
 * API routes import from here exclusively.
 */

import type { GroceryItem, ProductMatch, Retailer } from "./types";

export async function getNearbyStores(
  zipCode: string,
  radiusInMiles?: number
): Promise<Retailer[]> {
  const { getNearbyGroceryStores } = await import("./google-places");
  return getNearbyGroceryStores(zipCode, radiusInMiles);
}

export async function searchProduct(
  item: GroceryItem,
  store: Retailer
): Promise<ProductMatch> {
  const { scrapeProduct } = await import("./scraper");
  return scrapeProduct(item, store);
}

export async function buildCartUrl(retailer: Retailer): Promise<string> {
  return retailer.storefrontUrl;
}
