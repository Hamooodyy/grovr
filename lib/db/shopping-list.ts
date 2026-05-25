import { eq, and, desc } from "drizzle-orm";
import { db } from "./index";
import { shoppingLists, shoppingListItems } from "./schema";
import type { GroceryItem } from "../types";

interface SavedList {
  items: GroceryItem[];
  address: string | null;
  radius: number;
  updatedAt: Date;
}

interface ListSummary {
  id: number;
  name: string;
  itemCount: number;
  estimatedTotal: string | null;
  recommendedStore: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const MAX_LISTS = 10;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function itemsForList(listId: number): Promise<GroceryItem[]> {
  const rows = await db
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, listId))
    .orderBy(shoppingListItems.position);

  return rows.map((row) => ({
    id: row.clientId,
    name: row.name,
    quantity: row.quantity,
    unit: row.unit,
    brandPref: row.brandPref ?? undefined,
    size: (row.size as GroceryItem["size"]) ?? undefined,
  }));
}

async function replaceItems(listId: number, items: GroceryItem[]) {
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
}

async function deactivateAll(userId: string) {
  await db
    .update(shoppingLists)
    .set({ isActive: false })
    .where(
      and(eq(shoppingLists.userId, userId), eq(shoppingLists.isActive, true))
    );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load the user's active shopping list from Postgres.
 */
export async function getList(userId: string): Promise<SavedList | null> {
  try {
    const lists = await db
      .select()
      .from(shoppingLists)
      .where(
        and(eq(shoppingLists.userId, userId), eq(shoppingLists.isActive, true))
      )
      .limit(1);

    if (lists.length === 0) return null;

    const list = lists[0];
    const items = await itemsForList(list.id);

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
 * Auto-save the user's active list (full replace). Creates one if none exists.
 */
export async function saveList(
  userId: string,
  items: GroceryItem[],
  address?: string,
  radius?: number
): Promise<void> {
  try {
    const existing = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(
        and(eq(shoppingLists.userId, userId), eq(shoppingLists.isActive, true))
      )
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
          name: "My List",
          isActive: true,
          address: address ?? null,
          radius: radius ?? 5,
        })
        .returning({ id: shoppingLists.id });
      listId = inserted[0].id;
    }

    await replaceItems(listId, items);
  } catch (err) {
    console.warn("[db/shopping-list] saveList failed:", err);
  }
}

/**
 * Return all lists for a user (summary only, for the Saved Lists tab).
 */
export async function getAllLists(userId: string): Promise<ListSummary[]> {
  try {
    const lists = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.userId, userId))
      .orderBy(desc(shoppingLists.updatedAt))
      .limit(MAX_LISTS);

    // Get item counts
    const summaries: ListSummary[] = [];
    for (const list of lists) {
      const items = await db
        .select({ id: shoppingListItems.id })
        .from(shoppingListItems)
        .where(eq(shoppingListItems.listId, list.id));

      summaries.push({
        id: list.id,
        name: list.name,
        itemCount: items.length,
        estimatedTotal: list.estimatedTotal,
        recommendedStore: list.recommendedStore,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      });
    }

    return summaries;
  } catch (err) {
    console.warn("[db/shopping-list] getAllLists failed:", err);
    return [];
  }
}

/**
 * Save the current active list as a new named list.
 * The new list becomes active; the old active list is deactivated.
 */
export async function saveListAs(
  userId: string,
  name: string,
  items: GroceryItem[],
  address?: string,
  radius?: number
): Promise<{ id: number } | { error: string }> {
  // Check list cap
  const existing = await db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(eq(shoppingLists.userId, userId));

  if (existing.length >= MAX_LISTS) {
    return { error: `You can save up to ${MAX_LISTS} lists. Delete one to save a new one.` };
  }

  // Deactivate any currently active list
  await deactivateAll(userId);

  // Create the new named list as active
  const inserted = await db
    .insert(shoppingLists)
    .values({
      userId,
      name,
      isActive: true,
      address: address ?? null,
      radius: radius ?? 5,
    })
    .returning({ id: shoppingLists.id });

  const listId = inserted[0].id;
  await replaceItems(listId, items);

  return { id: listId };
}

/**
 * Load a saved list — makes it the active list.
 */
export async function loadList(
  userId: string,
  listId: number
): Promise<SavedList | null> {
  try {
    // Verify ownership
    const lists = await db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
      .limit(1);

    if (lists.length === 0) return null;

    // Deactivate current active, activate target
    await deactivateAll(userId);
    await db
      .update(shoppingLists)
      .set({ isActive: true })
      .where(eq(shoppingLists.id, listId));

    const list = lists[0];
    const items = await itemsForList(listId);

    return {
      items,
      address: list.address,
      radius: list.radius ?? 5,
      updatedAt: list.updatedAt,
    };
  } catch (err) {
    console.warn("[db/shopping-list] loadList failed:", err);
    return null;
  }
}

/**
 * Delete a list. Cannot delete the currently active list.
 */
export async function deleteList(
  userId: string,
  listId: number
): Promise<boolean> {
  try {
    const lists = await db
      .select({ id: shoppingLists.id, isActive: shoppingLists.isActive })
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
      .limit(1);

    if (lists.length === 0) return false;
    if (lists[0].isActive) return false; // can't delete the active list

    // Items cascade-delete thanks to onDelete: "cascade"
    await db.delete(shoppingLists).where(eq(shoppingLists.id, listId));
    return true;
  } catch (err) {
    console.warn("[db/shopping-list] deleteList failed:", err);
    return false;
  }
}

/**
 * Start a new empty list (deactivates current active list).
 */
export async function newList(userId: string): Promise<SavedList> {
  await deactivateAll(userId);

  const inserted = await db
    .insert(shoppingLists)
    .values({
      userId,
      name: "My List",
      isActive: true,
    })
    .returning();

  const list = inserted[0];
  return {
    items: [],
    address: list.address,
    radius: list.radius ?? 5,
    updatedAt: list.updatedAt,
  };
}

/**
 * Rename a list.
 */
export async function renameList(
  userId: string,
  listId: number,
  name: string
): Promise<boolean> {
  try {
    const lists = await db
      .select({ id: shoppingLists.id })
      .from(shoppingLists)
      .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
      .limit(1);

    if (lists.length === 0) return false;

    await db
      .update(shoppingLists)
      .set({ name, updatedAt: new Date() })
      .where(eq(shoppingLists.id, listId));

    return true;
  } catch (err) {
    console.warn("[db/shopping-list] renameList failed:", err);
    return false;
  }
}

/**
 * Save comparison results (estimated total + recommended store) on the active list.
 */
export async function updateListResults(
  userId: string,
  estimatedTotal: number,
  recommendedStore: string
): Promise<void> {
  try {
    await db
      .update(shoppingLists)
      .set({
        estimatedTotal: estimatedTotal.toFixed(2),
        recommendedStore,
        updatedAt: new Date(),
      })
      .where(
        and(eq(shoppingLists.userId, userId), eq(shoppingLists.isActive, true))
      );
  } catch (err) {
    console.warn("[db/shopping-list] updateListResults failed:", err);
  }
}
