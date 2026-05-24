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

import { chromium } from "playwright-core";
import type { Browser, Page } from "playwright-core";
import type { GroceryItem, ProductMatch, Retailer, ItemSize } from "./types";
import { STORE_CONFIGS } from "./store-urls";
import { kvGet, kvSet, PRICE_PREFIX } from "./kv";

const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY ?? "";

// ---------------------------------------------------------------------------
// Price cache — stored in Vercel KV (Upstash Redis), 1 hour TTL
// ---------------------------------------------------------------------------

const PRICE_CACHE_TTL = 3600; // seconds

interface CachedPrice {
  matchedName: string;
  matchedSize?: string;
  price: number;
  retailerId: string;
}

function priceCacheKey(retailerId: string, itemName: string, brandPref?: string): string {
  return `${PRICE_PREFIX}${retailerId}:${itemName.toLowerCase().trim()}:${brandPref ?? ""}`;
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

/** Extract a human-readable size string from a product name. */
function extractSizeLabel(name: string): string | undefined {
  // Match patterns like "64 fl oz", "1 Gallon", "12 ct", "2 lb", "1.5 L", "500 ml"
  const patterns = [
    /\b(\d+(?:\.\d+)?\s*(?:fl[\s-]?)?oz)\b/i,
    /\b(\d+(?:\.\d+)?\s*(?:gal(?:lon)?s?))\b/i,
    /\b(\d+(?:\.\d+)?\s*(?:lbs?|pounds?))\b/i,
    /\b(\d+(?:\.\d+)?\s*(?:kg|kilograms?))\b/i,
    /\b(\d+(?:\.\d+)?\s*[lL](?:iters?)?)\b/,
    /\b(\d+(?:\.\d+)?\s*(?:ml|milliliters?))\b/i,
    /\b(\d+(?:\.\d+)?\s*(?:ct|count|pk|pack))\b/i,
    /\b(\d+\s*(?:each|ea))\b/i,
  ];
  for (const pat of patterns) {
    const m = name.match(pat);
    if (m) return m[1].trim();
  }
  return undefined;
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

// ---------------------------------------------------------------------------
// Brand & category conflict detection
// ---------------------------------------------------------------------------

/** Competing brand pairs — if query mentions one side and result mentions the other, penalize. */
const COMPETING_BRANDS: [string[], string[]][] = [
  [["coke", "coca-cola", "coca cola"], ["pepsi"]],
  [["sprite"], ["sierra mist", "starry", "7up", "seven up"]],
  [["dr pepper", "dr. pepper"], ["mr pibb", "pibb"]],
  [["fanta"], ["sunkist", "crush"]],
  [["gatorade"], ["powerade", "bodyarmor"]],
  [["folgers"], ["maxwell house"]],
  [["budweiser", "bud light"], ["miller", "coors"]],
];

/** Category-conflicting word pairs — "coffee beans" should not match "coffee drinks". */
const CATEGORY_CONFLICTS: [string, string][] = [
  ["beans", "drinks"],
  ["beans", "drink"],
  ["beans", "pods"],
  ["beans", "k-cup"],
  ["beans", "capsules"],
  ["ground", "pods"],
  ["ground", "k-cup"],
  ["whole", "skim"],
  ["whole", "nonfat"],
  ["regular", "diet"],
  ["sugar", "sugar-free"],
  ["caffeinated", "decaf"],
  ["sparkling", "still"],
  ["frozen", "fresh"],
  ["canned", "fresh"],
  ["creamy", "crunchy"],
  ["smooth", "chunky"],
  ["white", "wheat"],
  ["original", "vanilla"],
];

/** Words too generic to serve as distinguishing identifiers. */
const STOP_WORDS = new Set([
  "zero", "free", "low", "lite", "light", "large", "small", "medium",
  "big", "mini", "new", "original", "classic", "style", "flavored",
  "flavor", "pack", "size", "value", "organic", "natural", "brand",
  "the", "and", "with", "for", "from",
]);

function normalizeWords(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").split(/\s+/).filter((w) => w.length > 1);
}

function hasCompetingBrand(queryWords: string[], resultWords: string[]): boolean {
  const qText = queryWords.join(" ");
  const rText = resultWords.join(" ");
  for (const [sideA, sideB] of COMPETING_BRANDS) {
    const qInA = sideA.some((b) => qText.includes(b));
    const qInB = sideB.some((b) => qText.includes(b));
    if (qInA && sideB.some((b) => rText.includes(b))) return true;
    if (qInB && sideA.some((b) => rText.includes(b))) return true;
  }
  return false;
}

function hasCategoryConflict(queryWords: string[], resultWords: string[]): boolean {
  for (const [a, b] of CATEGORY_CONFLICTS) {
    if (queryWords.includes(a) && resultWords.includes(b)) return true;
    if (queryWords.includes(b) && resultWords.includes(a)) return true;
  }
  return false;
}

/**
 * Identify the most distinctive words in the query — skip stop words and
 * very short words. If the result doesn't contain ANY of these, it's likely
 * a bad match.
 */
function getMustMatchWords(queryWords: string[]): string[] {
  return queryWords.filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Word-overlap similarity.
 *
 * For short queries (1-2 words), uses the query size as denominator so that
 * "eggs" matching within "Large White Eggs 12 Count" scores 1.0, not 0.17.
 * For longer queries, uses the max of the two word sets to penalize mismatches.
 */
function wordSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter((w) => w.length > 2);
  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
  // Short queries: measure how much of the query was found (recall-oriented)
  // Longer queries: penalize extra unmatched words in either direction
  const denominator = wordsA.size <= 2 ? wordsA.size : Math.max(wordsA.size, wordsB.size);
  return intersection / denominator;
}

/** Minimum score a product must reach to be considered a valid match. */
const MIN_MATCH_SCORE = 0.1;

/**
 * Full relevance score combining word similarity, size preference,
 * brand conflicts, category conflicts, and must-match coverage.
 */
function relevanceScore(
  queryName: string,
  candidateName: string,
  size?: ItemSize
): number {
  const qWords = normalizeWords(queryName);
  const rWords = normalizeWords(candidateName);

  let score = wordSimilarity(queryName, candidateName) + sizeScore(candidateName, size);

  // Competing brand → heavy penalty
  if (hasCompetingBrand(qWords, rWords)) score -= 2;

  // Category conflict → moderate penalty
  if (hasCategoryConflict(qWords, rWords)) score -= 1.5;

  // Must-match words: if none of the distinctive query words appear in the result, penalize
  const mustMatch = getMustMatchWords(qWords);
  if (mustMatch.length > 0) {
    const rSet = new Set(rWords);
    const matched = mustMatch.filter((w) => rSet.has(w)).length;
    if (matched === 0) score -= 1;
  }

  return score;
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
  const key = priceCacheKey(retailer.id, item.name, item.brandPref);
  const cached = await kvGet<CachedPrice>(key);
  if (cached) return { item, ...cached };

  const results = await scrapeProducts([item], retailer);
  return results[0];
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

  // Check KV cache for all items — only scrape the uncached ones
  const cacheChecks = await Promise.all(
    items.map((item) => kvGet<CachedPrice>(priceCacheKey(retailer.id, item.name, item.brandPref)))
  );

  const results: (ProductMatch | null)[] = cacheChecks.map((cached, i) =>
    cached ? { item: items[i], ...cached } : null
  );

  const uncachedIndices = results
    .map((r, i) => (r === null ? i : -1))
    .filter((i) => i >= 0);

  if (uncachedIndices.length === 0) return results as ProductMatch[];

  // One browser session for all uncached items at this store
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
        if (match.price > 0) {
          const key = priceCacheKey(retailer.id, item.name, item.brandPref);
          const cached: CachedPrice = {
            matchedName: match.matchedName,
            matchedSize: match.matchedSize,
            price: match.price,
            retailerId: match.retailerId,
          };
          kvSet(key, cached, PRICE_CACHE_TTL).catch(() => {});
        }
      }
    } finally {
      await page.close().catch(() => {});
    }
  } catch (err) {
    console.error(`[scraper] Browserless error for ${storeKey}:`, err);
    for (const idx of uncachedIndices) {
      if (results[idx] === null) {
        results[idx] = {
          item: items[idx], matchedName: items[idx].name, price: 0, retailerId: retailer.id,
        };
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
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
        matchedSize: result.matchedSize,
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
): Promise<{ matchedName: string; matchedSize?: string; price: number } | null> {
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

    await page.waitForTimeout(500);

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
): Promise<{ matchedName: string; matchedSize?: string; price: number } | null> {
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

  // Score all candidates and pick the best one above the minimum threshold
  let bestProduct: { name: string; price: number } | null = null;
  let bestScore = -Infinity;

  for (const p of products) {
    const score = relevanceScore(originalItemName, p.name, size);
    if (score > bestScore) {
      bestScore = score;
      bestProduct = p;
    }
  }

  if (!bestProduct || bestScore < MIN_MATCH_SCORE) {
    console.log(`[scraper] no match above threshold (best score: ${bestScore.toFixed(2)})`);
    return null;
  }

  const matchedSize = extractSizeLabel(bestProduct.name);
  console.log(`[scraper] best match: "${bestProduct.name}" $${bestProduct.price} (score=${bestScore.toFixed(2)}, size=${matchedSize ?? "n/a"})`);
  return { matchedName: bestProduct.name, matchedSize, price: bestProduct.price };
}
