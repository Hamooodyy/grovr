import type { PantryCategory, PantryItemStatus } from "./types";

/**
 * Default shelf life in days by category.
 */
const SHELF_LIFE_DAYS: Record<PantryCategory, number> = {
  fridge: 5,
  spice: 1095,
  pantry: 365,
};

/**
 * Known overrides for specific items (canonical name → days).
 */
const ITEM_SHELF_LIFE: Record<string, number> = {
  // Fridge — produce
  berries: 3,
  strawberries: 3,
  blueberries: 4,
  raspberries: 3,
  bananas: 5,
  avocado: 4,
  lettuce: 5,
  spinach: 5,
  tomatoes: 7,
  carrots: 21,
  "bell peppers": 7,
  broccoli: 5,
  lemons: 21,
  apples: 21,
  mushrooms: 5,
  celery: 14,
  cucumber: 7,
  zucchini: 5,
  corn: 3,
  grapes: 7,

  // Fridge — meat
  "chicken breast": 2,
  chicken: 2,
  "ground beef": 2,
  steak: 3,
  salmon: 2,
  shrimp: 2,
  bacon: 7,
  "deli meat": 5,
  pork: 3,
  sausage: 3,

  // Fridge — dairy
  milk: 7,
  eggs: 21,
  butter: 30,
  cheese: 21,
  yogurt: 10,
  "sour cream": 14,
  "cream cheese": 14,
  "heavy cream": 7,

  // Pantry — dry goods
  rice: 730,
  pasta: 730,
  bread: 5,
  flour: 365,
  oats: 365,
  sugar: 730,
  "brown sugar": 365,
  "baking soda": 730,
  "baking powder": 365,
  "peanut butter": 180,
  honey: 1095,
  cereal: 180,
  "canned tomatoes": 730,
  "canned beans": 730,
  "chicken broth": 365,
  tortillas: 14,
  crackers: 180,

  // Pantry — oils & sauces
  "olive oil": 730,
  "vegetable oil": 730,
  "soy sauce": 730,
  vinegar: 730,
  ketchup: 365,
  mustard: 365,
  "hot sauce": 730,
  "maple syrup": 365,

  // Pantry — root veg (long shelf life, don't need fridge)
  potatoes: 21,
  onions: 30,
  garlic: 21,

  // Spices — all ~3 years
  salt: 1825,
  "black pepper": 1095,
  "garlic powder": 1095,
  "onion powder": 1095,
  cumin: 1095,
  paprika: 1095,
  "chili powder": 1095,
  oregano: 1095,
  basil: 1095,
  cinnamon: 1095,
  "red pepper flakes": 1095,
  turmeric: 1095,
  "italian seasoning": 1095,
  "bay leaves": 1095,
  thyme: 1095,
  rosemary: 1095,
  nutmeg: 1095,
  "cayenne pepper": 1095,
  "curry powder": 1095,
  ginger: 1095,
};

/**
 * Auto-categorize an item by its canonical name.
 */
const FRIDGE_KEYWORDS = [
  "chicken",
  "beef",
  "pork",
  "salmon",
  "shrimp",
  "fish",
  "steak",
  "bacon",
  "sausage",
  "deli",
  "turkey",
  "lamb",
  "milk",
  "eggs",
  "egg",
  "butter",
  "cheese",
  "yogurt",
  "cream",
  "lettuce",
  "spinach",
  "kale",
  "arugula",
  "broccoli",
  "celery",
  "cucumber",
  "zucchini",
  "mushroom",
  "berries",
  "strawberr",
  "blueberr",
  "raspberr",
  "grape",
  "tomato",
  "bell pepper",
  "avocado",
  "corn",
  "carrot",
  "lemon",
  "lime",
  "apple",
  "banana",
  "orange",
  "melon",
  "mango",
  "pineapple",
  "peach",
  "pear",
  "tofu",
  "hummus",
  "juice",
  "salsa",
];

const SPICE_KEYWORDS = [
  "salt",
  "pepper",
  "cumin",
  "paprika",
  "oregano",
  "basil",
  "cinnamon",
  "turmeric",
  "thyme",
  "rosemary",
  "nutmeg",
  "cayenne",
  "chili powder",
  "garlic powder",
  "onion powder",
  "italian seasoning",
  "bay leaves",
  "red pepper flakes",
  "curry",
  "ginger",
  "cloves",
  "allspice",
  "dill",
  "parsley",
  "sage",
  "seasoning",
  "spice",
];

export function inferCategory(canonicalName: string): PantryCategory {
  const name = canonicalName.toLowerCase();

  if (SPICE_KEYWORDS.some((kw) => name.includes(kw))) return "spice";
  if (FRIDGE_KEYWORDS.some((kw) => name.includes(kw))) return "fridge";
  return "pantry";
}

/**
 * Returns the estimated shelf life in days for an item.
 */
export function getShelfLifeDays(
  canonicalName: string,
  category: PantryCategory
): number {
  return ITEM_SHELF_LIFE[canonicalName] ?? SHELF_LIFE_DAYS[category];
}

/**
 * Computes the estimated expiry date from the added date.
 */
export function computeExpiry(
  addedAt: Date,
  canonicalName: string,
  category: PantryCategory
): Date {
  const days = getShelfLifeDays(canonicalName, category);
  const expiry = new Date(addedAt);
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * Derives the freshness status from the expiry date.
 *
 * - fresh: more than 3 days left
 * - use_soon: 1–3 days left
 * - urgent: less than 1 day left (expires today)
 * - expired: past expiry
 */
export function computeStatus(estimatedExpiry: Date): PantryItemStatus {
  const now = new Date();
  const diffMs = estimatedExpiry.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "expired";
  if (diffDays < 1) return "urgent";
  if (diffDays < 3) return "use_soon";
  return "fresh";
}
