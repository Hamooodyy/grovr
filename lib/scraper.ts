/**
 * lib/scraper.ts — Proof of Concept (v2)
 *
 * Previous approach (session-cookie): navigated to instacart.com homepage,
 * grabbed cookies, then called internal APIs directly. Failed because:
 *   - instacart.com never reaches networkidle (constant polling)
 *   - Their API requires dynamic auth tokens, not just cookies
 *
 * New approach (full page interception + stealth):
 *   - playwright-extra + stealth plugin masks headless browser fingerprint
 *   - Navigate directly to the search URL for each item/store
 *   - Intercept the XHR response the page fires — real data, no cookie games
 *   - waitUntil: "domcontentloaded" avoids the networkidle timeout
 *   - Store discovery uses geocoded fallback (map works; Instacart store
 *     detection is a future upgrade via their Partner API)
 */

import { chromium } from "playwright";
import type { GroceryItem, ProductMatch, Retailer } from "./types";

// Stealth init script — injected into every page before any JS runs.
// Covers the most common headless-browser detection vectors without
// needing playwright-extra (which has puppeteer plugin compatibility issues).
const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  window.chrome = { runtime: {} };
  Object.defineProperty(navigator, 'permissions', {
    get: () => ({ query: () => Promise.resolve({ state: 'granted' }) }),
  });
`;

// ---------------------------------------------------------------------------
// ZIP geocoding — Nominatim (no API key, same service used by the map)
// ---------------------------------------------------------------------------

interface ZipCoords { lat: number; lng: number }

const geocodeCache = new Map<string, ZipCoords>();

async function geocodeZip(zip: string): Promise<ZipCoords | null> {
  if (geocodeCache.has(zip)) return geocodeCache.get(zip)!;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&limit=1`,
      { headers: { "User-Agent": "Grovr/1.0 (grocery price comparison app)" } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    geocodeCache.set(zip, coords);
    return coords;
  } catch {
    return null;
  }
}

// Long-lived cache — store coordinates don't change
const storeGeocodeCache = new Map<string, ZipCoords | null>();

