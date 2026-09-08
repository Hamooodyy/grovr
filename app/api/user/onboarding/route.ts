import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles, userFoodPreferences, pantryItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/user/onboarding
 * Returns the user's profile and food preferences.
 * Creates a profile row if none exists yet.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!profile) {
    const inserted = await db
      .insert(userProfiles)
      .values({ clerkUserId: userId })
      .returning();
    profile = inserted[0];
  }

  const preferences = await db
    .select()
    .from(userFoodPreferences)
    .where(eq(userFoodPreferences.userId, profile.id));

  return NextResponse.json({
    profile: {
      householdType: profile.householdType,
      cookingFrequency: profile.cookingFrequency,
      cookingTimes: profile.cookingTimes,
      servingSize: profile.servingSize,
      preferredStore: profile.preferredStore,
      onboardingDone: profile.onboardingDone,
    },
    preferences: preferences.map((p) => ({
      preference: p.preference,
      type: p.type,
    })),
  });
}

/**
 * PUT /api/user/onboarding
 * Updates the user's onboarding data (partial updates supported).
 */
export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Ensure profile exists
  let profile = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!profile) {
    const inserted = await db
      .insert(userProfiles)
      .values({ clerkUserId: userId })
      .returning();
    profile = inserted[0];
  }

  // Update profile fields if provided
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.householdType !== undefined) updates.householdType = body.householdType;
  if (body.cookingFrequency !== undefined) updates.cookingFrequency = body.cookingFrequency;
  if (body.cookingTimes !== undefined) updates.cookingTimes = body.cookingTimes;
  if (body.servingSize !== undefined) updates.servingSize = body.servingSize;
  if (body.preferredStore !== undefined) updates.preferredStore = body.preferredStore;
  if (body.onboardingDone !== undefined) updates.onboardingDone = body.onboardingDone;

  await db
    .update(userProfiles)
    .set(updates)
    .where(eq(userProfiles.id, profile.id));

  // Replace food preferences if provided
  if (body.preferences !== undefined && Array.isArray(body.preferences)) {
    await db
      .delete(userFoodPreferences)
      .where(eq(userFoodPreferences.userId, profile.id));

    if (body.preferences.length > 0) {
      await db.insert(userFoodPreferences).values(
        body.preferences.map((p: { preference: string; type: string }) => ({
          userId: profile.id,
          preference: p.preference,
          type: p.type,
        }))
      );
    }
  }

  // Insert pantry items if provided
  if (body.pantryItems !== undefined && Array.isArray(body.pantryItems)) {
    if (body.pantryItems.length > 0) {
      await db.insert(pantryItems).values(
        body.pantryItems.map((item: { name: string; category?: string }) => ({
          userId: profile.id,
          name: item.name,
          canonicalName: item.name.toLowerCase().trim(),
          category: item.category ?? "other",
        }))
      );
    }
  }

  return NextResponse.json({ success: true });
}
