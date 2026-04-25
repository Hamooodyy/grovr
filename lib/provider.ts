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
  radiusInMiles?: number
): ReturnType<typeof import("./kroger").getNearbyStores> {
  if (USE_SCRAPER) {
    const { getStores } = await import("./scraper");
    return getStores(zipCode, radiusInMiles);
  }
  const { getNearbyStores: krogerGetNearbyStores } = await import("./kroger");
  return krogerGetNearbyStores(zipCode, radiusInMiles);
}

// ---------------------------------------------------------------------------
// Product pricing
// ---------------------------------------------------------------------------

export async function searchProduct(
  ...args: Parameters<typeof import("./kroger").searchProduct>
): ReturnType<typeof import("./kroger").searchProduct> {
  if (USE_SCRAPER) {
    const { scrapeProduct } = await import("./scraper");
    const [item, locationId] = args;
    // scrapeProduct needs a Retailer object; reconstruct a minimal one from
    // the locationId (which is a store slug when coming from the scraper path)
    return scrapeProduct(item, {
      id: locationId,
      name: locationId,
      logoUrl: "",
      postalCode: "",
    });
  }
  const { searchProduct: krogerSearchProduct } = await import("./kroger");
  return krogerSearchProduct(...args);
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
