/**
 * Matches recipe ingredients against the user's kitchen.
 * Shared by Home, the Recipes tab, and recipe detail so their counts always agree.
 * Mirrors the matching order in the backend's /api/pantry/deduct.
 */

import type { PantryItemResponse, RecipeIngredient } from "./api";
import { convertUnits, normalizeUnit } from "./units";

/** have = enough; unit_mismatch = have it but amounts can't be compared; not_enough = have some, but short */
export type IngredientStatus = "have" | "unit_mismatch" | "not_enough" | "missing";

const clean = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
const singular = (s: string) => (s.endsWith("s") ? s.slice(0, -1) : s);

/** Case-insensitive match: exact name, then singular/plural, then partial. Expired items don't count. */
export function findPantryMatch(
  name: string,
  pantry: PantryItemResponse[]
): PantryItemResponse | undefined {
  const target = clean(name);
  const names = pantry
    .filter((p) => p.status !== "expired")
    .map((p) => ({ item: p, name: clean(p.canonicalName ?? p.name) }));
  return (
    names.find((p) => p.name === target)?.item ??
    names.find((p) => singular(p.name) === singular(target))?.item ??
    names.find((p) => p.name.includes(target) || target.includes(p.name))?.item
  );
}

export function getIngredientStatus(
  ing: RecipeIngredient,
  pantry: PantryItemResponse[]
): { status: IngredientStatus; match?: PantryItemResponse } {
  const match = findPantryMatch(ing.name, pantry);
  if (!match || match.quantity == null || match.quantity <= 0) return { status: "missing" };

  const needed = parseFloat(ing.quantity) || 0;
  if (needed <= 0) return { status: "have", match }; // recipe doesn't specify an amount
  if (!match.unit || !ing.unit) return { status: "unit_mismatch", match };

  const pantryUnit = normalizeUnit(match.unit);
  const recipeUnit = normalizeUnit(ing.unit);
  const neededInPantryUnit =
    pantryUnit === recipeUnit ? needed : convertUnits(needed, recipeUnit, pantryUnit);
  if (neededInPantryUnit == null) return { status: "unit_mismatch", match };

  return { status: match.quantity >= neededInPantryUnit ? "have" : "not_enough", match };
}

/** Card counts: "in your kitchen" = have + unit_mismatch; "need" = not_enough + missing. */
export function countKitchenMatches(
  ingredients: RecipeIngredient[],
  pantry: PantryItemResponse[]
): { inKitchen: number; need: number } {
  let inKitchen = 0;
  for (const ing of ingredients) {
    const { status } = getIngredientStatus(ing, pantry);
    if (status === "have" || status === "unit_mismatch") inKitchen++;
  }
  return { inKitchen, need: ingredients.length - inKitchen };
}
