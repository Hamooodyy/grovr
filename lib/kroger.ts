import type { GroceryItem, ProductMatch, ProductSuggestion, Retailer } from "./types";

const BASE_URL = "https://api-ce.kroger.com/v1";
const CLIENT_ID = process.env.KROGER_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.KROGER_CLIENT_SECRET ?? "";
const REDIRECT_URI =
  process.env.KROGER_REDIRECT_URI ??
  "http://localhost:3000/api/auth/kroger/callback";

// ---------------------------------------------------------------------------
// Client-credentials token (used for Locations + Products — no user needed)
// ---------------------------------------------------------------------------

interface TokenCache {
  token: string;
  expiresAt: number;
}

let clientTokenCache: TokenCache | null = null;

async function getClientToken(): Promise<string> {
  if (clientTokenCache && Date.now() < clientTokenCache.expiresAt) {
    return clientTokenCache.token;
  }

  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const res = await fetch(`${BASE_URL}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });

  if (!res.ok) throw new Error(`Kroger token request failed: ${res.status}`);

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Subtract 60 s to avoid using a token right as it expires
  clientTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

// ---------------------------------------------------------------------------
// Locations — nearby Kroger-family stores
// ---------------------------------------------------------------------------

/**
 * Returns up to 5 Kroger-family stores near the given ZIP code.
 * Falls back to mock data when KROGER_CLIENT_ID is not set.
 */
export async function getNearbyStores(
  zipCode: string,
  radiusInMiles = 10
): Promise<Retailer[]> {
  if (!CLIENT_ID) {
    return [
      { id: "70100942", name: "Kroger", logoUrl: "", postalCode: zipCode },
      { id: "70100701", name: "Fred Meyer", logoUrl: "", postalCode: zipCode },
      { id: "70200116", name: "Ralphs", logoUrl: "", postalCode: zipCode },
    ];
  }

  const token = await getClientToken();
  const params = new URLSearchParams({
    "filter.zipCode.near": zipCode,
    "filter.limit.total": "5",
    "filter.radiusInMiles": String(radiusInMiles),
  });

  const res = await fetch(`${BASE_URL}/locations?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`getNearbyStores failed: ${res.status}`);

  const data = (await res.json()) as {
    data: Array<{
      locationId: string;
      name: string;
      address: { zipCode: string };
      geolocation?: { latitude: number; longitude: number };
    }>;
  };

  return data.data.map((loc) => ({
    id: loc.locationId,
    name: loc.name,
    logoUrl: "",
    postalCode: loc.address.zipCode,
    lat: loc.geolocation?.latitude,
    lng: loc.geolocation?.longitude,
  }));
}

// ---------------------------------------------------------------------------
// Product autocomplete — returns suggestions with images for the search UI
// ---------------------------------------------------------------------------

/**
 * Returns up to 6 product suggestions matching the given term.
 * Optionally scoped to a store location for availability context.
 */
