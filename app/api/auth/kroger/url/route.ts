import { NextResponse } from "next/server";
import { getKrogerAuthUrl } from "@/lib/kroger";

export async function GET() {
  return NextResponse.json({ url: getKrogerAuthUrl() });
}
