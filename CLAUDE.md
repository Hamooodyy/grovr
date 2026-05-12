# CLAUDE.md - MVP Project Constitution

## ⚠️ Workflow Rule
**Always present a plan and get explicit user approval before writing or modifying any code.** Do not implement changes until the user says "approved", "go for it", or similar. This applies to all code changes — new files, edits, deletions, refactors.

## 🎯 Project Goal
Build a functional MVP for Grovr — a multi-chain grocery price comparison app.
**Objective:** Launch quickly, prioritize functionality over perfect code, maintain a simple architecture.

## 🛒 Core User Flow
1. User signs up or logs in via Clerk
2. User builds a grocery list (text input, one item at a time) and enters their ZIP code
3. App fetches nearby stores (ALDI, Wegmans, Target, Kroger, Safeway, Food Lion) via Google Places API
4. App scrapes each store's website via Browserless to find product prices
5. App computes estimated subtotals per store and surfaces the lowest-cost option
6. User clicks through to the cheapest store's homepage to shop

## 🛠 Tech Stack
- **Framework:** Next.js 15
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **Authentication:** Clerk (`@clerk/nextjs`) — use pre-built UI components, do not build custom auth forms
- **Store Discovery:** Google Places API (Nearby Search) — finds supported chains near the user's ZIP
- **Pricing:** Browserless (cloud headless browser) — scrapes each store's own website for product prices
- **Product Autocomplete:** Open Food Facts API — free, no API key
- **Database/Backend:** TBD — do not integrate a database until one is determined necessary for the MVP
- **Deployment:** Railway

## 🏪 Supported Stores
Six chains for MVP, defined in `lib/store-urls.ts`:
- ALDI, Wegmans, Target, Kroger, Safeway, Food Lion
- Each has a `directSearchUrl` template for product search
- Each has a `storefrontUrl` for the checkout handoff link

## 💰 Pricing Strategy
- **Source:** Browserless scrapes each store's own website (direct search URLs)
- **What we display:** Item subtotal estimate only — do not imply the total includes delivery fees, service fees, or taxes
- **Cache TTL:** Cache product prices for no more than 1 hour
- **Known gaps and how to handle them:**
  - Prices can shift between lookup and checkout → covered by disclaimer
  - Item availability can change → store handles substitution at checkout
  - Delivery/service fees not included → make this explicit in UI copy

- **Required disclaimer (display alongside every price):**
  > "Estimated subtotal based on current listed prices. Final total may vary and does not include delivery fees, service fees, taxes, or promotions applied at checkout."

## 🔑 Environment Variables
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Google Places
GOOGLE_PLACES_API_KEY=

# Browserless
BROWSERLESS_API_KEY=
```

> `CLERK_SECRET_KEY`, `GOOGLE_PLACES_API_KEY`, and `BROWSERLESS_API_KEY` must never be exposed client-side. Only `NEXT_PUBLIC_` prefixed variables are safe to use in client components.

## 🚀 MVP Scope & Rules
1. **Do Not Over-engineer:** Keep files small and focused.
2. **UI/UX:** Use basic styling; focus on layout and user flow. Use consistent Tailwind classes.
3. **Authentication:** Clerk — wrap app in `<ClerkProvider>`, use middleware to protect all routes except the landing/sign-in page.
4. **Database:** Do not introduce a database until it is confirmed necessary. Avoid any DB setup, schema design, or ORM integration until that decision is made.
5. **State Management:** Prefer local state or `Zustand` for simple state.
6. **Code Style:** Prefer functional components with hooks. Use explicit types.

## 💾 Project Structure
```
/app
  /page.tsx                        — Landing page / sign-in prompt
  /dashboard
    /page.tsx                      — Shopping list UI (Clerk-protected)
  /api
    /stores
      /route.ts                    — Google Places nearby store lookup by ZIP
    /pricing
      /route.ts                    — Browserless scrape per item + store
    /cart
      /route.ts                    — Returns storefront URL for checkout handoff
    /search
      /route.ts                    — Open Food Facts product autocomplete
/lib
  /google-places.ts                — Google Places API client (store discovery)
  /scraper.ts                      — Browserless scraper (product pricing)
  /store-urls.ts                   — Store configs: search URLs, storefront URLs
  /provider.ts                     — Data source router (API routes import from here)
  /pricing.ts                      — Compare retailer totals, select lowest-cost option
  /types.ts                        — Shared TypeScript types
/components
  /ShoppingList.tsx                — List input + item management + ZIP input
  /ProductMatch.tsx                — Display matched product + price + disclaimer
  /RetailerComparison.tsx          — Show lowest-cost retailer recommendation
  /CheckoutScreen.tsx              — Checkout handoff with store link
  /PriceDisclaimer.tsx             — Reusable disclaimer shown alongside all prices
```

## 🧪 Testing & Quality
- Run `npm run lint` and `npm run check-types` before completing a task.
- If a task involves core functionality, create a minimal Playwright test.

## 📝 Workflow
- Break down tasks into small, iterative steps.
- Commit often with descriptive messages.
- If you are stuck, ask for clarification on the prompt before writing code.