export async function searchProducts(
  term: string,
  locationId?: string
): Promise<ProductSuggestion[]> {
  if (!CLIENT_ID) return [];

  const token = await getClientToken();
  const params = new URLSearchParams({
    "filter.term": term,
    "filter.limit": "10",
  });
  if (locationId) params.set("filter.locationId", locationId);

  const res = await fetch(`${BASE_URL}/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as {
    data: Array<{
      productId: string;
      upc?: string;
      description: string;
      brand?: string;
      images?: Array<{
        perspective: string;
        sizes: Array<{ size: string; url: string }>;
      }>;
      items?: Array<{ size?: string }>;
    }>;
  };

  return data.data.map((p) => {
    const front = p.images?.find((img) => img.perspective === "front");
    const thumbnail = front?.sizes.find((s) => s.size === "thumbnail")?.url;
    return {
      productId: p.productId,
      upc: p.upc ?? p.productId,
      name: p.description,
      brand: p.brand,
      size: p.items?.[0]?.size,
      imageUrl: thumbnail,
    };
  });
}

// ---------------------------------------------------------------------------
// Products — search + pricing per location
// ---------------------------------------------------------------------------

const PRODUCT_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const PRODUCT_CACHE_MAX_SIZE = 500; // evict when we exceed this many entries

interface ProductCacheEntry {
  value: ProductMatch;
  expiresAt: number;
}

const productCache = new Map<string, ProductCacheEntry>();

/** Removes expired entries; if still over the size limit, drops oldest entries. */
function evictProductCache() {
  const now = Date.now();
  for (const [key, entry] of productCache) {
    if (now >= entry.expiresAt) productCache.delete(key);
  }
  // If still too large, drop from the front (oldest insertions)
  if (productCache.size > PRODUCT_CACHE_MAX_SIZE) {
    const excess = productCache.size - PRODUCT_CACHE_MAX_SIZE;
    let removed = 0;
    for (const key of productCache.keys()) {
      productCache.delete(key);
      if (++removed >= excess) break;
    }
  }
}

/**
 * Returns the best product match and price for an item at a given store.
 * Results are cached for up to 1 hour. Falls back to mock data when
 * KROGER_CLIENT_ID is not set.
 */
export async function searchProduct(
  item: GroceryItem,
  locationId: string
): Promise<ProductMatch> {
  const key = `${locationId}:${item.name.toLowerCase().trim()}`;
  const cached = productCache.get(key);

  if (cached && Date.now() < cached.expiresAt) {
    return cached.value;
  }

  const result = await fetchProduct(item, locationId);
  if (productCache.size >= PRODUCT_CACHE_MAX_SIZE) evictProductCache();
  productCache.set(key, {
    value: result,
    expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS,
  });
  return result;
}

async function fetchProduct(
  item: GroceryItem,
  locationId: string
): Promise<ProductMatch> {
  if (!CLIENT_ID) {
    return {
      item,
      matchedName: item.name,
      // Randomized stub so retailer comparisons are non-trivial in dev
      price: parseFloat((Math.random() * 8 + 1).toFixed(2)),
      retailerId: locationId,
    };
  }

  const token = await getClientToken();
  // If the item was selected from autocomplete its UPC is known — use exact
  // product ID lookup instead of fuzzy term search for accurate pricing.
  const params = new URLSearchParams(
    item.upc
      ? { "filter.productId": item.upc, "filter.locationId": locationId, "filter.limit": "1" }
      : { "filter.term": item.name, "filter.locationId": locationId, "filter.limit": "1" }
  );

  const res = await fetch(`${BASE_URL}/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    // Treat transient server errors as "not found" rather than crashing the whole request
    if (res.status >= 500) {
      return { item, matchedName: item.name, price: 0, retailerId: locationId };
    }
    throw new Error(`searchProduct failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    data: Array<{
      productId: string;
      description: string;
      items: Array<{
        price?: { regular: number; promo?: number };
      }>;
    }>;
  };

  if (!data.data.length || !data.data[0].items.length) {
    // Item not found at this location — price 0 signals unavailable
    return { item, matchedName: item.name, price: 0, retailerId: locationId };
  }

  const product = data.data[0];
  const itemData = product.items[0];
  // price may be absent in the certification environment for some products
  const priceObj = itemData.price;
  if (!priceObj) {
    return { item, matchedName: product.description, price: 0, retailerId: locationId };
  }
  const price = priceObj.promo ?? priceObj.regular;

  return {
    item,
    matchedName: product.description,
    price,
    upc: product.productId,
    retailerId: locationId,
  };
}

// ---------------------------------------------------------------------------
// Cart OAuth — user authorization + cart write
// ---------------------------------------------------------------------------

/**
 * Returns the Kroger OAuth authorization URL. Redirect the user here to
 * grant cart:write permission.
 */
export function getKrogerAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "cart.basic:write",
  });
  return `${BASE_URL}/connect/oauth2/authorize?${params}`;
}

export interface KrogerUserTokens {
  accessToken: string;
  refreshToken: string;
  /** Unix timestamp (ms) after which the access token should be refreshed */
  expiresAt: number;
}

/**
 * Shared helper — posts to the Kroger OAuth token endpoint with Basic auth.
 * Pass any grant-type-specific params; returns parsed token fields.
 */
async function fetchUserToken(
  params: Record<string, string>
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

  const res = await fetch(`${BASE_URL}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });

  if (!res.ok) throw new Error(`Kroger token request failed: ${res.status}`);

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }>;
}

/**
 * Exchanges an authorization code for user tokens.
 * Returns the access token, refresh token, and expiry timestamp.
 */
export async function exchangeCodeForUserToken(
  code: string
): Promise<KrogerUserTokens> {
  const data = await fetchUserToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
  });

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
}

/**
 * Uses a refresh token to silently obtain a new access token.
 * Call this when the stored access token is expired.
 */
export async function refreshAccessToken(
  refreshToken: string
): Promise<KrogerUserTokens> {
  const data = await fetchUserToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  return {
    accessToken: data.access_token,
    // Kroger may rotate the refresh token — always use the latest one
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
}

// ---------------------------------------------------------------------------
// Token management — Clerk privateMetadata integration
// ---------------------------------------------------------------------------

/**
 * Retrieves a valid Kroger user access token for the given Clerk user.
 * If the stored token is expired it is silently refreshed and the new
 * tokens are written back to Clerk privateMetadata.
 *
 * Throws if the user has never authorized Kroger access.
 */
export async function getValidKrogerToken(userId: string): Promise<string> {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as Partial<KrogerUserTokens>;

  if (!meta.accessToken || !meta.refreshToken) {
    throw new Error("KROGER_AUTH_REQUIRED");
  }

  // Access token still valid — return it directly
  if (meta.expiresAt && Date.now() < meta.expiresAt) {
    return meta.accessToken;
  }

  // Access token expired — refresh silently
  const refreshed = await refreshAccessToken(meta.refreshToken);
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: refreshed.expiresAt,
    },
  });

  return refreshed.accessToken;
}

export interface KrogerCartItem {
  upc: string;
  quantity: number;
}

/**
 * Adds items to the authenticated user's Kroger cart.
 * Requires a user access token obtained via the authorization_code flow.
 */
export async function addToCart(
  userToken: string,
  items: KrogerCartItem[]
): Promise<void> {
  const res = await fetch(`${BASE_URL}/cart/add`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: items.map(({ upc, quantity }) => ({
        upc,
        quantity,
        modality: "PICKUP",
      })),
    }),
  });

  if (!res.ok) throw new Error(`addToCart failed: ${res.status}`);
}
