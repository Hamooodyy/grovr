import { eq } from "drizzle-orm";
import { db } from "./index";
import { shoppingLists, shoppingListItems } from "./schema";
import type { GroceryItem } from "../types";

interface SavedList {
  items: GroceryItem[];
  address: string | null;
  radius: number;
  updatedAt: Date;
}

/**
 * Load the user's active shopping list from Postgres.
 */
export async function getList(userId: string): Promise<SavedList | null> {
  try {
    const lists = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.userId, userId))
      .limit(1);

    if (lists.length === 0) return null;

    const list = lists[0];
    const rows = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.listId, list.id))
      .orderBy(shoppingListItems.position);

    const items: GroceryItem[] = rows.map((row) => ({
      id: row.clientId,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      brandPref: row.brandPref ?? undefined,
      size: (row.size as GroceryItem["size"]) ?? undefined,
    }));

    return {
      items,
      address: list.address,
      radius: list.radius ?? 5,
      updatedAt: list.updatedAt,
    };
  } catch (err) {
    console.warn("[db/shopping-list] getList failed:", err);
    return null;
  }
}

/**
 * Save the user's shopping list (full replace).
 */
export async function saveList(
  userId: string,
  items: GroceryItem[],
  address?: string,
  radius?: number
): Promise<void> {
  try {
    // Upsert the list row
    const existing = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(eq(shoppingLists.userId, userId))
      .limit(1);

    let listId: number;

    if (existing.length > 0) {
      listId = existing[0].id;
      await db
        .update(shoppingLists)
        .set({
          address: address ?? null,
          radius: radius ?? 5,
          updatedAt: new Date(),
        })
        .where(eq(shoppingLists.id, listId));
    } else {
      const inserted = await db
        .insert(shoppingLists)
        .values({
          userId,
          address: address ?? null,
          radius: radius ?? 5,
        })
        .returning({ id: shoppingLists.id });
      listId = inserted[0].id;
    }

    // Delete existing items, insert current ones
    await db
      .delete(shoppingListItems)
      .where(eq(shoppingListItems.listId, listId));

    if (items.length > 0) {
      await db.insert(shoppingListItems).values(
        items.map((item, i) => ({
          listId,
          clientId: item.id,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          brandPref: item.brandPref ?? null,
          size: item.size ?? null,
          position: i,
        }))
      );
    }
  } catch (err) {
    console.warn("[db/shopping-list] saveList failed:", err);
  }
}
