import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles, pantryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { computeExpiry, computeStatus, inferCategory } from "@/lib/freshness";
import { normalizeUnit } from "@/lib/units";
import type { PantryCategory } from "@/lib/types";

async function getProfile(userId: string) {
  return db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

const VALID_CATEGORIES = ["fridge", "spice", "pantry"];

function serializeItem(item: typeof pantryItems.$inferSelect) {
  const category = VALID_CATEGORIES.includes(item.category as string)
    ? item.category
    : inferCategory(item.canonicalName);
  return {
    id: item.id,
    name: item.name,
    canonicalName: item.canonicalName,
    category,
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

  // Clean up any items with null/zero quantity (legacy data)
  const nullQtyIds = items
    .filter((i) => i.quantity == null || i.quantity <= 0)
    .map((i) => i.id);
  if (nullQtyIds.length > 0) {
    await Promise.all(
      nullQtyIds.map((id) =>
        db.delete(pantryItems).where(and(eq(pantryItems.id, id), eq(pantryItems.userId, profile.id)))
      )
    );
  }

  const valid = items.filter((i) => i.quantity != null && i.quantity > 0);
  return NextResponse.json({ items: valid.map(serializeItem) });
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
  if (body.quantity == null || typeof body.quantity !== "number" || body.quantity <= 0) {
    return NextResponse.json({ error: "Quantity is required" }, { status: 400 });
  }

  const canonicalName = name.toLowerCase();
  const category: PantryCategory = body.category ?? inferCategory(canonicalName);
  const addedAt = new Date();
  const estimatedExpiry = computeExpiry(addedAt, canonicalName, category);

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Check for existing items with the same canonical name
  const rawUnit = body.unit ?? null;
  const newUnit = rawUnit ? normalizeUnit(rawUnit) : null;
  const existingRows = await db
    .select()
    .from(pantryItems)
    .where(
      and(
        eq(pantryItems.userId, profile.id),
        eq(pantryItems.canonicalName, canonicalName)
      )
    );

  const sameUnit = existingRows.find((r) => {
    const existingNorm = r.unit ? normalizeUnit(r.unit) : null;
    return existingNorm === newUnit;
  }) ?? null;

  // Same name AND same unit → merge quantities (or just return existing if no qty to add)
  if (sameUnit) {
    if (body.quantity != null) {
      const mergedQty = (sameUnit.quantity ?? 0) + body.quantity;
      await db
        .update(pantryItems)
        .set({ quantity: mergedQty, unit: newUnit ?? sameUnit.unit })
        .where(eq(pantryItems.id, sameUnit.id));
      const updated = { ...sameUnit, quantity: mergedQty };
      return NextResponse.json({ item: serializeItem(updated), merged: true });
    }
    // No quantity provided — item already exists, skip duplicate insert
    return NextResponse.json({ item: serializeItem(sameUnit), merged: true });
  }

  // Same name but different unit → insert but flag as duplicate
  const hasDifferentUnit = existingRows.length > 0 && !sameUnit;

  const inserted = await db
    .insert(pantryItems)
    .values({
      userId: profile.id,
      name,
      canonicalName,
      category,
      quantity: body.quantity ?? null,
      unit: newUnit, // already normalized
      addedAt,
      estimatedExpiry,
      status: computeStatus(estimatedExpiry),
    })
    .returning();

  return NextResponse.json({
    item: serializeItem(inserted[0]),
    duplicate: hasDifferentUnit,
    existingUnit: hasDifferentUnit ? (existingRows[0].unit ?? null) : null,
  });
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
