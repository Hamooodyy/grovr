# Grovr Product Specification

## 1. Product Vision

Grovr is a personalized grocery and cooking companion.

The long-term goal is to become the grocery/cooking companion for American households by making grocery shopping and cooking more convenient while reducing decision fatigue and food waste.

The core product loop is:

**Pantry intelligence → Personalization → Recipe recommendations → Shopping list → Purchase data → Smarter recommendations**

Grovr should help users:

* Know what food they already have
* Know what ingredients they should use soon
* Decide what to cook
* Discover recipes aligned with their tastes
* Automatically identify recurring grocery staples
* Build grocery lists faster
* Reduce unused and wasted groceries

The key product principle is:

> **Grovr should do the work for the user.**

Users should provide enough information to make Grovr useful, but Grovr should progressively learn and infer behavior rather than requiring users to constantly maintain the application manually.

---

## 2. Product Positioning

Do not position Grovr primarily as a pantry inventory app.

The pantry is the **intelligence layer**.

The primary user experience is:

**Cooking + Shopping**

The pantry exists to make those experiences significantly better.

The ultimate experience should feel like:

> "Grovr knows what I have, what I like, what I should use soon, what I can cook, and what I need to buy."

---

## 3. Core Navigation

Use four primary destinations:

**Home | Recipes | Shop | Pantry**

### Home

The most important screen.

It should answer:

> **"What should I do right now?"**

Potential content:

#### Use Soon

Ingredients that should be consumed soon based on estimated freshness/use-by windows.

Example:

* Spinach — ~2 days
* Strawberries — ~3 days
* Greek yogurt — ~7 days

#### Tonight's Picks

Personalized recipe recommendations based on pantry contents and user preferences.

Example:

**Chicken & Spinach Rice Bowl**

25 min
Uses 5 ingredients you already have
You only need 2 more ingredients

#### Running Low

Staples that Grovr predicts the user may need soon.

Example:

* Rice
* Chicken breast
* Olive oil

CTA:

**Build shopping list**

The Home screen should feel actionable rather than informational.

---

## 4. Onboarding

Onboarding is a critical part of the product because Grovr has a cold-start problem.

The user should provide enough information for useful initial recommendations without feeling like they are completing a long survey.

The onboarding should progressively collect information over time.

### Step 1: Value Proposition

#### Meet your grocery companion.

Grovr learns what you buy, what you like, and what you already have to make grocery shopping and cooking easier.

Benefits:

* Use what you have
* Shop smarter
* Know what to cook

CTA:

**Get started**

---

### Step 2: Household

Ask:

#### Who's cooking?

* Just me
* Me + 1
* Family
* Roommates

Ask:

#### How often do you cook?

* Almost every day
* A few times a week
* 1-2 times a week
* Not often

This information can eventually help estimate consumption patterns and recipe quantities.

---

### Step 3: Food Preferences

Ask about broad food preferences rather than dozens of individual ingredients.

Examples:

* Chicken
* Beef
* Seafood
* Vegetables
* Pasta
* Rice
* Mexican
* Asian
* Mediterranean
* Healthy/light
* Comfort food

Also provide:

#### Anything you don't eat?

Allow searchable foods/ingredients.

Keep dietary restrictions and personal dislikes conceptually separate.

---

### Step 4: Cooking Preferences

Ask:

#### What's dinner usually like?

* 15-20 minutes
* 30 minutes
* I like cooking
* Depends on the day

Allow multiple selections.

Ask:

#### How much do you usually make?

* 1 serving
* 2 servings
* 3-4 servings
* 5+ servings

---

### Step 5: Preferred Store

Ask:

#### Where do you usually shop?

Allow the user to search/select their preferred grocery store.

This information helps personalize recommendations and can be used for grocery fulfillment in the future.

---

## 5. Initial Pantry Setup

Users should have the **option** to manually establish some of their current pantry.

Do NOT require users to enter their entire pantry.

