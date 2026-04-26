/**
 * Quick diagnostic: run scrapeInstacartStores with no cookies to see
 * what the browser actually renders on the grocery directory page.
 *
 * Usage:
 *   node scripts/test-scraper.mjs [cookies_string]
 *
 * Screenshots are saved to:
 *   /tmp/instacart-debug.png         (immediately after landing)
 *   /tmp/instacart-debug-rendered.png (after 4s wait)
 */

import { chromium } from "playwright";
import { writeFile } from "fs/promises";

const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  window.chrome = { runtime: {} };
  Object.defineProperty(navigator, 'permissions', {
    get: () => ({ query: () => Promise.resolve({ state: 'granted' }) }),
  });
`;

const cookiesArg = process.argv[2] ?? null;

console.log(`[test] instacartCookies: ${cookiesArg ? `${cookiesArg.slice(0, 60)}…` : "none"}`);

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

if (cookiesArg) {
  let injected = 0;
  for (const pair of cookiesArg.split(";")) {
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
        ...(name.startsWith("__Host-") || name.startsWith("__Secure-") ? { secure: true } : {}),
      }]);
      injected++;
    } catch (e) {
      console.warn(`[test] skip cookie "${name}": ${e.message}`);
    }
  }
  console.log(`[test] injected ${injected} cookies`);
}

const page = await context.newPage();

console.log("[test] navigating to store/directory?filter=grocery…");
await page.goto("https://www.instacart.com/store/directory?filter=grocery", {
  waitUntil: "domcontentloaded",
  timeout: 30_000,
});

console.log(`[test] title: "${await page.title()}"`);
console.log(`[test] url: ${page.url()}`);

await page.screenshot({ path: "/tmp/instacart-debug.png", fullPage: false });
console.log("[test] screenshot saved → /tmp/instacart-debug.png");

await page.waitForTimeout(4_000);

await page.screenshot({ path: "/tmp/instacart-debug-rendered.png", fullPage: false });
console.log("[test] post-render screenshot saved → /tmp/instacart-debug-rendered.png");

const allStoreHrefs = await page.$$eval(
  'a[href*="/store/"]',
  (anchors) => anchors.map((a) => a.getAttribute("href") ?? "").filter(Boolean)
);
console.log(`[test] all /store/ hrefs: ${allStoreHrefs.length}`);
if (allStoreHrefs.length > 0) {
  console.log("[test] sample hrefs:", allStoreHrefs.slice(0, 15));
}

// Also check /storefront specifically
const storefrontHrefs = allStoreHrefs.filter((h) => /\/store\/([^/]+)\/storefront/.test(h));
console.log(`[test] /storefront hrefs: ${storefrontHrefs.length}`);
if (storefrontHrefs.length > 0) {
  console.log("[test] storefront hrefs:", storefrontHrefs);
}

// Get the page text to check if we're logged in
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log("[test] page body text (first 500 chars):", bodyText);

await browser.close();
console.log("[test] done");
