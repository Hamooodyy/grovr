import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Price snapshots — append-only price history
// ---------------------------------------------------------------------------

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: serial("id").primaryKey(),
    retailerId: text("retailer_id").notNull(),
    itemName: text("item_name").notNull(),
    brandPref: text("brand_pref").notNull().default(""),
    matchedName: text("matched_name").notNull(),
    matchedSize: text("matched_size"),
    price: numeric("price", { precision: 8, scale: 2 }).notNull(),
    scrapedAt: timestamp("scraped_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_price_lookup").on(
      table.retailerId,
      table.itemName,
      table.brandPref,
      table.scrapedAt
    ),
  ]
);

// ---------------------------------------------------------------------------
// Shopping lists — multiple named lists per Clerk user, one active at a time
// ---------------------------------------------------------------------------

export const shoppingLists = pgTable(
  "shopping_lists",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull().default("My List"),
    isActive: boolean("is_active").notNull().default(true),
    address: text("address"),
    radius: integer("radius").default(5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_shopping_lists_user").on(table.userId)]
);

// ---------------------------------------------------------------------------
// Shopping list items
// ---------------------------------------------------------------------------

export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    clientId: text("client_id").notNull(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unit: text("unit").notNull().default("ea"),
    brandPref: text("brand_pref"),
    size: text("size"),
    position: integer("position").notNull().default(0),
  },
  (table) => [index("idx_list_items").on(table.listId)]
);
