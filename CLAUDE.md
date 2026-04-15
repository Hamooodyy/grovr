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

---

## 🏗 Implementation Plan

### API Keys — Status & Storage

| Service | Purpose | Status | Where to store |
|---|---|---|---|
| **Clerk** | App auth (sign-up, sign-in, session) | ✅ Keys in `.env.local` | `.env.local` (dev) / Vercel env vars (prod) |
| **Instacart IDP** | Retailer lookup + handoff link | ⏳ Pending approval | `.env.local` → `INSTACART_API_KEY` |
| **Foodspark** | Product search + price data | ⏳ Pending approval | `.env.local` → `FOODSPARK_API_KEY` |

**Rules:**
- `CLERK_SECRET_KEY`, `INSTACART_API_KEY`, `FOODSPARK_API_KEY` are server-only — never use in client components
- Only `NEXT_PUBLIC_*` variables are safe client-side
- All Instacart and Foodspark calls go through `/app/api/` routes exclusively
- Swap `INSTACART_BASE_URL` from `connect.dev.instacart.tools` to `connect.instacart.com` when production key is approved

---

### Phase 0 — Project Scaffold
**Dependencies:** None
**Can build now:** Yes

1. Scaffold Next.js 15 app with TypeScript strict mode and Tailwind CSS (`create-next-app`)
2. Verify `tsconfig.json` has `"strict": true`
3. Confirm `npm run lint` and `npm run check-types` scripts work
4. Confirm `.env.local` is in `.gitignore` ✅ (done)
5. Initial commit

---

### Phase 1 — Authentication (Clerk)
**Dependencies:** Clerk publishable key + secret key ✅ (done)
**Can build now:** Yes

1. `npm install @clerk/nextjs`
2. Wrap `app/layout.tsx` in `<ClerkProvider>`
3. Add Clerk middleware — protect all routes except `/`, `/sign-in`, `/sign-up`
4. Build landing page (`app/page.tsx`) — use Clerk's `<SignInButton>` / `<SignUpButton>`, no custom auth forms
5. Create protected dashboard shell (`app/dashboard/page.tsx`) — placeholder only
6. Smoke test: sign-up → redirect to `/dashboard` → sign-out → back to `/`

---

### Phase 2 — Shared Types
**Dependencies:** None
**Can build now:** Yes

Create `lib/types.ts` with:
- `GroceryItem` — `{ id, name, quantity, unit }`
- `ProductMatch` — `{ item, matchedName, price, retailerId }`
- `Retailer` — `{ id, name, logoUrl, postalCode }`
- `PriceComparison` — `{ retailer, subtotal, items: ProductMatch[] }`

---

### Phase 3 — Pricing Comparison Logic
**Dependencies:** `lib/types.ts`
**Can build now:** Yes

Build `lib/pricing.ts`:
- Accept a list of items and a set of nearby retailers
- Sum item prices per retailer using `ProductMatch[]`
- Return the lowest-cost retailer and per-item breakdown
- Pure business logic — no API calls, fully testable with mock data

---

### Phase 4 — API Client Stubs
**Dependencies:** `lib/types.ts`
**Can build now:** Yes (stubbed) — swap mocks for real calls when keys arrive

**`lib/instacart.ts`:**
- `getRetailers(postalCode: string): Promise<Retailer[]>` — `GET /idp/v1/retailers`
- `createRecipeLink(title: string, lineItems: GroceryItem[]): Promise<string>` — `POST /idp/v1/products/recipe`, returns handoff URL
- Auth: `Authorization: Bearer {INSTACART_API_KEY}` on all requests
- **Blocked on:** `INSTACART_API_KEY` for live calls; stub returns mock data until then

**`lib/foodspark.ts`:**
- `searchProduct(query: string, retailerId: string): Promise<ProductMatch>` — returns best match + price
- Cache responses with max TTL of 1 hour
- **Blocked on:** `FOODSPARK_API_KEY` for live calls; stub returns mock data until then

---

### Phase 5 — API Routes
**Dependencies:** Phase 4 client stubs
**Can build now:** Yes (returns mock data until keys arrive)

- `app/api/retailers/route.ts` — accepts `?postal_code=`, calls `getRetailers()`, returns retailer list
- `app/api/pricing/route.ts` — accepts item name + retailer ID, calls `searchProduct()`, returns match + price
- `app/api/list/route.ts` — accepts list items, calls `createRecipeLink()`, returns handoff URL

---

### Phase 6 — UI (3-state Dashboard)
**Dependencies:** Phase 2 types, Phase 5 API routes
**Can build now:** Yes (wire to mock API responses)

**State 1 — List Building** (`components/ShoppingList.tsx`):
- Text input, add item on Enter
- Each item row with delete button
- ZIP code input (stored in local state for the session)
- "Find Prices" button — triggers retailer lookup + pricing

**State 2 — Product Review:**
- `components/ProductMatch.tsx` — matched product name + price per item
- `components/RetailerComparison.tsx` — lowest-cost retailer highlighted with estimated subtotal
- `components/PriceDisclaimer.tsx` — rendered alongside every price (required)
- "Go to Instacart" button — calls `/api/list`, opens handoff URL

**State 3 — Handoff Confirmation:**
- "Your list has been sent to Instacart" message
- Fallback link in case redirect did not open automatically
- Note that the user completes the order on Instacart

---

### Phase 7 — Live API Integration
**Dependencies:** `INSTACART_API_KEY` + `FOODSPARK_API_KEY`
**Blocked until:** Keys arrive

1. Replace mock returns in `lib/instacart.ts` with real fetch calls
2. Replace mock returns in `lib/foodspark.ts` with real fetch calls
3. Update `INSTACART_BASE_URL` to production URL when production key is approved
4. Smoke test with a real ZIP code and a 3–5 item list

---

### Phase 8 — End-to-End Test & Launch Prep
**Dependencies:** Phase 7 complete

1. Playwright test: sign-up → add items → find prices → click "Go to Instacart"
2. `npm run lint` and `npm run check-types` — zero errors
3. Verify price disclaimer appears on every screen that shows a price
4. Add all env vars to Vercel dashboard (Project Settings → Environment Variables)
5. Deploy to Vercel — confirm production build passes
