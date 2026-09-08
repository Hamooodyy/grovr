import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  index,
  integer,
} from "drizzle-orm/pg-core";

// ── User profiles (onboarding data) ──

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: serial("id").primaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    householdType: text("household_type"),
    cookingFrequency: text("cooking_frequency"),
    cookingTimes: text("cooking_times").array(),
    servingSize: text("serving_size"),
    preferredStore: text("preferred_store"),
    onboardingDone: boolean("onboarding_done").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_user_profiles_clerk").on(table.clerkUserId)]
);

// ── Food preferences (likes, dislikes, restrictions) ──

export const userFoodPreferences = pgTable(
  "user_food_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    preference: text("preference").notNull(),
    type: text("type").notNull(), // 'like' | 'dislike' | 'restriction'
  },
  (table) => [index("idx_food_prefs_user").on(table.userId)]
);

// ── Pantry items ──

export const pantryItems = pgTable(
  "pantry_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    canonicalName: text("canonical_name").notNull(),
    category: text("category"), // 'produce' | 'meat' | 'dairy' | 'grains' | 'pantry_staple' | 'other'
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    estimatedExpiry: timestamp("estimated_expiry", { withTimezone: true }),
    status: text("status").notNull().default("fresh"), // 'fresh' | 'use_soon' | 'urgent' | 'expired'
  },
  (table) => [index("idx_pantry_user").on(table.userId)]
);
