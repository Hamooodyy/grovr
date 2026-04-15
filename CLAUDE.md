# CLAUDE.md - MVP Project Constitution

## 🎯 Project Goal
Build a functional MVP for Grovr focusing on pricing analysis and order placement via Instacart.
**Objective:** Launch quickly, prioritize functionality over perfect code, maintain a simple architecture.

## 🛒 Core User Flow
1. User signs up or logs in via Clerk
2. User builds a grocery list (text input, one item at a time)
3. App matches each item to products available on Instacart
4. App fetches nearby retailers via Instacart IDP and calculates an estimated item subtotal for the full list at each store using Foodspark pricing data
5. App surfaces the lowest-cost retailer option to the user
6. User is sent to Instacart (via IDP handoff link) to complete the order at the recommended store

> **Key distinction:** The user does not pick a retailer. The app compares estimated prices across nearby retailers and recommends the cheapest one automatically.

## 🛠 Tech Stack
- **Framework:** Next.js 15
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **Authentication:** Clerk (`@clerk/nextjs`) — use pre-built UI components, do not build custom auth forms
- **Pricing Data:** Foodspark API — scrapes Instacart storefront prices directly, ensuring displayed prices match what users see on Instacart at checkout
- **Database/Backend:** TBD — do not integrate a database until one is determined necessary for the MVP
- **Deployment:** Vercel

## 💰 Pricing Strategy
- **Source:** Foodspark API, which scrapes Instacart's own storefront prices (standard + discounted)
- **Why Foodspark:** Since prices are sourced from Instacart's storefront directly, displayed estimates reflect the same prices users will see after the handoff — best achievable accuracy without direct API access
- **What we display:** Item subtotal estimate only — do not imply the total includes delivery fees, service fees, or taxes
- **Cache TTL:** Keep Foodspark price data cached for no more than 1–2 hours to reduce staleness
- **Known gaps and how to handle them:**
  - Prices can shift between lookup and checkout → covered by disclaimer
  - Promotions may expire → show discounted price but note sales may vary
  - Delivery/service fees are not included in the estimate → make this explicit in UI copy
  - Item availability can change → Instacart handles substitution, not our responsibility

- **Required disclaimer (display alongside every price):**
  > "Estimated subtotal based on current Instacart listed prices. Final total including fees and promotions may vary."

## 🔑 Environment Variables
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Instacart IDP
INSTACART_API_KEY=
INSTACART_BASE_URL=https://connect.dev.instacart.tools  # swap for prod

# Foodspark
FOODSPARK_API_KEY=
```

> `CLERK_SECRET_KEY`, `INSTACART_API_KEY`, and `FOODSPARK_API_KEY` must never be exposed client-side. All calls to Instacart and Foodspark go through Next.js API routes. Only `NEXT_PUBLIC_` prefixed variables are safe to use in client components.

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
    /products
      /route.ts                    — Product matching logic
    /retailers
      /route.ts                    — Proxy Instacart IDP retailer lookup
    /pricing
      /route.ts                    — Foodspark price lookup per product/retailer
    /list
      /route.ts                    — Generate Instacart handoff link via IDP
/lib
  /instacart.ts                    — Instacart IDP client (API key auth, fetch wrappers)
  /foodspark.ts                    — Foodspark API client (price lookups)
  /pricing.ts                      — Compare retailer totals, select lowest-cost option
  /types.ts                        — Shared TypeScript types
/components
  /ShoppingList.tsx                — List input + item management
  /ProductMatch.tsx                — Display matched product + price + disclaimer
  /RetailerComparison.tsx          — Show lowest-cost retailer recommendation
  /PriceDisclaimer.tsx             — Reusable disclaimer shown alongside all prices
```

## 🧪 Testing & Quality
- Run `npm run lint` and `npm run check-types` before completing a task.
- If a task involves core functionality, create a minimal Playwright test.

## 📝 Workflow
- Break down tasks into small, iterative steps.
- Commit often with descriptive messages.
- If you are stuck, ask for clarification on the prompt before writing code.
