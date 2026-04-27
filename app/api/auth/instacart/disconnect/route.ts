import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { clearInstacartCookies } from "@/lib/instacart-session";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearInstacartCookies(userId);
  return NextResponse.json({ success: true });
}
