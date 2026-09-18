/**
 * Shared unit normalization for pantry operations.
 * Used by both the pantry POST (dedup) and deduct routes.
 */

export const UNIT_ALIASES: Record<string, string> = {
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

// ── Unit conversion ──

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

type UnitFamily = "weight" | "volume" | "count";

interface ConversionInfo {
  family: UnitFamily;
  toBase: number; // multiply by this to get base unit value
}

function getConversionInfo(unit: string): ConversionInfo | null {
  const norm = normalizeUnit(unit);
  if (norm in WEIGHT_TO_GRAMS) return { family: "weight", toBase: WEIGHT_TO_GRAMS[norm] };
  if (norm in VOLUME_TO_ML) return { family: "volume", toBase: VOLUME_TO_ML[norm] };
  if (norm in COUNT_TO_CT) return { family: "count", toBase: COUNT_TO_CT[norm] };
  return null;
}

/**
 * Convert a quantity from one unit to another within the same family.
 * Returns null if units are incompatible (different families or unknown).
 */
export function convertUnits(
  qty: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const from = getConversionInfo(fromUnit);
  const to = getConversionInfo(toUnit);
  if (!from || !to || from.family !== to.family) return null;
  const baseValue = qty * from.toBase;
  return baseValue / to.toBase;
}

/**
 * Check whether two units belong to the same conversion family.
 */
export function sameFamily(unitA: string, unitB: string): boolean {
  const a = getConversionInfo(unitA);
  const b = getConversionInfo(unitB);
  return a !== null && b !== null && a.family === b.family;
}
