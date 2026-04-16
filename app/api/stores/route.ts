import { NextResponse } from "next/server";
import { getNearbyStores } from "@/lib/kroger";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");

  if (!zip) {
    return NextResponse.json({ error: "zip is required" }, { status: 400 });
  }

  try {
    const stores = await getNearbyStores(zip);
    return NextResponse.json({ stores });
  } catch (err) {
    console.error("[api/stores]", err);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}
