import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { userProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * DELETE /api/user/delete
 * Deletes the user's profile data and their Clerk account.
 */
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete profile and all cascading data (preferences, pantry, recipes, shopping list, feedback)
  const profile = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.clerkUserId, userId))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (profile) {
    await db.delete(userProfiles).where(eq(userProfiles.id, profile.id));
  }

  // Delete the Clerk user account
  const clerk = await clerkClient();
  await clerk.users.deleteUser(userId);

  return NextResponse.json({ success: true });
}
