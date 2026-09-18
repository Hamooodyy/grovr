import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { userProfiles, userFoodPreferences, pantryItems, recipeFeedback } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { computeStatus } from "@/lib/freshness";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 25000,
});

/**
 * POST /api/recipes/suggest
 * Uses GPT-4o to suggest recipes based on pantry items and user preferences.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Optional params: count (default 4), exclude (titles to skip), ingredient (must-use)
  let recipeCount = 4;
  let excludeTitles: string[] = [];
  let mustUseIngredient: string | null = null;
  try {
    const body = await request.json();
    if (body.count && typeof body.count === "number") recipeCount = Math.min(body.count, 6);
    if (Array.isArray(body.exclude)) excludeTitles = body.exclude;
    if (typeof body.ingredient === "string" && body.ingredient.trim()) mustUseIngredient = body.ingredient.trim();
  } catch {
    // No body or invalid JSON — use defaults
  }

  const profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Fetch pantry, preferences, and feedback in parallel
  const [items, preferences, feedback] = await Promise.all([
    db.select().from(pantryItems).where(eq(pantryItems.userId, profile.id)),
    db.select().from(userFoodPreferences).where(eq(userFoodPreferences.userId, profile.id)),
    db.select().from(recipeFeedback).where(eq(recipeFeedback.userId, profile.id)),
  ]);

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Add some items to your kitchen first" },
      { status: 400 }
    );
  }

  const likes = preferences.filter((p) => p.type === "like").map((p) => p.preference);
  const dislikes = preferences.filter((p) => p.type === "dislike").map((p) => p.preference);
  const restrictions = preferences.filter((p) => p.type === "restriction").map((p) => p.preference);

  const likedRecipes = feedback.filter((f) => f.feedback === "like").map((f) => f.recipeTitle);
  const dislikedRecipes = feedback.filter((f) => f.feedback === "dislike").map((f) => f.recipeTitle);

  // Build pantry summary — exclude expired items entirely
  const pantryList = items
    .filter((item) => {
      const status = item.estimatedExpiry ? computeStatus(item.estimatedExpiry) : "fresh";
      return status !== "expired";
    })
    .map((item) => {
      const status = item.estimatedExpiry ? computeStatus(item.estimatedExpiry) : "fresh";
      const qty = item.quantity && item.unit ? `${item.quantity} ${item.unit}` : "";
      const urgency =
        status === "urgent" ? " [USE TODAY]" :
        status === "use_soon" ? " [use soon]" : "";
      return `- ${item.name}${qty ? ` (${qty})` : ""}${urgency}`;
    });

  const servings = profile.servingSize === "5_plus" ? "5+"
    : profile.servingSize === "3_4" ? "3-4"
    : profile.servingSize ?? "2";

  const cookTimeMap: Record<string, string> = {
    "15_20": "quick meals under 20 minutes",
    "30": "about 30 minutes",
    "enjoy": "45-60 minutes (enjoys cooking)",
    "depends": "flexible",
  };
  const cookTimes = (profile.cookingTimes ?? [])
    .map((t) => cookTimeMap[t] ?? t)
    .join(", ");

  const frequencyMap: Record<string, string> = {
    daily: "every day",
    few_times: "a few times a week",
    once_twice: "once or twice a week",
    not_often: "not very often",
  };
  const frequency = frequencyMap[profile.cookingFrequency ?? ""] ?? "a few times a week";

  const prompt = `You are a home cooking assistant. Suggest ${recipeCount} delicious, real-world recipes that the user would actually want to cook.
${mustUseIngredient ? `\nIMPORTANT: Every recipe MUST use "${mustUseIngredient}" as a key ingredient. The user specifically wants to cook with this.\n` : ""}${excludeTitles.length > 0 ? `\nDO NOT suggest any of these recipes (already shown):\n${excludeTitles.map((t) => `- ${t}`).join("\n")}\n` : ""}

KITCHEN INVENTORY (what they already have):
${pantryList.join("\n")}

USER PROFILE:
- Serves: ${servings} people
- Cooks: ${frequency}
- Preferred cook time: ${cookTimes || "no preference"}
${likes.length > 0 ? `- Favorite cuisines: ${likes.join(", ")}` : ""}
${dislikes.length > 0 ? `- Ingredients/foods they HATE (never include these): ${dislikes.join(", ")}` : ""}
${restrictions.length > 0 ? `- Dietary restrictions: ${restrictions.join(", ")}` : ""}
${likedRecipes.length > 0 ? `\nPAST RECIPES THEY LIKED (suggest similar styles):\n${likedRecipes.map((r) => `- ${r}`).join("\n")}` : ""}
${dislikedRecipes.length > 0 ? `\nPAST RECIPES THEY DISLIKED (avoid similar styles):\n${dislikedRecipes.map((r) => `- ${r}`).join("\n")}` : ""}

RULES:
- Suggest recipes that match their favorite cuisines and cooking style
- Recipes MUST respect their cook time preference — if they like quick meals, don't suggest a 2-hour braise
- NEVER include ingredients or foods they hate
- NEVER use expired ingredients. If ingredients are marked [USE TODAY] or [use soon], try to use them in at least 1-2 recipes to reduce waste
- Mark each ingredient as inPantry: true if it matches something in the inventory above, false if they need to buy it
- Include a good variety — different cuisines, proteins, and cooking styles
- Keep it practical — home cooking, not restaurant-level

RECIPE MIX (critical):
- Recipes 1-${Math.floor(recipeCount / 2)}: PANTRY recipes. Build these around what's in the kitchen inventory above. Use as many existing ingredients as possible, and only add a few extras
- Recipes ${Math.floor(recipeCount / 2) + 1}-${recipeCount}: DISCOVERY recipes. These must IGNORE the kitchen inventory entirely. Suggest completely new dishes with ingredients the user does NOT already have. Think of these as "what if you tried something totally different." Do not force-include pantry items in these — treat them as if the kitchen is empty and recommend based only on their cuisine preferences and cooking style
- Vary proteins, cuisines, and cooking styles across all ${recipeCount} recipes

INGREDIENT FORMATTING (critical):
- "name" must be a plain grocery item name — exactly what you'd see on a shelf or shopping list
  GOOD: "red bell pepper", "chicken breast", "cheddar cheese", "yellow onion"
  BAD: "assorted bell peppers, sliced", "boneless skinless chicken breast, cubed", "freshly grated parmesan"
- NO prep instructions in the name (no "diced", "sliced", "minced", "chopped", "grated", "cubed", etc.)
- NO descriptive modifiers like "fresh", "assorted", "quality", "good". Only include modifiers that distinguish the product (e.g. "red bell pepper" vs "green bell pepper")
- If a recipe needs multiple colors/types, list each as a separate ingredient with its own quantity (e.g. 1 red bell pepper + 1 green bell pepper, NOT "2 assorted bell peppers")
- "quantity" must be a number as a string (e.g. "1", "0.5", "2")
- "unit" must be one of: ct, oz, lbs, g, tsp, tbsp, cup, fl oz, pint, quart, gallon, mL, clove, slice, can, stick, head, sprig, dozen, bunch
- Prep details (slicing, dicing, marinating) belong in the instructions, NOT in the ingredient name

Return ONLY valid JSON matching this schema:
{
  "recipes": [
    {
      "title": "string",
      "description": "string (1 sentence)",
      "cookTime": "string (e.g. '25 min')",
      "difficulty": "Easy" | "Medium" | "Hard",
      "servings": number,
      "ingredients": [
        { "name": "string", "quantity": "string", "unit": "string", "inPantry": boolean }
      ],
      "instructions": ["step 1", "step 2", ...]
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: recipeCount === 1 ? 1000 : 3000,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Recipe suggestion error:", err);
    return NextResponse.json(
      { error: "Failed to generate recipes" },
      { status: 500 }
    );
  }
}
