import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles, recipeFeedback } from "@/lib/db/schema";
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
 * GET /api/recipes/feedback
 * Returns all recipe feedback for the user.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await getProfile(userId);
  if (!profile) {
    return NextResponse.json({ feedback: [] });
  }

  const feedback = await db
    .select()
    .from(recipeFeedback)
    .where(eq(recipeFeedback.userId, profile.id));

  return NextResponse.json({
    feedback: feedback.map((f) => ({
      id: f.id,
      recipeTitle: f.recipeTitle,
      feedback: f.feedback,
    })),
  });
}

/**
 * POST /api/recipes/feedback
 * Saves or updates feedback for a recipe.
 * Body: { recipeTitle: string, feedback: "like" | "dislike" }
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
  if (!body.recipeTitle || !body.feedback) {
    return NextResponse.json({ error: "recipeTitle and feedback required" }, { status: 400 });
  }

  // Check if feedback already exists for this recipe
  const existing = await db
    .select()
    .from(recipeFeedback)
    .where(
      and(
        eq(recipeFeedback.userId, profile.id),
        eq(recipeFeedback.recipeTitle, body.recipeTitle)
      )
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (existing) {
    if (existing.feedback === body.feedback) {
      // Same feedback — remove it (toggle off)
      await db.delete(recipeFeedback).where(eq(recipeFeedback.id, existing.id));
      return NextResponse.json({ removed: true });
    }
    // Different feedback — update
    await db
      .update(recipeFeedback)
      .set({ feedback: body.feedback })
      .where(eq(recipeFeedback.id, existing.id));
    return NextResponse.json({ updated: true, feedback: body.feedback });
  }

  // New feedback
  await db.insert(recipeFeedback).values({
    userId: profile.id,
    recipeTitle: body.recipeTitle,
    feedback: body.feedback,
  });

  return NextResponse.json({ created: true, feedback: body.feedback });
}