async function geocodeStore(
  name: string,
  zip: string,
  center: ZipCoords | null
): Promise<ZipCoords | null> {
  const key = `${name}__${zip}`;
  if (storeGeocodeCache.has(key)) return storeGeocodeCache.get(key)!;
  try {
    // Strategy 1: viewbox-constrained search (most reliable when we have the ZIP center)
    if (center) {
      const delta = 0.15; // ~10 mile bounding box
      const viewbox = `${center.lng - delta},${center.lat + delta},${center.lng + delta},${center.lat - delta}`;
      const url =
        `https://nominatim.openstreetmap.org/search` +
        `?q=${encodeURIComponent(name)}&format=json&limit=1&bounded=1&viewbox=${viewbox}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Grovr/1.0 (grocery price comparison app)" },
      });
      if (res.ok) {
        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data.length) {
          const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
          storeGeocodeCache.set(key, coords);
          return coords;
        }
      }
    }

    // Strategy 2: free-text fallback "Store Name ZIP US"
    const q = encodeURIComponent(`${name} ${zip} US`);
    const res2 = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
      { headers: { "User-Agent": "Grovr/1.0 (grocery price comparison app)" } }
    );
    if (res2.ok) {
      const data2 = (await res2.json()) as Array<{ lat: string; lon: string }>;
      const coords = data2.length
        ? { lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) }
        : null;
      storeGeocodeCache.set(key, coords);
      return coords;
    }

    storeGeocodeCache.set(key, null);
    return null;
  } catch {
    storeGeocodeCache.set(key, null);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Distance filtering
// ---------------------------------------------------------------------------

/** Returns distance in miles between two lat/lng points (Haversine formula). */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Store discovery — OpenStreetMap Overpass API
// ---------------------------------------------------------------------------

const STORE_CACHE = new Map<string, { stores: Retailer[]; expiresAt: number }>();
const STORE_CACHE_TTL = 60 * 60 * 1_000;

// Instacart-verified chains only — OSM store name → Instacart slug.
// Only chains confirmed to support Instacart ordering are listed here.
// Notably excluded:
//   - Trader Joe's: no online ordering on any platform (company policy)
//   - Lidl: not on Instacart
//   - Amazon Fresh / Whole Foods via Amazon: separate Amazon ordering flow
const SLUG_MAP: Record<string, string> = {
  // Kroger family
  "kroger":              "kroger",
  "ralphs":              "ralphs",
  "fred meyer":          "fred-meyer",
  "king soopers":        "king-soopers",
  "smith's":             "smiths",
  "fry's":               "frys",
  "harris teeter":       "harris-teeter",
  "city market":         "city-market",
  "mariano's":           "marianos",
  "pay-less":            "pay-less",
  "qfc":                 "qfc",
  "pick 'n save":        "pick-n-save",
  "baker's":             "bakers",
  // Albertsons family
  "safeway":             "safeway",
  "albertsons":          "albertsons",
  "vons":                "vons",
  "jewel-osco":          "jewel-osco",
  "jewel osco":          "jewel-osco",
  "shaw's":              "shaws",
  "acme":                "acme-markets",
  "tom thumb":           "tom-thumb",
  "randalls":            "randalls",
  "pavilions":           "pavilions",
  "star market":         "star-market",
  // Other major chains on Instacart
  "costco":              "costco",
  "walmart":             "walmart",
  "target":              "target",
  "aldi":                "aldi",
  "whole foods":         "whole-foods",
  "whole foods market":  "whole-foods",
  "publix":              "publix",
  "wegmans":             "wegmans",
  "sprouts":             "sprouts",
  "h-e-b":               "heb",
  "heb":                 "heb",
  "meijer":              "meijer",
  "stop & shop":         "stop-and-shop",
  "food lion":           "food-lion",
  "giant food":          "giant",
  "giant":               "giant",
  "bj's":                "bjs-wholesale",
  "sam's club":          "sams-club",
  "winn-dixie":          "winn-dixie",
  "southeastern grocers": "winn-dixie",
  "lucky supermarkets":  "lucky-supermarkets",
  "stater bros":         "stater-brothers",
  "smart & final":       "smart-and-final",
  "price chopper":       "price-chopper",
  "market basket":       "market-basket",
};

/**
 * Canonical display names keyed by the Instacart slug.
 * Used when the scraped innerText/alt is empty or is itself a slug.
 * Covers regional slug variants (e.g. "giant-food-dcp") via prefix matching.
 */
const SLUG_DISPLAY_NAMES: Record<string, string> = {
  "kroger":            "Kroger",
  "ralphs":            "Ralphs",
  "fred-meyer":        "Fred Meyer",
  "king-soopers":      "King Soopers",
  "smiths":            "Smith's",
  "frys":              "Fry's",
  "harris-teeter":     "Harris Teeter",
  "city-market":       "City Market",
  "marianos":          "Mariano's",
  "pay-less":          "Pay-Less",
  "qfc":               "QFC",
  "pick-n-save":       "Pick 'n Save",
  "bakers":            "Baker's",
  "safeway":           "Safeway",
  "albertsons":        "Albertsons",
  "vons":              "Vons",
  "jewel-osco":        "Jewel-Osco",
  "shaws":             "Shaw's",
  "acme-markets":      "ACME Markets",
  "tom-thumb":         "Tom Thumb",
  "randalls":          "Randalls",
  "pavilions":         "Pavilions",
  "star-market":       "Star Market",
  "costco":            "Costco",
  "walmart":           "Walmart",
  "target":            "Target",
  "aldi":              "ALDI",
  "whole-foods":       "Whole Foods Market",
  "publix":            "Publix",
  "wegmans":           "Wegmans",
  "sprouts":           "Sprouts Farmers Market",
  "heb":               "H-E-B",
  "meijer":            "Meijer",
  "stop-and-shop":     "Stop & Shop",
  "food-lion":         "Food Lion",
  "giant":             "Giant Food",
  "bjs-wholesale":     "BJ's Wholesale Club",
  "sams-club":         "Sam's Club",
  "winn-dixie":        "Winn-Dixie",
  "lucky-supermarkets":"Lucky Supermarkets",
  "stater-brothers":   "Stater Bros.",
  "smart-and-final":   "Smart & Final",
  "price-chopper":     "Price Chopper",
  "market-basket":     "Market Basket",
};

/**
 * Returns a clean display name for a given Instacart slug.
 * Tries exact match first, then prefix match (handles regional variants like
 * "giant-food-dcp"), then falls back to title-casing the slug.
 */
function slugToDisplayName(slug: string): string {
  // Exact match
  if (SLUG_DISPLAY_NAMES[slug]) return SLUG_DISPLAY_NAMES[slug];
  // Prefix match — "giant-food-dcp" → matches "giant"
  for (const [key, display] of Object.entries(SLUG_DISPLAY_NAMES)) {
    if (slug.startsWith(key)) return display;
  }
  // Title-case fallback: "harris-teeter" → "Harris Teeter"
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function nameToSlug(name: string): string | null {
  const key = name.toLowerCase().trim();
  for (const [pattern, slug] of Object.entries(SLUG_MAP)) {
    if (key.includes(pattern)) return slug;
  }
  return null;
}

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    brand?: string;
    "addr:city"?: string;
    "addr:street"?: string;
    "addr:housenumber"?: string;
  };
}

/**
 * Discovers nearby Instacart retailers by navigating instacart.com with a
 * stealth browser, entering the ZIP, and intercepting the retailers API
 * response the page fires. Falls back to Overpass → static list.
 */
export async function getStores(
  zip: string,
  radiusInMiles = 10,
  instacartCookies?: string | null
): Promise<Retailer[]> {
  const cached = STORE_CACHE.get(zip);
  if (cached && Date.now() < cached.expiresAt) return cached.stores;

  const center = await geocodeZip(zip);
  console.log(`[scraper] geocoded ${zip} →`, center);

  // ── Attempt 1: authenticated browser scrape ───────────────────────────────
  // Navigate instacart.com with the user's real session cookies. Instacart
  // uses the saved delivery address on the account, so the store list matches
  // exactly what the user sees on the site. The direct v3/retailers API call
  // was removed — it ignores the saved address and returns a regional catalog.
  const instacartStores = await scrapeInstacartStores(zip, instacartCookies ?? null);
  if (instacartStores) {
    console.log(`[scraper] getStores(${zip}) → ${instacartStores.length} stores from Instacart`);
    STORE_CACHE.set(zip, { stores: instacartStores, expiresAt: Date.now() + STORE_CACHE_TTL });
    return instacartStores;
  }

  // ── Attempt 2: Overpass (OSM) ─────────────────────────────────────────────
  if (center) {
    try {
      const radiusMeters = Math.round(radiusInMiles * 1609.34);
      const query = `[out:json][timeout:10];(node["shop"="supermarket"](around:${radiusMeters},${center.lat},${center.lng});node["shop"="grocery"](around:${radiusMeters},${center.lat},${center.lng});way["shop"="supermarket"](around:${radiusMeters},${center.lat},${center.lng});way["shop"="grocery"](around:${radiusMeters},${center.lat},${center.lng}););out center 20;`;

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "User-Agent": "Grovr/1.0 (grocery price comparison; contact@grovr.app)" },
        body: query,
      });

      if (res.ok) {
        const data = (await res.json()) as { elements: OverpassElement[] };
        console.log(`[scraper] Overpass returned ${data.elements.length} elements`);

        const stores: Retailer[] = [];
        for (const el of data.elements) {
          const name = el.tags?.name ?? el.tags?.brand ?? "";
          if (!name) continue;
          const slug = nameToSlug(name);
          if (!slug) continue;
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          if (!lat || !lng) continue;
          const city = el.tags?.["addr:city"];
          const displayName = slugToDisplayName(slug);
          stores.push({
            id: `${slug}__${el.id}`,
            name: city ? `${displayName} — ${city}` : displayName,
            logoUrl: "",
            postalCode: zip,
            lat,
            lng,
          });
          if (stores.length >= 8) break;
        }

        if (stores.length > 0) {
          console.log(`[scraper] getStores(${zip}) → ${stores.length} stores from Overpass`);
          STORE_CACHE.set(zip, { stores, expiresAt: Date.now() + STORE_CACHE_TTL });
          return stores;
        }
      }
    } catch (err) {
      console.warn("[scraper] Overpass error:", err);
    }
  }

  // All sources failed — return empty rather than fake data.
  // The UI will prompt the user to reconnect Instacart.
  console.warn(`[scraper] getStores(${zip}) → all sources exhausted, returning empty`);
  return [];
}

async function buildStoresFromRaw(
  raw: Record<string, unknown>[],
  zip: string,
  center: ZipCoords | null,
  radiusInMiles: number
): Promise<Retailer[]> {
  // First pass: build store shells (sync, fast)
  type StoreShell = {
    slug: string;
    name: string;
    logoUrl: string;
    apiLat?: number;
    apiLng?: number;
    index: number;
  };
  const shells: StoreShell[] = [];
  for (const retailer of raw) {
    const name = String(retailer.name ?? "");
    if (!name) continue;

    // Whitelist: only include stores whose name matches a known grocery chain.
    // This filters out non-grocery Instacart retailers (clothing, electronics,
    // pharmacy chains, etc.) without needing an exhaustive blocklist.
    const knownSlug = nameToSlug(name);
    if (!knownSlug) {
      console.log(`[scraper] skipping non-grocery or unknown retailer: ${name}`);
      continue;
    }

    // Use Instacart's own slug/id for cart URLs if available, otherwise use ours
    const instacartSlug = String(retailer.slug ?? retailer.id ?? knownSlug);
    const coords = retailer.coordinates as Record<string, number> | undefined;
    shells.push({
      slug: instacartSlug,
      name,
      logoUrl: String(retailer.logo_url ?? ""),
      apiLat: coords?.latitude,
      apiLng: coords?.longitude,
      index: shells.length,
    });
    if (shells.length >= 15) break;
  }

  // Second pass: geocode stores and filter by radius.
  // Sequential with 120ms gap to respect Nominatim's 1-req/sec policy.
  const results: Retailer[] = [];
  for (const s of shells) {
    let coords: ZipCoords | null = null;
    let fromApi = false;

    if (s.apiLat !== undefined && s.apiLng !== undefined) {
      coords = { lat: s.apiLat, lng: s.apiLng };
      fromApi = true;
    } else {
      coords = await geocodeStore(s.name, zip, center);
      // Brief pause between Nominatim requests
      await new Promise((r) => setTimeout(r, 120));
    }

    if (coords) {
      // If we have a real geocoded position, enforce the radius.
      // Stores with API coordinates are trusted; geocoded results are checked.
      if (!fromApi && center) {
        const dist = haversineDistance(center.lat, center.lng, coords.lat, coords.lng);
        if (dist > radiusInMiles) {
          console.log(`[scraper] "${s.name}" geocoded ${dist.toFixed(1)}mi away — outside ${radiusInMiles}mi radius, skipping`);
          continue;
        }
      }
      console.log(`[scraper] "${s.name}" accepted`);
      results.push({ id: `${s.slug}__ic`, name: s.name, logoUrl: s.logoUrl, postalCode: zip, lat: coords.lat, lng: coords.lng });
    } else {
      // Geocoding failed entirely — include the store without coordinates
      // (it will still appear in the list but won't have a map pin)
      console.log(`[scraper] geocode failed for "${s.name}", including without coords`);
      results.push({ id: `${s.slug}__ic`, name: s.name, logoUrl: s.logoUrl, postalCode: zip });
    }
  }

  return results;
}

/**
 * Recursively searches a JSON object for an array of retailer-shaped objects.
 * Instacart's GraphQL responses nest retailer data at various depths.
 * A "retailer" is identified as an object with both a name and a slug/id.
 */
function isRetailerObject(item: unknown): item is Record<string, unknown> {
  if (typeof item !== "object" || item === null) return false;
  const o = item as Record<string, unknown>;
  // Require `slug` (or `retailer_key`) — grocery products have `name`+`id`
  // but never a slug. Instacart retailer objects always carry a slug.
  const hasName = typeof o.name === "string" && o.name.length > 0;
  const hasSlug = typeof o.slug === "string" || typeof o.retailer_key === "string";
  return hasName && hasSlug;
}

function findRetailersInJson(obj: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 10 || obj === null || typeof obj !== "object") return [];

  if (Array.isArray(obj)) {
    if (obj.length === 0) return [];

    // Pattern 1: flat array of retailer objects
    if (obj.every(isRetailerObject)) return obj as Record<string, unknown>[];

    // Pattern 2: Instacart shops[].retailer — { id, retailer: { id, slug, name } }
    const allHaveRetailer = obj.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "retailer" in item &&
        isRetailerObject((item as Record<string, unknown>).retailer)
    );
    if (allHaveRetailer) {
      return obj.map((item) => (item as Record<string, unknown>).retailer as Record<string, unknown>);
    }

    // Pattern 3: GraphQL edges[].node — array of { node: { name, slug, ... } }
    const allEdges = obj.every(
      (item) => typeof item === "object" && item !== null && "node" in item
    );
    if (allEdges) {
      const nodes = obj.map((item) => (item as Record<string, unknown>).node);
      if (nodes.every(isRetailerObject)) return nodes as Record<string, unknown>[];
      for (const node of nodes) {
        const found = findRetailersInJson(node, depth + 1);
        if (found.length > 0) return found;
      }
    }

    // Pattern 3: recurse into each element
    for (const item of obj) {
      const found = findRetailersInJson(item, depth + 1);
      if (found.length > 0) return found;
    }
    return [];
  }

  // Plain object — check for GraphQL `nodes` key first (common shorthand)
  const o = obj as Record<string, unknown>;
  if (Array.isArray(o.nodes) && o.nodes.length > 0) {
    if (o.nodes.every(isRetailerObject)) return o.nodes as Record<string, unknown>[];
    const found = findRetailersInJson(o.nodes, depth + 1);
    if (found.length > 0) return found;
  }

  // Recurse into all values
  for (const value of Object.values(o)) {
    const found = findRetailersInJson(value, depth + 1);
    if (found.length > 0) return found;
  }
  return [];
}

/**
 * Navigates instacart.com with a stealth browser, types the ZIP into the
 * location input, and intercepts the retailers API response.
 * Returns null if no retailers are found (triggers fallback).
 */
/**
 * Makes an authenticated Instacart API call using stored user cookies.
 * Returns null if no cookies are available for the user.
 */
async function instacartFetch(
  url: string,
  cookieString: string
): Promise<Response> {
  return fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Cookie: cookieString,
    },
  });
}

/**
 * Injects stored Instacart cookies into a Playwright browser context.
 *
 * Supports two storage formats:
 *   1. JSON array (new format): full Playwright Cookie objects with domain,
 *      path, secure, sameSite, etc. — injected with all original attributes.
 *   2. "name=value; name2=value2" string (legacy format): attributes are
 *      inferred. Cookies with __Host- / __Secure- prefixes get secure:true.
 *
 * Returns the number of successfully injected cookies.
 */
async function injectCookies(
  context: import("playwright").BrowserContext,
  cookieString: string
): Promise<number> {
  let injected = 0;

  // ── Format 1: JSON array of full Playwright cookie objects ─────────────────
  const trimmed = cookieString.trim();
  if (trimmed.startsWith("[")) {
    try {
      type StoredCookie = {
        name: string; value: string; domain?: string; path?: string; secure?: boolean;
      };
      const cookies = JSON.parse(trimmed) as StoredCookie[];
      for (const c of cookies) {
        if (!c.name || c.value === undefined) continue;
        try {
          await context.addCookies([{
            name: c.name,
            value: c.value,
            ...(c.domain ? { domain: c.domain } : { url: "https://www.instacart.com" }),
            path: c.path ?? "/",
            secure: c.secure ?? false,
          }]);
          injected++;
        } catch {
          // skip malformed or rejected cookies
        }
      }
      return injected;
    } catch {
      // Fall through to legacy format parsing
    }
  }

  // ── Format 2: "name=value; name2=value2" legacy string ─────────────────────
  for (const pair of cookieString.split(";")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) continue;
    const name = pair.slice(0, eqIdx).trim();
    const value = pair.slice(eqIdx + 1).trim();
    if (!name) continue;
    try {
      await context.addCookies([{
        name,
        value,
        url: "https://www.instacart.com",
        ...(name.startsWith("__Host-") || name.startsWith("__Secure-")
          ? { secure: true }
          : {}),
      }]);
      injected++;
    } catch {
      // skip cookies that fail validation
    }
  }
  return injected;
}

async function scrapeInstacartStores(
  zip: string,
  instacartCookies: string | null
): Promise<Retailer[] | null> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
    viewport: { width: 1280, height: 800 },
  });

  await context.addInitScript(STEALTH_SCRIPT);

  // Inject session cookies before creating the page so they're present on
  // the very first navigation request.
  if (instacartCookies) {
    const injected = await injectCookies(context, instacartCookies);
    console.log(`[scraper] injected ${injected} cookies into browser context`);
  }

  const page = await context.newPage();
  try {
    // The grocery directory gives us pre-filtered results — no whitelist needed
    console.log(`[scraper] navigating to instacart.com/store/directory?filter=grocery…`);
    await page.goto("https://www.instacart.com/store/directory?filter=grocery", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    console.log(`[scraper] landed on: ${page.url()}`);

    // Log where we actually landed (in case of redirects)
    console.log(`[scraper] page title: "${await page.title()}"`);
    console.log(`[scraper] final URL: ${page.url()}`);

    // Save debug screenshot so we can inspect what the browser sees
    try {
      await page.screenshot({ path: "/tmp/instacart-debug.png", fullPage: false });
      console.log("[scraper] screenshot saved → /tmp/instacart-debug.png");
    } catch { /* non-fatal */ }

    // Wait for the store cards to render
    await page.waitForTimeout(4_000);

    // Save post-render screenshot
    try {
      await page.screenshot({ path: "/tmp/instacart-debug-rendered.png", fullPage: false });
      console.log("[scraper] post-render screenshot saved → /tmp/instacart-debug-rendered.png");
    } catch { /* non-fatal */ }

    // Each store card has department tags (<li> with text like "Groceries",
    // "Produce", "Organic") that are siblings of — not children of — the store
    // anchor. So we walk UP from each "Groceries" <li> until we find a container
    // that also contains a /store/[slug]/storefront anchor, then query down for it.
    const rawStores: { slug: string; name: string }[] = await page.evaluate(() => {
      const results: { slug: string; name: string }[] = [];
      const groceryTags = Array.from(document.querySelectorAll("li")).filter(
        (li) => li.textContent?.trim() === "Groceries"
      );
      for (const tag of groceryTags) {
        let el: HTMLElement | null = tag.parentElement;
        while (el && el !== document.body) {
          const anchor = el.querySelector<HTMLAnchorElement>('a[href*="/store/"]');
          if (anchor) {
            const href = anchor.getAttribute("href") ?? "";
            const match = href.match(/\/store\/([^/]+)\/storefront/);
            if (match) {
              const slug = match[1];
              const name =
                anchor.innerText?.split("\n")[0]?.trim() ||
                anchor.querySelector("img")?.getAttribute("alt")?.trim() ||
                slug;
              results.push({ slug, name });
            }
            break;
          }
          el = el.parentElement;
        }
      }
      return results;
    });

    // Deduplicate — a store card may have multiple "Groceries" li elements
    const seen = new Set<string>();
    const unique = rawStores.filter(({ slug }) => {
      if (seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });

    console.log(`[scraper] grocery directory stores:`, unique.map((s) => s.name));
    if (unique.length === 0) return null;

    return unique.map(({ slug, name }) => ({
      id: `${slug}__ic`,
      // Prefer the scraped display name when it looks human-readable (contains a
      // space or is a known all-caps brand like "ALDI"). Fall back to the curated
      // SLUG_DISPLAY_NAMES map so we never surface raw slugs in the UI.
      name: (name && (name.includes(" ") || name === name.toUpperCase()) && !name.includes("-"))
        ? name
        : slugToDisplayName(slug),
      logoUrl: "",
      postalCode: zip,
    }));
  } catch (err) {
    console.warn("[scraper] scrapeInstacartStores error:", err);
    return null;
  } finally {
    await browser.close();
  }
}

function addOffset(coord: number, i: number): number {
  const offsets = [0.010, -0.010, 0.015, -0.015, 0.008, -0.008];
  return coord + (offsets[i % offsets.length] ?? 0);
}


// ---------------------------------------------------------------------------
// Product pricing — full page interception with stealth
// ---------------------------------------------------------------------------

const PRICE_CACHE = new Map<string, { match: ProductMatch; expiresAt: number }>();
const PRICE_CACHE_TTL = 60 * 60 * 1_000;

export async function scrapeProduct(
  item: GroceryItem,
  retailer: Retailer,
  instacartCookies?: string | null
): Promise<ProductMatch> {
  const key = `${retailer.id}:${item.name.toLowerCase().trim()}`;
  const cached = PRICE_CACHE.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.match;

  const match = await fetchProductPrice(item, retailer, instacartCookies);
  PRICE_CACHE.set(key, { match, expiresAt: Date.now() + PRICE_CACHE_TTL });
  return match;
}

async function fetchProductPrice(
  item: GroceryItem,
  retailer: Retailer,
  instacartCookies?: string | null
): Promise<ProductMatch> {
  // Fast path: authenticated direct API call — no browser needed
  if (instacartCookies) {
    try {
      const slug = retailer.id.split("__")[0];
      const term = encodeURIComponent(item.name.trim());
      const res = await instacartFetch(
        `https://www.instacart.com/v3/containers/${slug}/items_v2?term=${term}&source=search&per_page=1`,
        instacartCookies
      );
      console.log(`[scraper] authenticated items API → ${res.status} for "${item.name}" @ ${slug}`);
      if (res.ok) {
        const json = (await res.json()) as Record<string, unknown>;
        const candidates = findRetailersInJson(json);
        if (candidates.length > 0) {
          const first = candidates[0];
          const matchedName = String(first.name ?? item.name);
          const productId = String(first.id ?? "");
          const priceRaw =
            first.price ??
            (first.attributes as Record<string, unknown> | undefined)?.price ??
            first.price_string;
          let price = 0;
          if (typeof priceRaw === "number") price = priceRaw;
          else if (typeof priceRaw === "string") price = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));
          if (!isNaN(price) && price > 0) {
            console.log(`[scraper] "${item.name}" @ ${slug} → "${matchedName}" $${price} (authenticated)`);
            return { item, matchedName, price, upc: productId || undefined, retailerId: retailer.id };
          }
        }
      }
    } catch (err) {
      console.warn(`[scraper] authenticated items fetch error:`, err);
    }
  }
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    locale: "en-US",
    viewport: { width: 1280, height: 800 },
  });

  // Inject stealth patches before any page JS runs
  await context.addInitScript(STEALTH_SCRIPT);

  const page = await context.newPage();

  let matchedName = item.name;
  let price = 0;
  let productId: string | undefined;

  // Intercept any XHR that looks like a product/items search response
  const responsePromise = new Promise<void>((resolve) => {
    page.on("response", async (response) => {
      const url = response.url();
      if (price > 0) return; // already found
      if (
        !url.includes("instacart.com") ||
        (!url.includes("/items") && !url.includes("/search") && !url.includes("/products"))
      ) return;
      if (!response.ok()) return;

      try {
        const text = await response.text();
        if (!text.startsWith("{") && !text.startsWith("[")) return; // not JSON

        const json = JSON.parse(text) as Record<string, unknown>;

        // Instacart's response shape has changed several times;
        // probe all known paths
        const candidates: unknown[] =
          (json?.items as unknown[]) ??
          ((json?.data as Record<string, unknown>)?.items as unknown[]) ??
          ((
            (json?.data as Record<string, unknown>)
              ?.body as Array<Record<string, unknown>>
          )?.[0]?.view as Record<string, unknown>)?.items as unknown[] ??
          [];

        console.log(
          `[scraper] intercepted ${url.split("?")[0]} — candidates: ${candidates.length}`
        );

        const first = candidates[0] as Record<string, unknown> | undefined;
        if (!first) return;

        matchedName = String(first.name ?? item.name);
        productId = String(first.id ?? "");

        // Price may arrive as a number, "$X.XX" string, or inside attributes
        const priceRaw =
          first.price ??
          (first.attributes as Record<string, unknown> | undefined)?.price ??
          first.price_string ??
          (first.pricing as Record<string, unknown> | undefined)?.price;

        if (typeof priceRaw === "number") {
          price = priceRaw;
        } else if (typeof priceRaw === "string") {
          price = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));
        }

        if (isNaN(price)) price = 0;
        if (price > 0) resolve();
      } catch {
        // Non-JSON or unexpected shape — skip
      }
    });
  });

  try {
    // Strip the OSM element suffix (e.g. "giant__343241124" → "giant")
    const slug = retailer.id.split("__")[0];
    const term = encodeURIComponent(item.name.trim());
    const url = `https://www.instacart.com/store/${slug}/search_v3/${term}`;
    console.log(`[scraper] navigating → ${url}`);

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait up to 8 seconds for the XHR to fire and be intercepted
    await Promise.race([
      responsePromise,
      page.waitForTimeout(8_000),
    ]);
  } catch (err) {
    console.warn(`[scraper] navigation error for "${item.name}":`, err);
  } finally {
    await browser.close();
  }

  console.log(
    `[scraper] "${item.name}" @ ${retailer.id} → "${matchedName}" $${price}`
  );

  return {
    item,
    matchedName,
    price: isNaN(price) ? 0 : price,
    upc: productId || undefined,
    retailerId: retailer.id,
  };
}

// ---------------------------------------------------------------------------
// Cart link — no auth required; user completes checkout on the retailer site
// ---------------------------------------------------------------------------

export function buildCartUrl(retailer: Retailer, items: ProductMatch[]): string {
  const slug = retailer.id.split("__")[0].toLowerCase();
  const availableItems = items.filter((m) => m.price > 0);

  // Walmart supports cart pre-fill via query string item IDs
  if (slug === "walmart") {
    const params = availableItems
      .filter((m) => m.upc)
      .map((m) => `items[]=${encodeURIComponent(m.upc!)}`)
      .join("&");
    return params ? `https://www.walmart.com/cart?${params}` : "https://www.walmart.com";
  }

  // All other retailers: link to their Instacart store page.
  // Instacart Partner API is the upgrade path for full cart pre-population.
  return `https://www.instacart.com/store/${slug}`;
}
