# CLAUDE.md - MVP Project Constitution

## 🎯 Project Goal
Build a functional MVP for Grovr focusing on pricing analysis and order placement via the Kroger API.
**Objective:** Launch quickly, prioritize functionality over perfect code, maintain a simple architecture.

## 🛒 Core User Flow
1. User signs up or logs in via Clerk
2. User builds a grocery list (text input, one item at a time) and enters their ZIP code
3. App fetches nearby Kroger-family stores (Kroger, Ralphs, Fred Meyer, Harris Teeter, etc.) via the Kroger Locations API
4. App searches each item at each nearby store via the Kroger Products API and retrieves real-time prices
5. App computes estimated subtotals per store and surfaces the lowest-cost option to the user
6. User authorizes Kroger via OAuth and items are added directly to their Kroger cart

> **MVP scope:** Price comparison is limited to Kroger-family stores. Multi-chain comparison (e.g. Kroger vs. Safeway) is out of scope until a second retailer API is integrated.

## 🛠 Tech Stack
- **Framework:** Next.js 15
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **Authentication:** Clerk (`@clerk/nextjs`) — use pre-built UI components, do not build custom auth forms
- **Pricing & Retail Data:** Kroger Developer API — official public API, free tier, returns real-time product prices per store location
- **Cart Handoff:** Kroger Cart API (OAuth `authorization_code` flow) — items land directly in the user's Kroger cart
- **Database/Backend:** TBD — do not integrate a database until one is determined necessary for the MVP
- **Deployment:** Vercel

## 💰 Pricing Strategy
- **Source:** Kroger Products API — real-time prices scoped to a specific store location ID
- **Promo prices:** API returns both `regular` and `promo` price; always display promo when present
- **What we display:** Item subtotal estimate only — do not imply the total includes delivery fees, service fees, or taxes
- **Cache TTL:** Cache Kroger product prices for no more than 1 hour
- **Known gaps and how to handle them:**
  - Prices can shift between lookup and checkout → covered by disclaimer
  - Item availability can change → Kroger handles substitution at checkout
  - Delivery/service fees not included → make this explicit in UI copy

- **Required disclaimer (display alongside every price):**
  > "Estimated subtotal based on current Kroger listed prices. Final total including fees and promotions may vary."

## 🔑 Environment Variables
```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Kroger
KROGER_CLIENT_ID=
KROGER_CLIENT_SECRET=
KROGER_REDIRECT_URI=http://localhost:3000/api/auth/kroger/callback  # update for prod
```

> `CLERK_SECRET_KEY`, `KROGER_CLIENT_ID`, and `KROGER_CLIENT_SECRET` must never be exposed client-side. All calls to Kroger go through Next.js API routes. Only `NEXT_PUBLIC_` prefixed variables are safe to use in client components.

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
      /route.ts                    — Proxy Kroger Locations API (nearby stores by ZIP)
    /pricing
      /route.ts                    — Kroger Products API lookup per item + store
    /cart
      /route.ts                    — Add items to user's Kroger cart (requires user token)
    /auth
      /kroger
        /callback
          /route.ts                — Kroger OAuth callback — exchange code for user token
/lib
  /kroger.ts                       — Kroger API client (Locations, Products, Cart, OAuth)
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
| **Kroger** | Store lookup, product pricing, cart handoff | ✅ Client ID + Secret obtained | `.env.local` → `KROGER_CLIENT_ID` / `KROGER_CLIENT_SECRET` |

**Rules:**
- `CLERK_SECRET_KEY`, `KROGER_CLIENT_ID`, `KROGER_CLIENT_SECRET` are server-only — never use in client components
- Only `NEXT_PUBLIC_*` variables are safe client-side
- All Kroger API calls go through `/app/api/` routes exclusively

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

### Phase 4 — API Client (`lib/kroger.ts`)
**Dependencies:** `lib/types.ts`
**Status:** ✅ Done — stubs return mock data, real calls fire when `KROGER_CLIENT_ID` is set

**Functions:**
- `getNearbyStores(zipCode)` — Kroger Locations API, returns up to 5 nearby stores
- `searchProduct(item, locationId)` — Kroger Products API, returns best match + price (promo preferred); cached 1 hour
- `getKrogerAuthUrl()` — builds OAuth authorization URL for `cart.basic:write`
- `exchangeCodeForUserToken(code)` — exchanges authorization code for user access token
- `addToCart(userToken, items)` — `PUT /v1/cart/add` with user's access token

**Auth model:**
- Locations + Products: `client_credentials` (server-to-server, no user needed)
- Cart: `authorization_code` (user must authorize via Kroger OAuth)

> **Call volume:** N items × M stores per "Find Prices" action. Cap stores at 5 to control API usage. Kroger free tier allows 10,000 product requests/day.

---

### Phase 5 — API Routes
**Dependencies:** Phase 4 (`lib/kroger.ts`)
**Can build now:** Yes

- `app/api/stores/route.ts` — accepts `?zip=`, calls `getNearbyStores()`, returns store list
- `app/api/pricing/route.ts` — accepts item list + store IDs, calls `searchProduct()` per item/store, returns `PriceComparison[]`
- `app/api/cart/route.ts` — accepts items + user token, calls `addToCart()`
- `app/api/auth/kroger/callback/route.ts` — receives OAuth code, calls `exchangeCodeForUserToken()`, stores token in session

---

### Phase 6 — UI (3-state Dashboard)
**Dependencies:** Phase 2 types, Phase 5 API routes
**Can build now:** Yes (wire to mock API responses)

**State 1 — List Building** (`components/ShoppingList.tsx`):
- Text input, add item on Enter
- Each item row with delete button
- ZIP code input (stored in local state for the session)
- "Find Prices" button — triggers store lookup + pricing

**State 2 — Product Review:**
- `components/ProductMatch.tsx` — matched product name + price per item
- `components/RetailerComparison.tsx` — lowest-cost Kroger store highlighted with estimated subtotal
- `components/PriceDisclaimer.tsx` — rendered alongside every price (required)
- "Add to Kroger Cart" button — triggers Kroger OAuth if not yet authorized, then calls `/api/cart`

**State 3 — Cart Confirmation:**
- "Items added to your Kroger cart" message with link to kroger.com to complete checkout
- Fallback link if redirect did not open automatically

---

### Phase 7 — Live API Integration
**Dependencies:** `KROGER_CLIENT_ID` + `KROGER_CLIENT_SECRET` in `.env.local`
**Status:** ✅ Keys obtained — ready to test

1. Add credentials to `.env.local`
2. Smoke test store lookup with a real ZIP code
3. Smoke test product search with a 3–5 item list
4. Test OAuth flow: authorize → callback → add to cart
5. Confirm prices match what appears on kroger.com for the same store

---

### Phase 8 — End-to-End Test & Launch Prep
**Dependencies:** Phase 7 complete

1. Playwright test: sign-up → add items → find prices → authorize Kroger → items in cart
2. `npm run lint` and `npm run check-types` — zero errors
3. Verify price disclaimer appears on every screen that shows a price
4. Add all env vars to Vercel dashboard (Project Settings → Environment Variables)
5. Deploy to Vercel — confirm production build passes