The purpose is to give Grovr an initial signal, not to create a perfect inventory.

#### What do you have on hand?

> Add a few ingredients you already have. Grovr will use these to make your first recipe recommendations more relevant.

Allow:

* Searchable ingredient input
* Suggested/common ingredients
* Quick addition of multiple ingredients
* Categories such as Produce, Meat, Dairy, Grains, Pantry Staples
* Quantity to be optional initially unless necessary

The user should be able to complete this in approximately 30-60 seconds.

CTA:

**Continue with my pantry**

Secondary CTA:

**I'll add items later**

---

### Skip Pantry Setup

Users can skip initial pantry setup entirely.

If they skip:

> **No problem.**
>
> Grovr can start learning your pantry from the groceries you buy going forward.

CTA:

**Start using Grovr**

Never create a dead-end experience for users who skip pantry setup.

If they have no pantry data, Grovr should still provide recommendations using:

* Stated preferences
* Cooking time
* Household size
* General recipe popularity/relevance

Then progressively personalize as data accumulates.

---

## 6. Purchase History (Future — Descoped)

Purchase history import via Instacart is descoped from the initial release. Instacart is not currently accepting new API applications.

When Instacart access becomes available, onboarding should offer:

#### Let's make Grovr smarter.

> Connect your grocery purchases and we'll automatically identify the foods you tend to keep around.

Primary CTA:

**Connect Instacart**

Secondary CTA:

**Not now**

Until then, Grovr builds pantry intelligence from:

* Manually added ingredients
* Ingredients added through shopping lists
* Recipes the user marks as cooked

Do not build any Instacart UX or fake integration for the initial release. Skip this onboarding step entirely.

---

## 7. Pantry Generation (Future — Descoped)

Automatic pantry generation from purchase history is descoped until Instacart integration is available.

When purchase history becomes available, show a short processing experience:

#### Your pantry is taking shape...

* Identifying staples
* Grouping similar ingredients
* Estimating what's still around
* Learning your preferences

Then show something like:

#### We found 27 ingredients you probably have.

Group into:

**Likely staples**

* Rice
* Chicken breast
* Eggs
* Milk
* Olive oil
* Garlic

**Fresh ingredients**

* Spinach
* Strawberries
* Avocados

Allow the user to quickly remove incorrect items.

For the initial release, the pantry is built entirely from manual input and onboarding data.

---

## 8. First Recommendation / Activation Moment

Onboarding should end by demonstrating Grovr's value.

Example:

#### Based on what we know about you...

**Chicken & Spinach Rice Bowl**

25 min

Uses **5 ingredients you already have**.

Then:

> You only need 2 more ingredients.

CTA:

**Add missing ingredients**

This is the core activation moment.

The user should finish onboarding thinking:

> **"Grovr actually understands what I have and what I want to cook."**

---

## 9. Pantry Model

The pantry should NOT be treated as perfectly known inventory.

It is an estimated representation of what the user probably has.

Conceptually:

```text
PantryItem
- ingredient
- quantity
- purchased_at
- estimated_use_by
- estimated_remaining
- confidence
- status
```

Possible statuses:

* Fresh
* Use soon
* Urgent
* Likely expired

The system should distinguish between:

**Food safety information**

and

**Estimated freshness / likely usefulness**

Do not present estimated expiration dates as guarantees that food is safe to consume.

---

## 10. Pantry Data Sources

The pantry should eventually be constructed from multiple sources:

1. Manually added ingredients
2. Grocery purchase history
3. Ingredients added through Grovr shopping lists
4. Recipes the user cooks
5. User corrections
6. Explicitly consumed/removed ingredients

All sources should update the same underlying pantry model.

Example:

```text
User manually adds chicken breast
        |
Grovr adds it to pantry
        |
User purchases 2 lb chicken breast
        |
Grovr updates quantity and purchase date
        |
User cooks chicken & rice bowl
        |
Grovr estimates chicken consumption
        |
User buys chicken again
        |
Grovr improves its understanding of chicken consumption
```

