import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles, shoppingListItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function getProfile(userId: string) {
  return db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/**
 * GET /api/shopping-list
 * Returns all shopping list items for the user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ items: [] });
  }

  const items = await db
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.userId, profile.id));

  return NextResponse.json({ items });
}

/**
 * POST /api/shopping-list
 * Adds items to the shopping list.
 * Body: { items: Array<{ name, quantity?, unit?, recipeTitle? }> }
 *   or: { name, quantity?, unit?, recipeTitle? } for a single item
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const itemsToAdd = Array.isArray(body.items) ? body.items : [body];

  if (itemsToAdd.length === 0 || !itemsToAdd[0].name) {
    return NextResponse.json({ error: "At least one item name is required" }, { status: 400 });
  }

  const inserted = await db
    .insert(shoppingListItems)
    .values(
      itemsToAdd.map((item: { name: string; quantity?: string; unit?: string; recipeTitle?: string }) => ({
        userId: profile.id,
        name: item.name,
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
        recipeTitle: item.recipeTitle ?? null,
      }))
    )
    .returning();

  return NextResponse.json({ items: inserted });
}

/**
 * PATCH /api/shopping-list
 * Toggles checked state of an item.
 * Body: { id: number, checked: boolean }
 */
export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json();
  if (!body.id || body.checked === undefined) {
    return NextResponse.json({ error: "id and checked are required" }, { status: 400 });
  }

  await db
    .update(shoppingListItems)
    .set({ checked: body.checked })
    .where(
      and(eq(shoppingListItems.id, body.id), eq(shoppingListItems.userId, profile.id))
    );

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/shopping-list
 * Removes an item or all checked items.
 * Body: { id: number } or { clearChecked: true }
 */
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json();

  if (body.clearChecked) {
    await db
      .delete(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.userId, profile.id),
          eq(shoppingListItems.checked, true)
        )
      );
  } else if (body.id) {
    await db
      .delete(shoppingListItems)
      .where(
        and(eq(shoppingListItems.id, body.id), eq(shoppingListItems.userId, profile.id))
      );
  } else {
    return NextResponse.json({ error: "id or clearChecked required" }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
