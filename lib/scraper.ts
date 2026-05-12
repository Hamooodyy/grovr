/**
 * lib/scraper.ts
 *
 * Browserless-powered product price scraper.
 *
 * All stores are scraped via Instacart's store-specific search pages
 * using Browserless (cloud headless browser with stealth/anti-detection).
 * One browser connection is reused for all items at a given store.
 *
 * Store discovery is handled by lib/google-places.ts.
 * Store configs (slugs) live in lib/store-urls.ts.
 */

import { chromium } from "playwright";
import type { Browser, Page } from "playwright";
import type { GroceryItem, ProductMatch, Retailer, ItemSize } from "./types";
import { STORE_CONFIGS } from "./store-urls";

const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY ?? "";

// ---------------------------------------------------------------------------
// Price cache
// ---------------------------------------------------------------------------

const PRICE_CACHE = new Map<string, { match: ProductMatch; expiresAt: number }>();
const PRICE_CACHE_TTL = 60 * 60 * 1_000; // 1 hour

// ---------------------------------------------------------------------------
// Concurrency limiter — max 2 Browserless sessions at once
// ---------------------------------------------------------------------------

const MAX_CONCURRENT = 2;
let activeSessions = 0;
const sessionQueue: Array<() => void> = [];

async function acquireSession(): Promise<void> {
  if (activeSessions < MAX_CONCURRENT) {
    activeSessions++;
    return;
  }
  await new Promise<void>((resolve) => sessionQueue.push(resolve));
  activeSessions++;
}

function releaseSession(): void {
  activeSessions--;
  const next = sessionQueue.shift();
  if (next) next();
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function extractOz(name: string): number | null {
  const ozMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:fl[\s-]?)?oz\b/i);
  if (ozMatch) return parseFloat(ozMatch[1]);
  const lbMatch = name.match(/(\d+(?:\.\d+)?)\s*lb\b/i);
  if (lbMatch) return parseFloat(lbMatch[1]) * 16;
  return null;
}

function extractCount(name: string): number | null {
  const ctMatch = name.match(/(\d+)\s*(?:count|ct|pk|pack)\b/i);
  if (ctMatch) return parseInt(ctMatch[1], 10);
  const leadingMatch = name.match(/\b(\d+)\s*(?:eggs?|pieces?)\b/i);
  if (leadingMatch) return parseInt(leadingMatch[1], 10);
  return null;
}

function sizeScore(productName: string, size?: ItemSize): number {
  if (!size) return 0;

  const oz = extractOz(productName);
  if (oz !== null) {
    if (size === "S" && oz < 20) return 1;
    if (size === "M" && oz >= 20 && oz < 80) return 1;
    if (size === "L" && oz >= 80) return 1;
    return -0.5;
  }

  const count = extractCount(productName);
  if (count !== null) {
    if (size === "S" && count <= 6) return 1;
    if (size === "M" && count >= 7 && count <= 15) return 1;
    if (size === "L" && count >= 16) return 1;
    return -0.5;
  }

  return 0;
}

/**
 * Word-overlap similarity that penalizes extra unmatched words.
 *
 * Uses the max of the two word-set sizes as the denominator so that
 * "milk" vs "almond milk" = 1/2 = 0.5, while "milk" vs "whole milk" = 1/2 = 0.5
 * but "whole milk" vs "whole milk 2%" = 2/3 = 0.67 — closer matches score higher.
 */
function wordSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  return intersection / Math.max(wordsA.size, wordsB.size);
}

// ---------------------------------------------------------------------------
// Search term builder — progressive fallback from specific to generic
// ---------------------------------------------------------------------------

