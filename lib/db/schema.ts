import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  index,
  integer,
  real,
  jsonb,
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
    category: text("category"), // 'fridge' | 'spice' | 'pantry'
    quantity: real("quantity"),
    unit: text("unit"), // 'g' | 'oz' | 'lbs' | 'fl oz' | 'pint' | 'gallon' | 'mL' | 'ct' | 'dozen' | 'pack' | 'bunch'
    addedAt: timestamp("added_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    estimatedExpiry: timestamp("estimated_expiry", { withTimezone: true }),
    status: text("status").notNull().default("fresh"), // 'fresh' | 'use_soon' | 'urgent' | 'expired'
  },
  (table) => [index("idx_pantry_user").on(table.userId)]
);

// ── Saved recipes ──

export const savedRecipes = pgTable(
  "saved_recipes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    cookTime: text("cook_time"),
    difficulty: text("difficulty"),
    servings: integer("servings"),
    ingredients: jsonb("ingredients").notNull(), // Array<{ name, quantity, unit, inPantry }>
    instructions: jsonb("instructions").notNull(), // string[]
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_saved_recipes_user").on(table.userId)]
);

// ── Shopping list ──

export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: text("quantity"),
    unit: text("unit"),
    checked: boolean("checked").notNull().default(false),
    recipeTitle: text("recipe_title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_shopping_list_user").on(table.userId)]
);

// ── Recipe feedback ──

export const recipeFeedback = pgTable(
  "recipe_feedback",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    recipeTitle: text("recipe_title").notNull(),
    feedback: text("feedback").notNull(), // 'like' | 'dislike'
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_recipe_feedback_user").on(table.userId)]
);
