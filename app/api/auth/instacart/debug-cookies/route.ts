/**
 * GET /api/auth/instacart/debug-cookies
 *
 * DEV ONLY — returns the raw stored cookie string so it can be piped into
 * scripts/test-scraper.mjs for local debugging.
 * Remove this route before deploying to production.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getInstacartCookies } from "@/lib/instacart-session";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Dev only" }, { status: 403 });
  }
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cookies = await getInstacartCookies(userId);
  if (!cookies) return NextResponse.json({ error: "No cookies stored" }, { status: 404 });

  const isJson = cookies.trim().startsWith("[");
  return NextResponse.json({ format: isJson ? "json" : "legacy", cookieCount: isJson ? JSON.parse(cookies).length : cookies.split(";").length, cookies });
}
