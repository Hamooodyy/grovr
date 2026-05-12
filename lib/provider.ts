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

/**
 * Scrape all items at a single store in one browser session.
 * More efficient than calling searchProduct per item — avoids
 * opening multiple Browserless connections.
 */
export async function searchProducts(
  items: GroceryItem[],
  store: Retailer
): Promise<ProductMatch[]> {
  const { scrapeProducts } = await import("./scraper");
  return scrapeProducts(items, store);
}

export async function buildCartUrl(retailer: Retailer): Promise<string> {
  return retailer.storefrontUrl;
}
