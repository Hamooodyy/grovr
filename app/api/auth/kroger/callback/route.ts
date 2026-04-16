import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { exchangeCodeForUserToken } from "@/lib/kroger";

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/dashboard?kroger_auth=error", request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForUserToken(code);
    const client = await clerkClient();

    await client.users.updateUserMetadata(userId, {
      privateMetadata: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      },
    });

    return NextResponse.redirect(
      new URL("/dashboard?kroger_auth=success", request.url)
    );
  } catch (err) {
    console.error("[api/auth/kroger/callback]", err);
    return NextResponse.redirect(
      new URL("/dashboard?kroger_auth=error", request.url)
    );
  }
}