---

## 11. Perishable Ingredient Intelligence

For the initial version, use reasonable baseline shelf-life/use-by estimates.

Do not attempt sophisticated machine learning initially.

Examples of initial categories:

* Berries: short
* Leafy greens: short
* Fresh herbs: short
* Avocados: short
* Chicken: very short
* Ground beef: very short
* Fish: very short
* Milk: short-medium
* Eggs: medium
* Yogurt: medium
* Cheese: medium-long
* Dry pasta: long
* Rice: long
* Canned goods: very long

The system should initially calculate:

**Purchase date + estimated shelf life → estimated use-by date**

Then classify ingredients into freshness states.

Eventually, Grovr should learn the user's actual consumption behavior.

The ultimate goal is not merely predicting theoretical expiration.

The more valuable prediction is:

> **When is this user likely to consume this ingredient?**

---

## 12. Ingredient Normalization

Purchase data will contain many different product names representing the same ingredient.

Example:

```text
Organic Baby Spinach 5oz
Baby Spinach
Fresh Spinach
```

→ canonical ingredient:

`spinach`

Similarly:

```text
Boneless Skinless Chicken Breast
Chicken Breast 2lb
Chicken Breast
```

→

`chicken_breast`

Create a canonical ingredient model supporting:

**Purchase item → Canonical ingredient → Pantry item → Recipe ingredient**

Ingredient normalization is foundational to the product.

---

## 13. Personalization

Maintain three distinct concepts.

### Purchasing Behavior

What the user buys.

### Stated Preferences

What the user says they like or dislike.

### Consumption Behavior

What the user actually appears to use.

These should NOT be treated as identical.

Example:

A user might say they love avocados.

But if they repeatedly purchase avocados and rarely purchase them again for several weeks, Grovr should learn from that behavior rather than simply assuming avocados are a weekly staple.

---

## 14. Recipe Recommendations

Recipe recommendations are generated by an LLM based on the user's pantry, preferences, and context.

The LLM receives a structured prompt containing:

* Current pantry ingredients (with freshness status)
* User preferences (from onboarding)
* Cooking time preference
* Household size / servings
* Recently cooked recipes (to avoid repetition)
* Ingredients approaching their use-by window (prioritized)

The LLM returns structured recipe data (JSON): title, ingredients with quantities, step-by-step instructions, cook time, difficulty, and which pantry ingredients are used.

Recipe recommendations should be cached so the Home screen loads instantly. Recommendations should regenerate in the background when the pantry changes meaningfully (items added, removed, or approaching expiration).

Recipes should receive higher relevance when they:

* Use more existing pantry ingredients
* Use ingredients that should be consumed soon
* Match stated preferences
* Fit household size
* Fit preferred cooking time
* Have previously performed well for the user

Every recipe should clearly communicate its pantry relevance.

Example:

> **Uses 5 ingredients you already have**

And identify missing ingredients.

The LLM should be called server-side only. API keys must never be exposed to the client.

Use a cost-efficient model (Claude Haiku or equivalent) for recipe generation. Reserve more capable models for complex tasks like ingredient normalization if heuristics prove insufficient.

---

## 15. Recipe Experience

Users should be able to:

1. Browse personalized recommendations
2. Open a recipe
3. View ingredients
4. See which ingredients they already have
5. See which ingredients are missing
6. Understand why the recipe was recommended
7. Add missing ingredients to a shopping list

The recommendation should feel personalized rather than like a generic recipe database.

---

## 16. Shopping Lists

Users should be able to create and manage grocery lists.

From a recipe:

**Add missing ingredients**

→ Review ingredients

→ Edit quantities/items

→ Add to shopping list

Shopping lists should support:

* Adding items
* Removing items
* Editing quantities
* Persistence between sessions
* Offline access (cached locally on device)

**Fast follower (when Instacart access is available):**

