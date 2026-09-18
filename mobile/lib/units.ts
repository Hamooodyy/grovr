/**
 * Unit normalization and conversion for the mobile app.
 * Mirrors the backend lib/units.ts logic.
 */

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
  count: "ct", piece: "ct", pieces: "ct",
  "fl oz": "fl oz", "fluid ounce": "fl oz", "fluid ounces": "fl oz",
};

export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

// Conversion factors to base units: grams (weight), mL (volume), ct (count)
const WEIGHT_TO_GRAMS: Record<string, number> = {
  g: 1,
  oz: 28.3495,
  lbs: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  mL: 1,
  tsp: 4.929,
  tbsp: 14.787,
  "fl oz": 29.574,
  cup: 236.588,
  pint: 473.176,
  quart: 946.353,
  gallon: 3785.41,
};

const COUNT_TO_CT: Record<string, number> = {
  ct: 1,
  dozen: 12,
};

function getToBase(unit: string): number | null {
  const norm = normalizeUnit(unit);
  return WEIGHT_TO_GRAMS[norm] ?? VOLUME_TO_ML[norm] ?? COUNT_TO_CT[norm] ?? null;
}

function getFamily(unit: string): string | null {
  const norm = normalizeUnit(unit);
  if (norm in WEIGHT_TO_GRAMS) return "weight";
  if (norm in VOLUME_TO_ML) return "volume";
  if (norm in COUNT_TO_CT) return "count";
  return null;
}

/**
 * Convert a quantity from one unit to another within the same family.
 * Returns null if units are incompatible.
 */
export function convertUnits(qty: number, fromUnit: string, toUnit: string): number | null {
  const fromFamily = getFamily(fromUnit);
  const toFamily = getFamily(toUnit);
  if (!fromFamily || !toFamily || fromFamily !== toFamily) return null;
  const fromBase = getToBase(fromUnit)!;
  const toBase = getToBase(toUnit)!;
  return (qty * fromBase) / toBase;
}

/**
 * Check if a pantry item has enough quantity to cover a recipe ingredient.
 * Handles cross-unit conversion within the same family.
 */
export function hasEnough(
  pantryQty: number | null,
  pantryUnit: string | null,
  recipeQty: string,
  recipeUnit: string
): boolean {
  if (pantryQty == null || pantryQty <= 0) return false;
  if (!pantryUnit || !recipeUnit) return false;

  const needed = parseFloat(recipeQty) || 0;
  if (needed <= 0) return true; // recipe doesn't specify amount

  const pNorm = normalizeUnit(pantryUnit);
  const rNorm = normalizeUnit(recipeUnit);

  // Exact unit match
  if (pNorm === rNorm) return pantryQty >= needed;

  // Cross-unit conversion
  const converted = convertUnits(needed, rNorm, pNorm);
  if (converted == null) return false; // incompatible units
  return pantryQty >= converted;
}
