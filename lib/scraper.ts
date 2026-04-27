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



// ---------------------------------------------------------------------------
// Product pricing — DOM scraping with concurrency limit
// ---------------------------------------------------------------------------

const PRICE_CACHE = new Map<string, { match: ProductMatch; expiresAt: number }>();
const PRICE_CACHE_TTL = 60 * 60 * 1_000;

// At most 2 Chromium instances open at the same time — more than this
// causes page.goto to timeout as the OS runs out of file descriptors / memory.
const MAX_CONCURRENT = 2;
let activeBrowsers = 0;
const browserQueue: Array<() => void> = [];

async function acquireBrowserSlot(): Promise<void> {
  if (activeBrowsers < MAX_CONCURRENT) {
    activeBrowsers++;
    return;
  }
  await new Promise<void>((resolve) => browserQueue.push(resolve));
  activeBrowsers++;
}

function releaseBrowserSlot(): void {
  activeBrowsers--;
  const next = browserQueue.shift();
  if (next) next();
}


/**
 * Word-overlap similarity between two product name strings.
 * Returns a value in [0, 1] — 1 means all shorter-string words appear in
 * the longer string. Words shorter than 3 chars are ignored (articles, units).
 */
function wordSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  return intersection / Math.min(wordsA.size, wordsB.size);
}

/**
 * Builds a list of search terms to try in order, from most specific to
 * most generic. Progressive fallback ensures that brand-specific queries
 * are tried first; if Instacart finds nothing, we widen the search.
 *
 * Examples:
 *   name="Boring Oat Milk", brandPref="Oatly"
 *     → ["Boring Oat Milk Oatly", "Boring Oat Milk", "Oat Milk", "Oatly"]
 *
 *   name="Organic Valley Whole Milk 64 oz", brandPref=undefined
 *     → ["Organic Valley Whole Milk 64 oz", "Organic Valley Whole Milk", "Whole Milk"]
 */
function buildSearchTerms(name: string, brandPref?: string): string[] {
  const terms: string[] = [];

  // Strip obvious size/unit tokens to get the "core" name
  const sizePattern = /\b\d+(\.\d+)?\s*(oz|ml|g|kg|lb|lbs|l|fl|ct|pk|pack|count|each)\b/gi;
  const coreName = name.replace(sizePattern, "").replace(/\s{2,}/g, " ").trim();
  const coreWords = coreName.split(/\s+/);

  // 1. Full name + brand pref (most specific)
  if (brandPref) terms.push(`${name} ${brandPref}`);

  // 2. Full name as-is
  terms.push(name);

  // 3. Core name (no size tokens) + brand pref
  if (brandPref && coreName !== name) terms.push(`${coreName} ${brandPref}`);

  // 4. Core name
  if (coreName !== name) terms.push(coreName);

  // 5. Last 3 core words (drops leading brand/adjective words)
  if (coreWords.length > 3) terms.push(coreWords.slice(-3).join(" "));

  // 6. Last 2 core words (most generic ingredient)
  if (coreWords.length >= 2) terms.push(coreWords.slice(-2).join(" "));

  // 7. First word alone + brand pref (e.g. "Lactaid Oatly")
  if (brandPref && coreWords.length >= 1) terms.push(`${coreWords[0]} ${brandPref}`);

  // 8. Last word alone (single most important noun)
  if (coreWords.length >= 2) terms.push(coreWords[coreWords.length - 1]);

  // 9. Brand pref alone (if the name search completely fails)
  if (brandPref) terms.push(brandPref);

  // Deduplicate, preserving order
  const seen = new Set<string>();
  return terms.filter((t) => {
    const k = t.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return k.length > 0;
  });
}

export async function scrapeProduct(
  item: GroceryItem,
  retailer: Retailer,
  instacartCookies?: string | null
): Promise<ProductMatch> {
  const cacheKey = `${retailer.id}:${item.name.toLowerCase().trim()}:${item.brandPref ?? ""}`;
  const cached = PRICE_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.match;

  const match = await fetchProductPrice(item, retailer);
  PRICE_CACHE.set(cacheKey, { match, expiresAt: Date.now() + PRICE_CACHE_TTL });
  return match;
}

