import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Open Food Facts search — ingredient autocomplete for pantry + shopping list
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
    headers: { "User-Agent": "Grovr/2.0 (grocery companion; contact@grovr.app)" },
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
    return NextResponse.json({ products: [] });
  } catch (err) {
    console.error("[api/search]", err);
    return NextResponse.json({ products: [] });
  }
}
