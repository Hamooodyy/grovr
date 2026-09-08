import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles, pantryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { computeExpiry, computeStatus, inferCategory } from "@/lib/freshness";
import type { PantryCategory } from "@/lib/types";

async function getProfile(userId: string) {
  return db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

function serializeItem(item: typeof pantryItems.$inferSelect) {
  return {
    id: item.id,
    name: item.name,
    canonicalName: item.canonicalName,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    addedAt: item.addedAt,
    estimatedExpiry: item.estimatedExpiry,
    status: item.estimatedExpiry
      ? computeStatus(item.estimatedExpiry)
      : (item.status as string),
  };
}

/**
 * GET /api/pantry
 * Returns all pantry items for the authenticated user with computed freshness status.
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
    .from(pantryItems)
    .where(eq(pantryItems.userId, profile.id));

  return NextResponse.json({ items: items.map(serializeItem) });
}

/**
 * POST /api/pantry
 * Adds a new pantry item.
 * Body: { name: string, category?: PantryCategory, quantity?: number, unit?: string }
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name: string = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const canonicalName = name.toLowerCase();
  const category: PantryCategory = body.category ?? inferCategory(canonicalName);
  const addedAt = new Date();
  const estimatedExpiry = computeExpiry(addedAt, canonicalName, category);

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const inserted = await db
    .insert(pantryItems)
    .values({
      userId: profile.id,
      name,
      canonicalName,
      category,
      quantity: body.quantity ?? null,
      unit: body.unit ?? null,
      addedAt,
      estimatedExpiry,
      status: computeStatus(estimatedExpiry),
    })
    .returning();

  return NextResponse.json({ item: serializeItem(inserted[0]) });
}

/**
 * PATCH /api/pantry
 * Updates a pantry item (quantity, unit, category).
 * Body: { id: number, quantity?: number, unit?: string, category?: string }
 */
export async function PATCH(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const itemId: number = body.id;
  if (!itemId) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.quantity !== undefined) updates.quantity = body.quantity;
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.category !== undefined) updates.category = body.category;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  await db
    .update(pantryItems)
    .set(updates)
    .where(
      and(eq(pantryItems.id, itemId), eq(pantryItems.userId, profile.id))
    );

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/pantry
 * Removes a pantry item by ID.
 * Body: { id: number, reason?: "used" | "expired" }
 */
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const itemId: number = body.id;
  if (!itemId) {
    return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // TODO: log removal reason (body.reason) for future analytics
  await db
    .delete(pantryItems)
    .where(
      and(eq(pantryItems.id, itemId), eq(pantryItems.userId, profile.id))
    );

  return NextResponse.json({ success: true });
}
