import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/kroger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const locationId = searchParams.get("locationId") ?? undefined;

  if (q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  try {
    const products = await searchProducts(q, locationId);
    return NextResponse.json({ products });
  } catch (err) {
    console.error("[api/search]", err);
    // Degrade gracefully — empty suggestions rather than a broken UI
    return NextResponse.json({ products: [] });
  }
}
