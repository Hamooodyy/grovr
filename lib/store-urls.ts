/**
 * lib/store-urls.ts
 *
 * Source of truth for the 6 supported grocery chains.
 *
 * Pricing strategy:
 *   - All stores are priced via Instacart's store-specific search pages,
 *     scraped through Browserless (cloud headless browser).
 *   - instacartSlug: used for instacart.com/store/{slug}/s?k={query}
 *   - storefrontUrl: homepage link shown at checkout ("Shop at X")
 */

export interface StoreConfig {
  displayName: string;
  storefrontUrl: string;
  instacartSlug: string;
}

export const STORE_CONFIGS: Record<string, StoreConfig> = {
  aldi: {
    displayName: "ALDI",
    storefrontUrl: "https://www.aldi.us",
    instacartSlug: "aldi",
  },
  wegmans: {
    displayName: "Wegmans",
    storefrontUrl: "https://www.wegmans.com",
    instacartSlug: "wegmans",
  },
  target: {
    displayName: "Target",
    storefrontUrl: "https://www.target.com/c/grocery/-/N-5xt1a",
    instacartSlug: "target",
  },
  kroger: {
    displayName: "Kroger",
    storefrontUrl: "https://www.kroger.com",
    instacartSlug: "kroger",
  },
  safeway: {
    displayName: "Safeway",
    storefrontUrl: "https://www.safeway.com",
    instacartSlug: "safeway",
  },
  "food lion": {
    displayName: "Food Lion",
    storefrontUrl: "https://www.foodlion.com",
    instacartSlug: "food-lion",
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
