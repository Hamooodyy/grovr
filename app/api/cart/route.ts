import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getValidKrogerToken, addToCart } from "@/lib/kroger";
import type { KrogerCartItem } from "@/lib/kroger";

interface CartRequestBody {
  items: KrogerCartItem[];
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

  const { items } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items must be a non-empty array" },
      { status: 400 }
    );
  }

  try {
    const userToken = await getValidKrogerToken(userId);
    await addToCart(userToken, items);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "KROGER_AUTH_REQUIRED") {
      return NextResponse.json({ error: "KROGER_AUTH_REQUIRED" }, { status: 401 });
    }
    console.error("[api/cart]", err);
    return NextResponse.json({ error: "Failed to add items to cart" }, { status: 500 });
  }
}
