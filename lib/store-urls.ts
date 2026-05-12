/**
 * lib/store-urls.ts
 *
 * Source of truth for supported grocery chains.
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
  walmart: {
    displayName: "Walmart",
    storefrontUrl: "https://www.walmart.com/cp/food/976759",
    instacartSlug: "walmart",
  },
publix: {
    displayName: "Publix",
    storefrontUrl: "https://www.publix.com",
    instacartSlug: "publix",
  },
  "h-e-b": {
    displayName: "H-E-B",
    storefrontUrl: "https://www.heb.com",
    instacartSlug: "h-e-b",
  },
  giant: {
    displayName: "Giant",
    storefrontUrl: "https://giantfood.com",
    instacartSlug: "giant",
  },
  "stop & shop": {
    displayName: "Stop & Shop",
    storefrontUrl: "https://stopandshop.com",
    instacartSlug: "stop-and-shop",
  },
  costco: {
    displayName: "Costco",
    storefrontUrl: "https://www.costco.com",
    instacartSlug: "costco",
  },
  "sam's club": {
    displayName: "Sam's Club",
    storefrontUrl: "https://www.samsclub.com",
    instacartSlug: "sams-club",
  },
"harris teeter": {
    displayName: "Harris Teeter",
    storefrontUrl: "https://www.harristeeter.com",
    instacartSlug: "harristeeter",
  },
};

/**
 * Extra aliases for chains whose Google Places names don't always
 * contain the STORE_CONFIGS key verbatim.
 */
const ALIASES: Record<string, string> = {
  heb: "h-e-b",
  "stop and shop": "stop & shop",
  stopandshop: "stop & shop",
  "sam's club": "sam's club",
  samsclub: "sam's club",
  "sams club": "sam's club",
  "harris teeter": "harris teeter",
  harristeeter: "harris teeter",
};

/**
 * Matches a Google Places display name to one of the supported chains.
 * Returns null for unrecognized chains.
 */
export function matchStoreConfig(
  placeName: string
): { key: string; config: StoreConfig } | null {
  const lower = placeName.toLowerCase();

  // Direct match against config keys
  for (const [key, config] of Object.entries(STORE_CONFIGS)) {
    if (lower.includes(key)) return { key, config };
  }

  // Try aliases
  for (const [alias, key] of Object.entries(ALIASES)) {
    if (lower.includes(alias)) {
      const config = STORE_CONFIGS[key];
      if (config) return { key, config };
    }
  }

  return null;
}
