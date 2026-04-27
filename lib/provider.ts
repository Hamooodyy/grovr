/**
 * lib/provider.ts — Data source router
 *
 * All store discovery and product pricing go through the Instacart scraper.
 * The Kroger API path is kept for reference but is no longer the active flow.
 *
 * API routes import from here — never directly from kroger.ts or scraper.ts.
 */

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export async function getNearbyStores(
  zipCode: string,
  radiusInMiles?: number,
  userId?: string
): ReturnType<typeof import("./kroger").getNearbyStores> {
  const { getStores } = await import("./scraper");
  let cookies: string | null = null;
  if (userId) {
    const { getInstacartCookies } = await import("./instacart-session");
    cookies = await getInstacartCookies(userId);
  }
  return getStores(zipCode, radiusInMiles, cookies);
}

// ---------------------------------------------------------------------------
// Product pricing
// ---------------------------------------------------------------------------

export async function searchProduct(
  item: import("./types").GroceryItem,
  locationId: string,
  userId?: string
): ReturnType<typeof import("./kroger").searchProduct> {
  const { scrapeProduct } = await import("./scraper");
  let cookies: string | null = null;
  if (userId) {
    const { getInstacartCookies } = await import("./instacart-session");
    cookies = await getInstacartCookies(userId);
  }
  return scrapeProduct(
    item,
    { id: locationId, name: locationId, logoUrl: "", postalCode: "" },
    cookies
  );
}

// ---------------------------------------------------------------------------
// Cart URL
// ---------------------------------------------------------------------------

export async function buildCartUrl(
  ...args: Parameters<typeof import("./scraper").buildCartUrl>
): Promise<string> {
  const { buildCartUrl: scraperBuildCartUrl } = await import("./scraper");
  return scraperBuildCartUrl(...args);
}

// Re-export Kroger utilities that other parts of the app still reference
export {
  searchProducts,
  getKrogerAuthUrl,
  exchangeCodeForUserToken,
  refreshAccessToken,
  getValidKrogerToken,
  addToCart,
} from "./kroger";
export type { KrogerCartItem, KrogerUserTokens } from "./kroger";