async function fetchProductPrice(
  item: GroceryItem,
  retailer: Retailer,
): Promise<ProductMatch> {
  const slug = retailer.id.split("__")[0];
  const searchTerms = buildSearchTerms(item.name, item.brandPref);

  // ── Browser path: DOM scraping (rate-limited) ────────────────────────────
  await acquireBrowserSlot();

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
  const page = await context.newPage();

  try {
    for (const term of searchTerms) {
      const result = await tryBrowserSearch(page, slug, term, item.name);
      if (result) {
        console.log(`[scraper] "${item.name}" @ ${slug} → "${result.matchedName}" $${result.price} (term="${term}")`);
        return { item, matchedName: result.matchedName, price: result.price, upc: result.productId, retailerId: retailer.id };
      }
    }
  } finally {
    await browser.close();
    releaseBrowserSlot();
  }

  console.log(`[scraper] "${item.name}" @ ${slug} → no match found across ${searchTerms.length} terms`);
  return { item, matchedName: item.name, price: 0, retailerId: retailer.id };
}

/**
 * Tries a single search term in an already-open Playwright page.
 * Navigates to the Instacart search URL, waits for product cards to render,
 * then reads name + price directly from the DOM.
 */
async function tryBrowserSearch(
  page: import("playwright").Page,
  slug: string,
  searchTerm: string,
  originalItemName: string
): Promise<{ matchedName: string; price: number; productId?: string } | null> {
  const url = `https://www.instacart.com/store/${slug}/s?k=${encodeURIComponent(searchTerm.trim()).replace(/%20/g, "+")}`;
  console.log(`[scraper] browser → ${url}`);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait until at least one "$X.XX" price appears anywhere in the page text.
    // This is class-name-agnostic and works regardless of React's hashed classes.
    await page.waitForFunction(
      () => /\$\d+\.\d{2}/.test(document.body.innerText),
      { timeout: 10_000 }
    ).catch(() => null);

    // Walk all text nodes looking for price patterns, then pair each price with
    // the nearest product name in the same card (<li> or <article> ancestor).
    const products = await page.evaluate(() => {
      const priceRegex = /\$(\d+\.\d{2})/;
      const results: { name: string; price: number }[] = [];
      const seen = new Set<Element>();

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        const text = node.textContent ?? "";
        const match = text.match(priceRegex);
        if (!match) continue;
        const price = parseFloat(match[1]);
        if (price <= 0) continue;

        // Walk up to the nearest list item or article (the product card boundary)
        let card: HTMLElement | null = node.parentElement;
        while (card && card !== document.body && !["LI", "ARTICLE"].includes(card.tagName)) {
          card = card.parentElement as HTMLElement | null;
        }
        if (!card || seen.has(card)) continue;
        seen.add(card);

        // The product name is the longest non-price, non-numeric text line in the card
        const lines = (card.innerText ?? "")
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 4 && !priceRegex.test(s) && !/^\d+$/.test(s));
        const name = lines.sort((a, b) => b.length - a.length)[0] ?? "";
        if (!name) continue;

        results.push({ name, price });
      }
      return results;
    });

    console.log(`[scraper] DOM found ${products.length} products for "${searchTerm}" @ ${slug}`);
    if (products.length === 0) return null;

    // Pick the product whose name best matches what the user asked for
    const best = products.reduce((a, b) =>
      wordSimilarity(originalItemName, b.name) > wordSimilarity(originalItemName, a.name) ? b : a
    );

    console.log(`[scraper] best DOM match: "${best.name}" $${best.price}`);
    return { matchedName: best.name, price: best.price };
  } catch (err) {
    console.warn(`[scraper] browser error (term="${searchTerm}"):`, err);
    return null;
  }
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

  // All other retailers: link to their Instacart storefront.
  // Instacart Partner API is the upgrade path for full cart pre-population.
  return `https://www.instacart.com/store/${slug}/storefront`;
}
