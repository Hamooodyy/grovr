/**
 * lib/instacart-session.ts
 *
 * Stores and retrieves Instacart session cookies in Clerk privateMetadata.
 * Same pattern used for Kroger OAuth tokens — cookies never leave the server.
 */

import { clerkClient } from "@clerk/nextjs/server";

interface InstacartMeta {
  instacartCookies?: string;
  instacartConnectedAt?: number;
}

export async function getInstacartCookies(userId: string): Promise<string | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const meta = user.privateMetadata as InstacartMeta;
  return meta.instacartCookies ?? null;
}

export async function saveInstacartCookies(
  userId: string,
  cookies: string
): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      instacartCookies: cookies,
      instacartConnectedAt: Date.now(),
    },
  });
}

export async function hasInstacartConnection(userId: string): Promise<boolean> {
  const cookies = await getInstacartCookies(userId);
  return !!cookies;
}

export async function clearInstacartCookies(userId: string): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      instacartCookies: null,
      instacartConnectedAt: null,
    },
  });
}
