import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles, pantryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { normalizeUnit, convertUnits, sameFamily } from "@/lib/units";

// Staples that don't get deducted — you don't "run out" of these from one recipe
const STAPLES = new Set([
  "salt", "black pepper", "pepper", "olive oil", "vegetable oil",
  "cooking spray", "water", "garlic powder", "onion powder",
  "cumin", "paprika", "oregano", "basil", "cinnamon", "chili powder",
  "red pepper flakes", "italian seasoning", "thyme", "rosemary",
  "bay leaves", "turmeric", "cayenne pepper", "curry powder",
  "nutmeg", "sugar", "flour", "baking soda", "baking powder",
  "vinegar", "soy sauce", "hot sauce",
]);

type PantryRow = typeof pantryItems.$inferSelect;

const clean = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");

/** Finds the kitchen item for a recipe ingredient (case-insensitive): exact, then singular/plural, then partial. */
function findMatch(ingredientName: string, items: PantryRow[]): PantryRow | undefined {
  const target = clean(ingredientName);
  const singular = (s: string) => (s.endsWith("s") ? s.slice(0, -1) : s);
  const names = items.map((item) => ({ item, name: clean(item.canonicalName) }));
  return (
    names.find((n) => n.name === target)?.item ??
    names.find((n) => singular(n.name) === singular(target))?.item ??
    names.find((n) => n.name.includes(target) || target.includes(n.name))?.item
  );
}

async function getProfile(userId: string) {
  return db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/**
 * POST /api/pantry/deduct
 * Subtracts recipe ingredients from the user's pantry.
 * Matches against the current kitchen, not the recipe's inPantry flag (which is an LLM guess
 * frozen at generation/save time).
 * Body: { ingredients: Array<{ name, quantity, unit }> }
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
  const ingredients: Array<{ name: string; quantity: string; unit: string; inPantry: boolean }> =
    body.ingredients ?? [];

  // Staples aren't deducted
  const toDeduct = ingredients.filter(
    (ing) => !STAPLES.has(clean(ing.name))
  );

  const userItems = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, profile.id));

  const deducted: string[] = [];
  const removed: string[] = [];
  const skipped: Array<{ name: string; pantryUnit: string | null; recipeUnit: string }> = [];

  for (const ing of toDeduct) {
    const match = findMatch(ing.name, userItems);
    if (!match) continue;

    // Null quantity means 0 — remove the item
    if (match.quantity == null || match.quantity <= 0) {
      await db
        .delete(pantryItems)
        .where(and(eq(pantryItems.id, match.id), eq(pantryItems.userId, profile.id)));
      removed.push(match.name);
      continue;
    }

    const recipeQty = parseFloat(ing.quantity) || 0;
    if (!match.unit || !ing.unit || recipeQty <= 0) {
      skipped.push({ name: match.name, pantryUnit: match.unit, recipeUnit: ing.unit });
      continue;
    }

    const pantryUnit = normalizeUnit(match.unit);
    const recipeUnit = normalizeUnit(ing.unit);

    if (pantryUnit === recipeUnit) {
      // Exact unit match — subtract directly
      const remaining = match.quantity - recipeQty;
      if (remaining <= 0) {
        await db
          .delete(pantryItems)
          .where(and(eq(pantryItems.id, match.id), eq(pantryItems.userId, profile.id)));
        removed.push(match.name);
      } else {
        await db
          .update(pantryItems)
          .set({ quantity: Math.round(remaining * 100) / 100 })
          .where(and(eq(pantryItems.id, match.id), eq(pantryItems.userId, profile.id)));
        deducted.push(match.name);
      }
    } else if (sameFamily(pantryUnit, recipeUnit)) {
      // Same family (e.g., lbs vs g, dozen vs ct) — convert recipe qty to pantry unit
      const convertedRecipeQty = convertUnits(recipeQty, recipeUnit, pantryUnit);
      if (convertedRecipeQty == null) {
        skipped.push({ name: match.name, pantryUnit: match.unit, recipeUnit: ing.unit });
        continue;
      }
      const remaining = match.quantity - convertedRecipeQty;
      if (remaining <= 0) {
        await db
          .delete(pantryItems)
          .where(and(eq(pantryItems.id, match.id), eq(pantryItems.userId, profile.id)));
        removed.push(match.name);
      } else {
        await db
          .update(pantryItems)
          .set({ quantity: Math.round(remaining * 100) / 100 })
          .where(and(eq(pantryItems.id, match.id), eq(pantryItems.userId, profile.id)));
        deducted.push(match.name);
      }
    } else {
      // Incompatible unit families — skip
      skipped.push({ name: match.name, pantryUnit: match.unit, recipeUnit: ing.unit });
    }
  }

  return NextResponse.json({ deducted, removed, skipped });
}
