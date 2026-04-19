import { NextResponse } from "next/server";
import { getNearbyStores } from "@/lib/kroger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");
  const radiusParam = searchParams.get("radius");
  const radius = radiusParam ? Math.min(25, Math.max(1, parseInt(radiusParam, 10))) : 10;

  if (!zip) {
    return NextResponse.json({ error: "zip is required" }, { status: 400 });
  }

  try {
    const stores = await getNearbyStores(zip, radius);
    return NextResponse.json({ stores });
  } catch (err) {
    console.error("[api/stores]", err);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}
