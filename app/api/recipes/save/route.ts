import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles, savedRecipes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

async function getProfile(userId: string) {
  return db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

/**
 * GET /api/recipes/save
 * Returns all saved recipes for the user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ recipes: [] });
  }

  const recipes = await db
    .select()
    .from(savedRecipes)
    .where(eq(savedRecipes.userId, profile.id));

  return NextResponse.json({
    recipes: recipes.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      cookTime: r.cookTime,
      difficulty: r.difficulty,
      servings: r.servings,
      ingredients: r.ingredients,
      instructions: r.instructions,
      createdAt: r.createdAt,
    })),
  });
}

/**
 * POST /api/recipes/save
 * Saves a recipe.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  if (!body.title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const inserted = await db
    .insert(savedRecipes)
    .values({
      userId: profile.id,
      title: body.title,
      description: body.description ?? null,
      cookTime: body.cookTime ?? null,
      difficulty: body.difficulty ?? null,
      servings: body.servings ?? null,
      ingredients: body.ingredients ?? [],
      instructions: body.instructions ?? [],
    })
    .returning();

  return NextResponse.json({ recipe: inserted[0] });
}

/**
 * DELETE /api/recipes/save
 * Removes a saved recipe by ID.
 */
export async function DELETE(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const recipeId: number = body.id;
  if (!recipeId) {
    return NextResponse.json({ error: "Recipe ID is required" }, { status: 400 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await db
    .delete(savedRecipes)
    .where(
      and(eq(savedRecipes.id, recipeId), eq(savedRecipes.userId, profile.id))
    );

  return NextResponse.json({ success: true });
}
