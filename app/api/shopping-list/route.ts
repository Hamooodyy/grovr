import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getList, saveList } from "@/lib/db/shopping-list";
import type { GroceryItem } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const list = await getList(userId);
  if (!list) {
    return NextResponse.json({ items: [], address: null, radius: 5 });
  }

  return NextResponse.json({
    items: list.items,
    address: list.address,
    radius: list.radius,
  });
}

interface SaveRequestBody {
  items: GroceryItem[];
  address?: string;
  radius?: number;
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: SaveRequestBody;
  try {
    body = (await request.json()) as SaveRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { items, address, radius } = body;
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "items must be an array" }, { status: 400 });
  }

  await saveList(userId, items, address, radius);
  return NextResponse.json({ success: true });
}