Shopping list → Preferred store → Instacart → Purchase → Pantry auto-updates

---

## 17. Grocery Fulfillment (Fast Follower — Descoped)

Instacart is not currently accepting new API applications. Order placement and grocery fulfillment are descoped from the initial release.

The eventual flow when access is available:

**Recipe recommendation**
→ Missing ingredients
→ Shopping list
→ Preferred grocery store
→ Instacart
→ Purchase
→ Purchase data returns to Grovr
→ Pantry updates
→ Grovr learns

When Instacart begins accepting applications again, the integration adds:

* Direct ordering from shopping lists
* Purchase history import (powers automatic pantry generation and learning loop)
* Delivery tracking

**For the initial release:**

* Shopping lists are the terminal feature — users manage their own grocery purchasing
* Do not build any Instacart UX, placeholder buttons, or fake integrations
* Keep the backend architecture clean so a fulfillment provider can be added later without restructuring

---

## 18. Learning Loop

Every user interaction should eventually generate useful signals.

### Positive signals

* Recipe cooked
* Recipe saved
* Recipe rated highly
* Ingredient repeatedly added to pantry
* Ingredient repeatedly added to shopping lists

### Negative signals

* Explicit dislike
* Recipe repeatedly skipped
* Ingredient removed from pantry
* Ingredient frequently expires unused

Over time, Grovr should become more personalized without requiring users to manually configure every preference.

Eventually surface lightweight insights via push notifications or Home screen cards:

#### Grovr learned something new

> You've added Greek yogurt to your pantry 4 times this month. We'll start treating it as one of your staples.

Or:

#### Grovr noticed

> You usually add spinach but it keeps expiring before you use it. We'll stop suggesting recipes that rely on fresh spinach.

Personalization should be visible to the user so they understand why Grovr gets better over time.

---

## 19. Technical Philosophy

Use deterministic logic where deterministic logic is appropriate.

Use code for:

* Pantry state
* Quantities
* Dates
* Shelf-life estimates
* User settings
* Shopping lists
* Basic recommendation scoring

Use AI selectively for:

* Recipe generation and recommendations (LLM, server-side)
* Ingredient normalization (LLM or heuristics, evaluated per-case)
* Natural-language interactions
* Personalization where deterministic rules are insufficient

Do not introduce AI simply because it is available.

The product should remain understandable, testable, and reliable.

---

## 20. Tech Stack

### Client (iOS App)

| Layer | Technology |
|-------|-----------|
| Framework | React Native + Expo |
| Language | TypeScript (strict mode) |
| Navigation | Expo Router (file-based routing) |
| Styling | NativeWind (Tailwind CSS for React Native) |
| Auth | Clerk (`@clerk/clerk-expo`) |
| Local storage | MMKV (fast key-value) for offline pantry cache, preferences |
| Push notifications | Expo Notifications + APNs |
| Build / deploy | Expo EAS Build + EAS Submit → App Store |

### Backend (API Server)

| Layer | Technology |
|-------|-----------|
| Runtime | Next.js API routes (deployed headless on Vercel) |
| Language | TypeScript (strict mode) |
| Database | Neon PostgreSQL (serverless) |
| ORM | Drizzle ORM |
| Caching | Vercel KV (Upstash Redis) for LLM recipe cache, session data |
| Auth | Clerk (`@clerk/nextjs` server-side verification) |
| LLM | Anthropic API (Claude Haiku for recipe generation) |
| Ingredient search | Open Food Facts API (free, no key) |
| Store search | Google Places API (for preferred store selection) |

### Architecture

The iOS app communicates with the backend exclusively over HTTPS REST endpoints. All LLM calls, database access, and external API calls happen server-side. The iOS app is a client that handles UI, local caching, and auth tokens.

