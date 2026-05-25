import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getList,
  saveList,
  getAllLists,
  saveListAs,
  loadList,
  deleteList,
  newList,
} from "@/lib/db/shopping-list";
import type { GroceryItem } from "@/lib/types";

// GET /api/shopping-list          → active list
// GET /api/shopping-list?all=true → all lists summary (for Saved tab)
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get("all") === "true") {
    const lists = await getAllLists(userId);
    return NextResponse.json({ lists });
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

// PUT /api/shopping-list              → auto-save active list
// PUT /api/shopping-list?action=load  → load a saved list { listId }
// PUT /api/shopping-list?action=new   → start a new empty list
export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "load") {
    let body: { listId: number };
    try {
      body = (await request.json()) as { listId: number };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const list = await loadList(userId, body.listId);
    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    return NextResponse.json({
      items: list.items,
      address: list.address,
      radius: list.radius,
    });
  }

  if (action === "new") {
    const list = await newList(userId);
    return NextResponse.json({
      items: list.items,
      address: list.address,
      radius: list.radius,
    });
  }

  // Default: auto-save active list
  let body: { items: GroceryItem[]; address?: string; radius?: number };
  try {
    body = (await request.json()) as {
      items: GroceryItem[];
      address?: string;
      radius?: number;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { items, address, radius } = body;
  if (!Array.isArray(items)) {
    return NextResponse.json(
      { error: "items must be an array" },
      { status: 400 }
    );
  }

  await saveList(userId, items, address, radius);
  return NextResponse.json({ success: true });
}

// POST /api/shopping-list → save current list with a name
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name: string;
    items: GroceryItem[];
    address?: string;
    radius?: number;
  };
  try {
    body = (await request.json()) as {
      name: string;
      items: GroceryItem[];
      address?: string;
      radius?: number;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const result = await saveListAs(
    userId,
    body.name.trim(),
    body.items,
    body.address,
    body.radius
  );

  return NextResponse.json({ success: true, listId: result.id });
}

// DELETE /api/shopping-list → delete a list { listId }
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listId: number };
  try {
    body = (await request.json()) as { listId: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const deleted = await deleteList(userId, body.listId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Cannot delete active list or list not found" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
