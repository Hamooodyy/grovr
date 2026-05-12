import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildCartUrl } from "@/lib/provider";
import type { Retailer } from "@/lib/types";

interface CartRequestBody {
  retailer: Retailer;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CartRequestBody;
  try {
    body = (await request.json()) as CartRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { retailer } = body;
  if (!retailer) {
    return NextResponse.json({ error: "retailer is required" }, { status: 400 });
  }

  const url = await buildCartUrl(retailer);
  return NextResponse.json({ cartUrl: url });
}