```text
iOS App (Expo)
    |
    | HTTPS + Clerk JWT
    |
Next.js API Routes (Vercel)
    |
    |--- Neon PostgreSQL (Drizzle ORM)
    |--- Vercel KV (Redis cache)
    |--- Anthropic API (recipe generation)
    |--- Open Food Facts (ingredient search)
    |--- Google Places (store lookup)
    |--- Instacart API (fast follower: fulfillment + purchase history)
```

---

## 21. Project Structure

```
/grovr-app                          # iOS app (React Native + Expo)
  /app                              # Expo Router (file-based)
    /(auth)                         # Sign-in / sign-up screens
      /sign-in.tsx
      /sign-up.tsx
    /(onboarding)                   # Onboarding flow
      /welcome.tsx                  # Step 1: Value proposition
      /household.tsx                # Step 2: Household info
      /preferences.tsx              # Step 3: Food preferences
      /cooking.tsx                  # Step 4: Cooking preferences
      /store.tsx                    # Step 5: Preferred store
      /pantry-setup.tsx             # Initial pantry setup
      /first-recipe.tsx             # Activation moment
    /(tabs)                         # Main app (tab navigation)
      /index.tsx                    # Home tab
      /recipes.tsx                  # Recipes tab
      /shop.tsx                     # Shop tab
      /pantry.tsx                   # Pantry tab
    /_layout.tsx                    # Root layout
  /components                       # Shared UI components
  /lib                              # Client-side utilities, API client, types
  /hooks                            # Custom React hooks
  /assets                           # Images, fonts

/grovr-api                          # Backend (Next.js API routes)
  /app/api
    /recipes
      /route.ts                     # LLM recipe generation + caching
    /pantry
      /route.ts                     # Pantry CRUD
    /shopping-list
      /route.ts                     # Shopping list CRUD
    /ingredients
      /route.ts                     # Ingredient search (Open Food Facts)
    /stores
      /route.ts                     # Store search (Google Places)
    /user
      /preferences/route.ts         # User preferences CRUD
      /onboarding/route.ts          # Onboarding state
  /lib
    /db
      /index.ts                     # Drizzle client
      /schema.ts                    # Full database schema
    /recipe-engine.ts               # LLM prompt construction + response parsing
    /ingredient-normalization.ts    # Canonical ingredient mapping
    /freshness.ts                   # Shelf-life estimates + status calculation
    /types.ts                       # Shared TypeScript types
```

---

## 22. Development Strategy

Grovr must be developed **vertically, one complete feature at a time.**

Do NOT build multiple major features in parallel.

For every feature:

1. Define the UX
2. Define required data model/API changes
3. Implement backend API endpoints
4. Implement iOS screens
5. Connect the complete user flow end-to-end
6. Test on a real device or simulator
7. Fix bugs
8. Polish UX
9. Only then move to the next feature

A feature is NOT complete if it only has:

* A UI mockup
* A database table
* Placeholder data
* A partial backend
* Fake integrations
* TODOs for critical functionality

The goal is for the application to remain functional after every completed phase.

---

## 23. Feature Development Order

### Feature 0: Project Scaffolding

Before building any features, set up the project foundation:

* Initialize Expo project with TypeScript
* Configure Expo Router with tab navigation shell (Home, Recipes, Shop, Pantry)
* Set up Clerk authentication (sign-in, sign-up, protected routes)
* Set up the backend API project (Next.js or extracted from existing codebase)
* Configure Neon PostgreSQL + Drizzle ORM with initial schema
* Verify iOS app can authenticate and call backend API endpoints
* Set up Expo EAS for development builds

Do not add any feature logic yet. The goal is a working app shell where a user can sign in and see empty tab screens.

---

### Feature 1: Onboarding

Build the complete onboarding experience.

The user should be able to:

* Create an account
* Complete onboarding
* Set household information
* Set food preferences
* Set cooking preferences
* Select a preferred store
* Add some initial pantry items OR skip
* See a first recipe recommendation (activation moment)
* Complete onboarding
* Return to the application with all information persisted

