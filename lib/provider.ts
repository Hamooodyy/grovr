/**
 * lib/provider.ts — Data source toggle
 *
 * Set USE_SCRAPER=true in .env.local to route all store/pricing calls
 * through the Instacart scraper instead of the Kroger API.
 * Flip it back to false (or remove it) to restore the original behavior.
 *
 * API routes import from here instead of directly from kroger.ts or scraper.ts.
 */

const USE_SCRAPER = process.env.USE_SCRAPER === "true";

// ---------------------------------------------------------------------------
// Stores
// ---------------------------------------------------------------------------

export async function getNearbyStores(
  zipCode: string,
  radiusInMiles?: number,
  userId?: string
): ReturnType<typeof import("./kroger").getNearbyStores> {
  if (USE_SCRAPER) {
    const { getStores } = await import("./scraper");
    let cookies: string | null = null;
    if (userId) {
      const { getInstacartCookies } = await import("./instacart-session");
      cookies = await getInstacartCookies(userId);
    }
    return getStores(zipCode, radiusInMiles, cookies);
  }
  const { getNearbyStores: krogerGetNearbyStores } = await import("./kroger");
  return krogerGetNearbyStores(zipCode, radiusInMiles);
}

// ---------------------------------------------------------------------------
// Product pricing
// ---------------------------------------------------------------------------

export async function searchProduct(
  ...args: Parameters<typeof import("./kroger").searchProduct>
): ReturnType<typeof import("./kroger").searchProduct>;
export async function searchProduct(
  item: import("./types").GroceryItem,
  locationId: string,
  userId?: string
): ReturnType<typeof import("./kroger").searchProduct>;
export async function searchProduct(
  item: import("./types").GroceryItem,
  locationId: string,
  userId?: string
): ReturnType<typeof import("./kroger").searchProduct> {
  if (USE_SCRAPER) {
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
  const { searchProduct: krogerSearchProduct } = await import("./kroger");
  return krogerSearchProduct(item, locationId);
}

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export async function buildCartUrl(
  ...args: Parameters<typeof import("./scraper").buildCartUrl>
): Promise<string> {
  const { buildCartUrl: scraperBuildCartUrl } = await import("./scraper");
  return scraperBuildCartUrl(...args);
}

// Re-export everything else from kroger that the app uses directly
export {
  searchProducts,
  getKrogerAuthUrl,
  exchangeCodeForUserToken,
  refreshAccessToken,
  getValidKrogerToken,
  addToCart,
} from "./kroger";
export type { KrogerCartItem, KrogerUserTokens } from "./kroger";
