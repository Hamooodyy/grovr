/**
 * POST /api/auth/instacart/connect
 *
 * Launches a visible (non-headless) Playwright browser window so the user
 * can log into Instacart normally. Once login is detected, captures the
 * session cookies and stores them in Clerk privateMetadata.
 *
 * Only works locally — a display is required to show the browser window.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { chromium } from "playwright";
import { saveInstacartCookies } from "@/lib/instacart-session";

// Allow up to 5 minutes for the user to complete login
export const maxDuration = 300;

const LOGIN_TIMEOUT_MS = 5 * 60 * 1_000;

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let browser;
  try {
    // Non-headless — opens a real visible browser window on the user's machine
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Navigate directly to the login page
    await page.goto("https://www.instacart.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });

    // Wait until the user has logged in — detected when the URL moves away
    // from /login and /signup to a regular Instacart page
    await page.waitForURL(
      (url) =>
        !url.pathname.includes("/login") &&
        !url.pathname.includes("/signup") &&
        !url.pathname.includes("/register") &&
        url.hostname.includes("instacart.com"),
      { timeout: LOGIN_TIMEOUT_MS }
    );

    // Give the page a moment to set all post-login cookies
    await page.waitForTimeout(2_000);

    const allCookies = await context.cookies();

    // Keep only instacart.com cookies and strip to the fields needed for
    // re-injection (name, value, domain, path, secure). Dropping httpOnly,
    // sameSite, and expires keeps the payload well under Clerk's 8KB metadata
    // limit — a full Playwright cookie dump with all attributes exceeds it.
    const cookies = allCookies
      .filter((c) => c.domain.includes("instacart.com"))
      .map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        secure: c.secure,
      }));

    const cookieJson = JSON.stringify(cookies);

    console.log(`[instacart-connect] captured ${allCookies.length} total cookies, keeping ${cookies.length} instacart.com cookies (${cookieJson.length} bytes)`);

    await saveInstacartCookies(userId, cookieJson);

    return NextResponse.json({ success: true, cookieCount: cookies.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[instacart-connect] error:", message);

    if (message.includes("Timeout")) {
      return NextResponse.json(
        { error: "Login timed out — please try again and complete login within 5 minutes" },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: "Failed to capture Instacart session" },
      { status: 500 }
    );
  } finally {
    await browser?.close();
  }
}
