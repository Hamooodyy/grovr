import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { userProfiles, userFoodPreferences, pantryItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { computeStatus } from "@/lib/freshness";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/recipes/suggest
 * Uses GPT-4o to suggest recipes based on pantry items and user preferences.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Fetch pantry items
  const items = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, profile.id));

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Add some items to your kitchen first" },
      { status: 400 }
    );
  }

  // Fetch food preferences
  const preferences = await db
    .select()
    .from(userFoodPreferences)
    .where(eq(userFoodPreferences.userId, profile.id));

  const likes = preferences.filter((p) => p.type === "like").map((p) => p.preference);
  const dislikes = preferences.filter((p) => p.type === "dislike").map((p) => p.preference);
  const restrictions = preferences.filter((p) => p.type === "restriction").map((p) => p.preference);

  // Build pantry summary with freshness priority
  const pantryList = items.map((item) => {
    const status = item.estimatedExpiry
      ? computeStatus(item.estimatedExpiry)
      : "fresh";
    const qty = item.quantity && item.unit ? `${item.quantity} ${item.unit}` : "";
    const urgency =
      status === "expired" ? " [EXPIRED - use immediately or discard]" :
      status === "urgent" ? " [USE TODAY]" :
      status === "use_soon" ? " [use soon]" : "";
    return `- ${item.name}${qty ? ` (${qty})` : ""}${urgency}`;
  });

  const servings = profile.servingSize === "5_plus" ? "5+"
    : profile.servingSize === "3_4" ? "3-4"
    : profile.servingSize ?? "2";

  const prompt = `You are a home cooking assistant. Suggest 4 recipes based on what the user has in their kitchen.

KITCHEN INVENTORY:
${pantryList.join("\n")}

USER PREFERENCES:
- Servings: ${servings}
- Cooking frequency: ${profile.cookingFrequency ?? "a few times a week"}
${likes.length > 0 ? `- Likes: ${likes.join(", ")}` : ""}
${dislikes.length > 0 ? `- Dislikes (avoid these): ${dislikes.join(", ")}` : ""}
${restrictions.length > 0 ? `- Dietary restrictions: ${restrictions.join(", ")}` : ""}

RULES:
- Prioritize ingredients marked [EXPIRED], [USE TODAY], or [use soon] to reduce waste
- Each recipe should use mostly ingredients from the kitchen inventory
- Keep it practical — home cooking, not restaurant-level
- Mark each ingredient as inPantry: true if it's in the inventory, false if they need to buy it
- Keep missing ingredients to a minimum (1-3 max per recipe)
- Include accurate quantities for each ingredient

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
      max_tokens: 3000,
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