Do not move to Feature 2 until this entire flow works end-to-end.

---

### Feature 2: Pantry

Build the complete pantry experience.

Users can:

* View pantry items
* Add ingredients
* Remove ingredients
* See when an ingredient was added
* See estimated freshness/use-soon information for perishables

Initially, pantry items come entirely from manual input and onboarding data.

Do not move to Feature 3 until pantry management works end-to-end.

---

### Feature 3: Recipe Recommendations

Build the complete recipe discovery and recommendation experience.

Users can:

* Browse recommendations on the Home screen
* Open recipes
* View ingredients
* See pantry matches
* See missing ingredients
* Understand why a recipe was recommended

Recipes are generated by the LLM based on pantry contents and user preferences.

Do not move to Feature 4 until this works end-to-end.

---

### Feature 4: Recipe → Shopping List

Allow users to convert missing recipe ingredients into an actionable shopping list.

Shopping lists are the terminal feature for the initial release — users manage their own grocery purchasing outside of Grovr.

Do not move to Feature 5 until this works end-to-end.

---

### Feature 5: Personalized Learning

Add behavioral personalization based on:

* Recipes cooked
* Recipes saved
* Recipes skipped
* Shopping list activity (items added from recipes, items checked off)
* Pantry changes (ingredients added, removed, marked as used)
* Explicit likes/dislikes

Recommendation personalization should demonstrably change based on user behavior before considering the product feature-complete.

---

### Fast Followers (Post-Launch)

The following features are descoped from the initial release and should be revisited when dependencies are resolved or the core product is stable:

**Instacart / Grocery Fulfillment** — Blocked on Instacart API access (not currently accepting applications). Adds: direct ordering from shopping lists, purchase history import, automatic pantry generation from purchase data, delivery tracking.

**Purchase History → Pantry Intelligence** — Depends on Instacart integration. Adds: automatic pantry inference from purchase history, ingredient normalization at scale, consumption pattern learning from real purchase data.

---

## 24. Non-Negotiable Development Rules

### One feature at a time

Never begin the next feature while the current feature contains unfinished core functionality.

### End-to-end over breadth

A small feature that actually works is better than five partially implemented features.

### Inspect before changing

Before modifying the existing application:

* Inspect the current architecture
* Inspect navigation
* Inspect data models
* Inspect major screens
* Identify reusable code
* Identify technical debt

Do not rewrite working code unnecessarily.

### No unnecessary architecture

Do not introduce infrastructure, libraries, abstractions, or AI services unless the current feature actually requires them.

### No fake functionality

Do not use mock data to make unfinished functionality appear complete unless explicitly creating temporary development fixtures.

### Test continuously

After every feature:

* Run the application on a real device or simulator
* Test the complete user journey
* Test persistence
* Test edge cases
* Test offline behavior where applicable
* Fix regressions
* Review the implementation

### Stop at blockers

If a feature depends on an unavailable API, credential, external service, or unresolved product decision, stop at that boundary and explain the blocker rather than inventing functionality.

### Preserve product coherence

Every feature should reinforce:

**Know what I have → Know what I like → Know what I can cook → Know what I need → Make shopping easier**

---

## 25. Initial Development Instruction

Before writing any code:

1. Inspect the entire existing Grovr codebase.
2. Identify the current architecture.
3. Identify the current user flow.
4. Identify existing functionality worth preserving (backend logic, database setup, auth patterns).
5. Identify functionality that should be removed or substantially changed.
6. Identify current data models and backend architecture.
7. Compare the existing application against this product specification.
8. Propose the architecture required to support the new direction.
9. Propose the data model.
10. Propose the implementation plan for **Feature 0: Project Scaffolding** and **Feature 1: Onboarding**.

Do not make major architectural changes yet.

After presenting the plan, wait for approval.

Once approved, build **only Feature 0**, then **Feature 1** completely.

After each feature is complete, stop and wait for approval before beginning the next feature.
