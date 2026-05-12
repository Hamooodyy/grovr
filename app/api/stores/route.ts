import { NextResponse } from "next/server";
import { getNearbyStores } from "@/lib/provider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const radiusParam = searchParams.get("radius");
  const radius = radiusParam
    ? Math.min(25, Math.max(1, parseInt(radiusParam, 10)))
    : 10;

  if (!address || !address.trim()) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }
  if (isNaN(radius)) {
    return NextResponse.json(
      { error: "radius must be a number" },
      { status: 400 }
    );
  }

  try {
    const stores = await getNearbyStores(address.trim(), radius);
    return NextResponse.json({ stores });
  } catch (err) {
    console.error("[api/stores]", err);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}
