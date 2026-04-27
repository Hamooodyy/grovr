import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Open Food Facts search v2 — search.openfoodfacts.org
// More reliable than the legacy CGI endpoint (which 503s regularly).
// ---------------------------------------------------------------------------

interface OFFHit {
  code?: string;
  product_name?: string;
  brands?: string | string[];
  image_front_small_url?: string;
}

interface OFFSearchResponse {
  hits?: OFFHit[];
}

async function searchOpenFoodFacts(q: string) {
  const url =
    `https://search.openfoodfacts.org/search` +
    `?q=${encodeURIComponent(q)}&page=1&page_size=8` +
    `&fields=product_name,brands,image_front_small_url,code`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Grovr/1.0 (grocery price comparison; contact@grovr.app)" },
    signal: AbortSignal.timeout(6000),
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as OFFSearchResponse;

  return (data.hits ?? [])
    .filter((p) => p.product_name && p.product_name.trim().length > 0)
    .slice(0, 5)
    .map((p, i) => {
      const brandRaw = p.brands;
      const brand = Array.isArray(brandRaw)
        ? brandRaw[0]?.trim()
        : brandRaw?.split(",")[0]?.trim();
      return {
        productId: p.code ?? `off-${i}`,
        upc: p.code ?? "",
        name: p.product_name!.trim(),
        brand: brand || undefined,
        imageUrl: p.image_front_small_url || undefined,
      };
    });
}

// ---------------------------------------------------------------------------
// Kroger fallback — fires only when OFF is unavailable
// ---------------------------------------------------------------------------

async function searchKroger(q: string) {
  try {
    const { searchProducts } = await import("@/lib/kroger");
    return await searchProducts(q, undefined);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await searchOpenFoodFacts(q);
    if (products && products.length > 0) {
      return NextResponse.json({ products });
    }
    // OFF returned nothing (or is down) — fall back to Kroger
    const fallback = await searchKroger(q);
    return NextResponse.json({ products: fallback });
  } catch (err) {
    console.error("[api/search]", err);
    // Last-resort Kroger fallback
    const fallback = await searchKroger(q);
    return NextResponse.json({ products: fallback });
  }
}
