import type { GroceryItem, ProductMatch } from "./types";

// TODO: verify base URL with Foodspark docs before Phase 7
const BASE_URL = "https://api.foodspark.io/v1";
const API_KEY = process.env.FOODSPARK_API_KEY ?? "";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  value: ProductMatch;
  expiresAt: number;
}

const priceCache = new Map<string, CacheEntry>();

/**
 * Returns the best product match and price for an item at a given retailer.
 * Results are cached for up to 1 hour. Falls back to mock data when
 * FOODSPARK_API_KEY is not set.
 */
export async function searchProduct(
  item: GroceryItem,
  retailerId: string
): Promise<ProductMatch> {
  const key = `${retailerId}:${item.name.toLowerCase().trim()}`;
  const cached = priceCache.get(key);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const result = await fetchProduct(item, retailerId);
  priceCache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

async function fetchProduct(
  item: GroceryItem,
  retailerId: string
): Promise<ProductMatch> {
  if (!API_KEY) {
    return {
      item,
      matchedName: item.name,
      // Randomized stub price so retailer comparisons are non-trivial in dev
      price: parseFloat((Math.random() * 8 + 1).toFixed(2)),
      retailerId,
    };
  }

  const params = new URLSearchParams({
    query: item.name,
    retailer_id: retailerId,
  });

  const res = await fetch(`${BASE_URL}/products/search?${params}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error(`searchProduct failed: ${res.status}`);

  // TODO: map actual response shape once Foodspark docs confirmed
  const data = (await res.json()) as {
    products: Array<{ name: string; price: number }>;
  };

  return {
    item,
    matchedName: data.products[0].name,
    price: data.products[0].price,
    retailerId,
  };
}
