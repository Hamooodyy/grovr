/**
 * lib/scraper.ts — Proof of Concept
 *
 * Strategy:
 *   1. Launch one Playwright browser session to obtain valid Instacart
 *      cookies (bot-detection bypass happens here, once).
 *   2. Reuse those cookies for all subsequent fetch() calls — no per-request
 *      browser overhead. 5 items × 5 stores = 25 fast HTTP calls, not 25 page loads.
 *   3. Session is cached for 30 minutes; browser is a singleton.
 *   4. Falls back to labeled mock data when scraping fails so the rest of
 *      the UI still works during development.
 */

import { chromium, Browser } from "playwright";
import type { GroceryItem, ProductMatch, Retailer } from "./types";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ---------------------------------------------------------------------------
// Browser singleton — one instance shared across all requests
// ---------------------------------------------------------------------------

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser?.isConnected()) return _browser;
  _browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  return _browser;
}

// ---------------------------------------------------------------------------
// Session — one Playwright page load gets cookies; everything else uses fetch
// ---------------------------------------------------------------------------

interface ScraperSession {
  cookieHeader: string;
  expiresAt: number;
}

let _session: ScraperSession | null = null;

async function getSession(): Promise<ScraperSession> {
  if (_session && Date.now() < _session.expiresAt) return _session;

  console.log("[scraper] Establishing Instacart session…");
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: UA, locale: "en-US" });
  const page = await context.newPage();

  try {
    await page.goto("https://www.instacart.com", {
      waitUntil: "networkidle",
      timeout: 25_000,
    });
    // Let any JS-triggered cookie writes settle
    await page.waitForTimeout(1_500);
  } finally {
    const cookies = await context.cookies();
    await context.close();

    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    // Cache session for 30 minutes
    _session = { cookieHeader, expiresAt: Date.now() + 30 * 60 * 1_000 };
    console.log("[scraper] Session established, cookie count:", cookies.length);
  }

  return _session!;
}

/** Base headers reused for every Instacart API call */
async function sessionHeaders(): Promise<Record<string, string>> {
  const { cookieHeader } = await getSession();
  return {
    "User-Agent": UA,
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    Cookie: cookieHeader,
    "X-Requested-With": "XMLHttpRequest",
  };
}

// ---------------------------------------------------------------------------
// Store discovery
// ---------------------------------------------------------------------------

const STORE_CACHE = new Map<string, { stores: Retailer[]; expiresAt: number }>();
const STORE_CACHE_TTL = 60 * 60 * 1_000; // 1 hour

/**
 * Returns up to 6 Instacart-supported retailers near the given ZIP code.
 * Tries two known Instacart API endpoints; falls back to a static list if
 * both fail (e.g. bot detection triggered on first run).
 */
export async function getStores(
  zip: string,
  _radiusInMiles = 10
): Promise<Retailer[]> {
  const cached = STORE_CACHE.get(zip);
  if (cached && Date.now() < cached.expiresAt) return cached.stores;

  try {
    const headers = await sessionHeaders();

    // Instacart returns nearby retailers scoped to a ZIP via this endpoint.
    // The response shape has changed over time — we probe two paths.
    const res = await fetch(
      `https://www.instacart.com/v3/retailers?zip_code=${zip}&per_page=8`,
      { headers }
    );

    if (res.ok) {
      const json = (await res.json()) as Record<string, unknown>;

      // Instacart has used several shapes; try the known ones
      const raw =
        (json?.retailers as unknown[]) ??
        ((json?.data as Record<string, unknown>)?.retailers as unknown[]) ??
        [];

      if (raw.length > 0) {
        const stores = raw.slice(0, 6).map((r) => {
          const retailer = r as Record<string, unknown>;
          const coords = retailer.coordinates as
            | Record<string, number>
            | undefined;
          return {
            id: String(
              retailer.slug ?? retailer.id ?? retailer.warehouse_id ?? "unknown"
            ),
            name: String(retailer.name ?? "Unknown"),
            logoUrl: String(retailer.logo_url ?? ""),
            postalCode: zip,
            lat: coords?.latitude,
            lng: coords?.longitude,
          } satisfies Retailer;
        });

        STORE_CACHE.set(zip, { stores, expiresAt: Date.now() + STORE_CACHE_TTL });
        console.log(`[scraper] getStores(${zip}) → ${stores.length} stores from API`);
        return stores;
      }
    } else {
      console.warn("[scraper] Retailer API returned", res.status, "— falling back");
    }
  } catch (err) {
    console.warn("[scraper] getStores error:", err);
  }

  // Fallback — static list of common Instacart-supported retailers.
  // These slugs match Instacart's store URL format.
  const fallback = buildFallbackStores(zip);
  STORE_CACHE.set(zip, { stores: fallback, expiresAt: Date.now() + STORE_CACHE_TTL });
  console.log(`[scraper] getStores(${zip}) → fallback list`);
  return fallback;
}

