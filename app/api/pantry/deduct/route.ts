import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles, pantryItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

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

const UNIT_ALIASES: Record<string, string> = {
  tablespoon: "tbsp", tablespoons: "tbsp",
  teaspoon: "tsp", teaspoons: "tsp",
  ounce: "oz", ounces: "oz",
  pound: "lbs", pounds: "lbs", lb: "lbs",
  gram: "g", grams: "g",
  cup: "cup", cups: "cup",
  pint: "pint", pints: "pint",
  quart: "quart", quarts: "quart",
  gallon: "gallon", gallons: "gallon",
  milliliter: "mL", milliliters: "mL", ml: "mL",
  clove: "clove", cloves: "clove",
  slice: "slice", slices: "slice",
  can: "can", cans: "can",
  stick: "stick", sticks: "stick",
  head: "head", heads: "head",
  sprig: "sprig", sprigs: "sprig",
  bunch: "bunch", bunches: "bunch",
  dozen: "dozen",
  pack: "pack", packs: "pack",
  count: "ct", piece: "ct", pieces: "ct",
  small: "small", medium: "medium", large: "large",
  "fl oz": "fl oz", "fluid ounce": "fl oz", "fluid ounces": "fl oz",
};

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
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
 * Body: { ingredients: Array<{ name, quantity, unit, inPantry }> }
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

  // Only deduct ingredients that are in the pantry and not staples
  const toDeduct = ingredients.filter(
    (ing) => ing.inPantry && !STAPLES.has(ing.name.toLowerCase().trim())
  );

  const userItems = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, profile.id));

  const deducted: string[] = [];
  const removed: string[] = [];
  const skipped: Array<{ name: string; pantryUnit: string | null; recipeUnit: string }> = [];

  for (const ing of toDeduct) {
    const canonical = ing.name.toLowerCase().trim();
    // Find matching pantry item by name
    const match = userItems.find(
      (item) =>
        item.canonicalName === canonical ||
        item.canonicalName.includes(canonical) ||
        canonical.includes(item.canonicalName)
    );
    if (!match) continue;

    const recipeQty = parseFloat(ing.quantity) || 0;

    const unitsMatch = match.unit && ing.unit && normalizeUnit(match.unit) === normalizeUnit(ing.unit);
    if (unitsMatch && match.quantity != null && recipeQty > 0) {
      // Units match — subtract
      const remaining = match.quantity - recipeQty;
      if (remaining <= 0) {
        await db
          .delete(pantryItems)
          .where(and(eq(pantryItems.id, match.id), eq(pantryItems.userId, profile.id)));
        removed.push(match.name);
      } else {
        await db
          .update(pantryItems)
          .set({ quantity: remaining })
          .where(and(eq(pantryItems.id, match.id), eq(pantryItems.userId, profile.id)));
        deducted.push(match.name);
      }
    } else {
      // Units don't match or no quantity — skip, don't delete
      skipped.push({ name: match.name, pantryUnit: match.unit, recipeUnit: ing.unit });
    }
  }

  return NextResponse.json({ deducted, removed, skipped });
}
