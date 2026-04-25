import { NextResponse } from "next/server";
import { getNearbyStores } from "@/lib/provider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");
  const radiusParam = searchParams.get("radius");
  const radius = radiusParam ? Math.min(25, Math.max(1, parseInt(radiusParam, 10))) : 10;

  // Validate ZIP — must be exactly 5 digits to prevent SSRF via malformed input
  if (!zip) {
    return NextResponse.json({ error: "zip is required" }, { status: 400 });
  }
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "zip must be a 5-digit US ZIP code" }, { status: 400 });
  }
  if (isNaN(radius)) {
    return NextResponse.json({ error: "radius must be a number" }, { status: 400 });
  }

  try {
    const stores = await getNearbyStores(zip, radius);
    return NextResponse.json({ stores });
  } catch (err) {
    console.error("[api/stores]", err);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}
