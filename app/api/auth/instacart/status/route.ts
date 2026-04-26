import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasInstacartConnection } from "@/lib/instacart-session";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connected = await hasInstacartConnection(userId);
  return NextResponse.json({ connected });
}