function buildFallbackStores(zip: string): Retailer[] {
  return [
    { id: "kroger",       name: "Kroger",       logoUrl: "", postalCode: zip },
    { id: "safeway",      name: "Safeway",       logoUrl: "", postalCode: zip },
    { id: "costco",       name: "Costco",        logoUrl: "", postalCode: zip },
    { id: "target",       name: "Target",        logoUrl: "", postalCode: zip },
    { id: "aldi",         name: "ALDI",          logoUrl: "", postalCode: zip },
    { id: "whole-foods",  name: "Whole Foods",   logoUrl: "", postalCode: zip },
  ];
}

// ---------------------------------------------------------------------------
// Product pricing
// ---------------------------------------------------------------------------

const PRICE_CACHE = new Map<string, { match: ProductMatch; expiresAt: number }>();
const PRICE_CACHE_TTL = 60 * 60 * 1_000; // 1 hour

/**
 * Returns the best price match for a single item at a given retailer.
 * Intercepts Instacart's internal items search API.
 * Returns price = 0 when the item is unavailable or scraping fails.
 */
export async function scrapeProduct(
  item: GroceryItem,
  retailer: Retailer
): Promise<ProductMatch> {
  const key = `${retailer.id}:${item.name.toLowerCase().trim()}`;
  const cached = PRICE_CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.match;

  const match = await fetchProductPrice(item, retailer);
  PRICE_CACHE.set(key, { match, expiresAt: Date.now() + PRICE_CACHE_TTL });
  return match;
}

async function fetchProductPrice(
  item: GroceryItem,
  retailer: Retailer
): Promise<ProductMatch> {
  try {
    const headers = await sessionHeaders();
    const term = encodeURIComponent(item.name.trim());

    // Instacart's product search endpoint — scoped to a specific retailer slug
    const res = await fetch(
      `https://www.instacart.com/v3/containers/${retailer.id}/items_v2` +
        `?term=${term}&source=search&per_page=1`,
      { headers }
    );

    if (!res.ok) {
      console.warn(
        `[scraper] items API returned ${res.status} for "${item.name}" @ ${retailer.id}`
      );
      return noMatch(item, retailer.id);
    }

    const json = (await res.json()) as Record<string, unknown>;

    // Instacart wraps results in a nested structure; probe all known shapes
    const items: unknown[] =
      (json?.items as unknown[]) ??
      ((json?.data as Record<string, unknown>)?.items as unknown[]) ??
      ((
        (json?.data as Record<string, unknown>)
          ?.body as Array<Record<string, unknown>>
      )?.[0]?.view as Record<string, unknown>)?.items as unknown[] ??
      [];

    const first = items[0] as Record<string, unknown> | undefined;
    if (!first) return noMatch(item, retailer.id);

    const matchedName = String(first.name ?? item.name);
    const productId = String(first.id ?? "");

    // Price may be a number, a "$X.XX" string, or nested in attributes
    const priceRaw =
      first.price ??
      (first.attributes as Record<string, unknown> | undefined)?.price ??
      first.price_string;

    let price = 0;
    if (typeof priceRaw === "number") {
      price = priceRaw;
    } else if (typeof priceRaw === "string") {
      price = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));
    }

    if (isNaN(price)) price = 0;

    console.log(
      `[scraper] "${item.name}" @ ${retailer.id} → "${matchedName}" $${price}`
    );

    return { item, matchedName, price, upc: productId || undefined, retailerId: retailer.id };
  } catch (err) {
    console.warn(`[scraper] fetchProductPrice error for "${item.name}":`, err);
    return noMatch(item, retailer.id);
  }
}

function noMatch(item: GroceryItem, retailerId: string): ProductMatch {
  return { item, matchedName: item.name, price: 0, retailerId };
}

// ---------------------------------------------------------------------------
// Cart link — no auth required; user completes checkout on the retailer site
// ---------------------------------------------------------------------------

/**
 * Returns a URL that sends the user to complete their order.
 * Where a cart pre-fill URL format is known it is used; otherwise falls
 * back to the retailer's Instacart store page.
 *
 * Instacart Partner API (requires a separate partner account) would allow
 * full cart pre-population — this is the upgrade path once the PoC validates.
 */
export function buildCartUrl(
  retailer: Retailer,
  items: ProductMatch[]
): string {
  const slug = retailer.id.toLowerCase();
  const availableItems = items.filter((m) => m.price > 0);

  // Walmart supports cart pre-fill via query string item IDs
  if (slug === "walmart") {
    const params = availableItems
      .filter((m) => m.upc)
      .map((m) => `items[]=${encodeURIComponent(m.upc!)}`)
      .join("&");
    return params
      ? `https://www.walmart.com/cart?${params}`
      : "https://www.walmart.com";
  }

  // For all other retailers, link to their Instacart store page.
  // The user lands on the store and can search/add items manually,
  // or this gets upgraded to a Partner API cart link.
  return `https://www.instacart.com/store/${slug}`;
}
