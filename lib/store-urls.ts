/**
 * lib/store-urls.ts
 *
 * Source of truth for the 6 supported grocery chains.
 *
 * Pricing strategy:
 *   - All stores are priced by scraping their own websites via Browserless.
 *   - directSearchUrl: template URL for product search ({query} is replaced)
 *   - storefrontUrl: homepage link shown at checkout ("Shop at X")
 */

export interface StoreConfig {
  displayName: string;
  storefrontUrl: string;
  directSearchUrl: string;
}

export const STORE_CONFIGS: Record<string, StoreConfig> = {
  aldi: {
    displayName: "ALDI",
    storefrontUrl: "https://www.aldi.us",
    directSearchUrl: "https://www.aldi.us/store/aldi/s?k={query}",
  },
  wegmans: {
    displayName: "Wegmans",
    storefrontUrl: "https://www.wegmans.com",
    directSearchUrl: "https://www.wegmans.com/shop/search?query={query}",
  },
  target: {
    displayName: "Target",
    storefrontUrl: "https://www.target.com/c/grocery/-/N-5xt1a",
    directSearchUrl: "https://www.target.com/s?searchTerm={query}",
  },
  kroger: {
    displayName: "Kroger",
    storefrontUrl: "https://www.kroger.com",
    directSearchUrl: "https://www.kroger.com/search?query={query}",
  },
  safeway: {
    displayName: "Safeway",
    storefrontUrl: "https://www.safeway.com",
    directSearchUrl: "https://www.safeway.com/shop/search-results.html?q={query}",
  },
  "food lion": {
    displayName: "Food Lion",
    storefrontUrl: "https://www.foodlion.com",
    directSearchUrl: "https://www.foodlion.com/product-search/{query}",
  },
};

/**
 * Matches a Google Places display name to one of the supported chains.
 * Returns null for unrecognized chains.
 */
export function matchStoreConfig(
  placeName: string
): { key: string; config: StoreConfig } | null {
  const lower = placeName.toLowerCase();

  for (const [key, config] of Object.entries(STORE_CONFIGS)) {
    if (lower.includes(key)) return { key, config };
  }
  return null;
}