function buildSearchTerms(name: string, brandPref?: string): string[] {
  const terms: string[] = [];
  const sizePattern = /\b\d+(\.\d+)?\s*(oz|ml|g|kg|lb|lbs|l|fl|ct|pk|pack|count|each)\b/gi;
  const coreName = name.replace(sizePattern, "").replace(/\s{2,}/g, " ").trim();
  const coreWords = coreName.split(/\s+/);

  if (brandPref) terms.push(`${name} ${brandPref}`);
  terms.push(name);
  if (brandPref && coreName !== name) terms.push(`${coreName} ${brandPref}`);
  if (coreName !== name) terms.push(coreName);
  if (coreWords.length > 3) terms.push(coreWords.slice(-3).join(" "));
  if (coreWords.length >= 2) terms.push(coreWords.slice(-2).join(" "));
  if (brandPref && coreWords.length >= 1) terms.push(`${coreWords[0]} ${brandPref}`);
  if (coreWords.length >= 2) terms.push(coreWords[coreWords.length - 1]);
  if (brandPref) terms.push(brandPref);

  const seen = new Set<string>();
  return terms.filter((t) => {
    const k = t.toLowerCase().trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return k.length > 0;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrape a single item at a single retailer.
 * Called per-item from the pricing route. Results are cached for 1 hour.
 */
export async function scrapeProduct(
  item: GroceryItem,
  retailer: Retailer
): Promise<ProductMatch> {
  const cacheKey = `${retailer.id}:${item.name.toLowerCase().trim()}:${item.brandPref ?? ""}`;
  const cached = PRICE_CACHE.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.match;

  // Single-item call — opens its own browser session
  const results = await scrapeProducts([item], retailer);
  const match = results[0];
  PRICE_CACHE.set(cacheKey, { match, expiresAt: Date.now() + PRICE_CACHE_TTL });
  return match;
}

/**
 * Scrape multiple items at a single retailer in one browser session.
 * One Browserless connection is reused across all items, avoiding
 * rate limits from opening many parallel connections.
 */
export async function scrapeProducts(
  items: GroceryItem[],
  retailer: Retailer
): Promise<ProductMatch[]> {
  const storeKey = retailer.id.split("__")[0];
  const storeConfig = STORE_CONFIGS[storeKey];

  if (!storeConfig || !BROWSERLESS_API_KEY) {
    if (!storeConfig) console.warn(`[scraper] no config for store key "${storeKey}"`);
    if (!BROWSERLESS_API_KEY) console.warn("[scraper] BROWSERLESS_API_KEY is not set");
    return items.map((item) => ({
      item, matchedName: item.name, price: 0, retailerId: retailer.id,
    }));
  }

  // Check cache for all items — only scrape the uncached ones
  const results: (ProductMatch | null)[] = items.map((item) => {
    const cacheKey = `${retailer.id}:${item.name.toLowerCase().trim()}:${item.brandPref ?? ""}`;
    const cached = PRICE_CACHE.get(cacheKey);
    return cached && Date.now() < cached.expiresAt ? cached.match : null;
  });

  const uncachedIndices = results
    .map((r, i) => (r === null ? i : -1))
    .filter((i) => i >= 0);

  if (uncachedIndices.length === 0) return results as ProductMatch[];

  // One browser session for all uncached items at this store
  await acquireSession();
  let browser: Browser | null = null;

  try {
    browser = await chromium.connectOverCDP(
      `wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}`
    );
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = await context.newPage();

    try {
      for (const idx of uncachedIndices) {
        const item = items[idx];
        const match = await scrapeOneItem(page, item, storeKey, storeConfig.instacartSlug, retailer.id);
        results[idx] = match;
        const cacheKey = `${retailer.id}:${item.name.toLowerCase().trim()}:${item.brandPref ?? ""}`;
        PRICE_CACHE.set(cacheKey, { match, expiresAt: Date.now() + PRICE_CACHE_TTL });
      }
    } finally {
      await page.close().catch(() => {});
    }
  } catch (err) {
    console.error(`[scraper] Browserless error for ${storeKey}:`, err);
    // Fill any remaining nulls with no-match
    for (const idx of uncachedIndices) {
      if (results[idx] === null) {
        results[idx] = {
          item: items[idx], matchedName: items[idx].name, price: 0, retailerId: retailer.id,
        };
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    releaseSession();
  }

  return results as ProductMatch[];
}

export function buildCartUrl(retailer: Retailer): string {
  return retailer.storefrontUrl;
}

// ---------------------------------------------------------------------------
// Internal — scrape one item using an existing page
// ---------------------------------------------------------------------------

async function scrapeOneItem(
  page: Page,
  item: GroceryItem,
  storeKey: string,
  instacartSlug: string,
  retailerId: string
): Promise<ProductMatch> {
  const searchTerms = buildSearchTerms(item.name, item.brandPref);

  for (const term of searchTerms) {
    const url = `https://www.instacart.com/store/${instacartSlug}/s?k=${encodeURIComponent(term.trim())}`;
    console.log(`[scraper] ${storeKey} → ${url}`);

    const result = await searchAndExtract(page, url, item.name, item.size);
    if (result) {
      console.log(
        `[scraper] "${item.name}" @ ${storeKey} → "${result.matchedName}" $${result.price} (term="${term}")`
      );
      return {
        item,
        matchedName: result.matchedName,
        price: result.price,
        retailerId,
      };
    }
  }

  console.log(
    `[scraper] "${item.name}" @ ${storeKey} → no match across ${searchTerms.length} terms`
  );
  return { item, matchedName: item.name, price: 0, retailerId };
}

// ---------------------------------------------------------------------------
// Search + DOM extraction
// ---------------------------------------------------------------------------

async function searchAndExtract(
  page: Page,
  url: string,
  originalItemName: string,
  size?: ItemSize
): Promise<{ matchedName: string; price: number } | null> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    const hasPrices = await page
      .waitForFunction(
        () => /\$\d+\.\d{2}/.test(document.body.innerText),
        { timeout: 20_000 }
      )
      .then(() => true)
      .catch(() => false);

    if (!hasPrices) {
      console.log(`[scraper] no prices found on ${url}`);
      return null;
    }

    await page.waitForTimeout(2_000);

    return extractProducts(page, originalItemName, size);
  } catch (err) {
    console.warn(`[scraper] search error (url="${url}"):`, err);
    return null;
  }
}

async function extractProducts(
  page: Page,
  originalItemName: string,
  size?: ItemSize
): Promise<{ matchedName: string; price: number } | null> {
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

      let card: HTMLElement | null = node.parentElement;
      let steps = 0;
      let fallback: HTMLElement | null = null;
      while (card && card !== document.body && steps < 8) {
        if (steps === 5) fallback = card;
        if (["LI", "ARTICLE"].includes(card.tagName)) break;
        card = card.parentElement as HTMLElement | null;
        steps++;
      }
      const boundary = card && card !== document.body ? card : fallback;
      if (!boundary || seen.has(boundary)) continue;
      seen.add(boundary);

      const lines = (boundary.innerText ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(
          (s) => s.length > 4 && !priceRegex.test(s) && !/^\d+$/.test(s)
        );
      const name = lines.sort((a, b) => b.length - a.length)[0] ?? "";
      if (!name) continue;

      results.push({ name, price });
    }
    return results;
  });

  console.log(`[scraper] DOM found ${products.length} products`);
  if (products.length === 0) return null;

  const best = products.reduce((a, b) => {
    const scoreA =
      wordSimilarity(originalItemName, a.name) + sizeScore(a.name, size);
    const scoreB =
      wordSimilarity(originalItemName, b.name) + sizeScore(b.name, size);
    return scoreB > scoreA ? b : a;
  });

  console.log(`[scraper] best match: "${best.name}" $${best.price}`);
  return { matchedName: best.name, price: best.price };
}
