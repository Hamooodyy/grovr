# Grocery Price Comparison App — MVP Build Document

## Project Goal

Build a working MVP that lets a small test group create a grocery shopping list, see Instacart-listed prices across a broad range of stores, and be sent to Instacart to complete their order — all from a single interface.

This is a proof-of-concept for a single test cohort. The primary thing we are validating is whether users find value in the workflow: build a list in one place, see prices, get sent to checkout. Pricing precision is a known limitation at this stage and is explicitly documented below.

Scope is deliberately narrow. Do not build anything not listed here.

---

## Core User Flow (MVP Only)

1. User signs up or logs in via Clerk (app authentication)
2. User creates a shopping list (text input, one item at a time)
3. App matches each item to a product available on Instacart and surfaces the listed price
4. User reviews matched items and prices
5. User is sent to Instacart to complete the order

That's the full loop. Everything else is Phase 2.

---

## Authentication

### App Auth — Clerk
Clerk handles account creation and login for the app itself. Use the Next.js SDK and pre-built Clerk UI components — do not build custom auth forms.

- Install: `npm install @clerk/nextjs`
- Docs: https://clerk.com/docs/quickstarts/nextjs
- Wrap the app in `<ClerkProvider>` in the root layout
- Use Clerk middleware to protect all routes except the landing/sign-in page
- Free tier is sufficient for MVP

No Kroger OAuth in this version. Instacart IDP does not support user-level authentication for developers, so there is no second auth step. The user lands on Instacart's own checkout after being redirected.

---

## Instacart IDP Integration

### Registration
- Apply at https://instacart.com/company/business/developers
- Approval typically takes ~1 week for a dev key
- Production key requires submitting a demo — average ~19 days build + review

### Base URL
```
Production:  https://connect.instacart.com
Development: https://connect.dev.instacart.tools
```

### Authentication
Static API key issued by Instacart. Pass as a Bearer token on all requests. Does not expire — manage via key rotation.

```
Authorization: Bearer {api_key}
```

### Key Endpoints

**Create a shoppable recipe/list page**
```
POST /idp/v1/products/recipe
Body: {
  title: "My Shopping List",
  image_url: "optional",
  line_items: [
    { name: "whole milk", quantity: 1, unit: "gallon" },
    { name: "sourdough bread", quantity: 1, unit: "loaf" }
  ]
}
```
Returns a URL that sends the user to Instacart with those items pre-loaded. This is the core mechanic for MVP — you are not placing an order, you are handing the user off to Instacart with their list ready to go.

**Create a shopping list link**
```
POST /idp/v1/products/products_link
Body: {
  title: "My Shopping List",
  line_items: [...],
  expires_in: 86400,
  landing_page_configuration: {}
}
```
Alternative to recipe endpoint — produces a shareable link rather than a redirect. Useful if you want to let users copy the link or share it.

**Find nearby retailers**
```
GET /idp/v1/retailers?postal_code={zip}&country_code=US
```
Returns available Instacart retail partners near the user. Use this to let the user pick which store they want to order from before generating the handoff link.

### What Instacart IDP Does Not Expose to Developers
- Real-time pricing — Instacart does not return price data through the developer API
- Retailer selection control — Instacart selects the retailer based on user location and preferences; you can surface options but cannot force a choice
- Cart write — you cannot add items to a user's Instacart cart programmatically; the handoff link is the mechanism
- Order status or confirmation — once the user leaves your app for Instacart, you have no visibility into whether the order was placed

---


## Pricing

Instacart does not expose pricing data through its developer API. We will source prices from Instacart's publicly displayed storefront via scraping or a third-party grocery price API, and display them with a clear disclaimer.

**Decision:** Show prices with a disclaimer. Do not imply real-time accuracy.

### UI Copy
Every price displayed must carry inline copy:
> "Prices shown may not be real-time and may differ from what you see at checkout."

### Why Prices May Be Imprecise
Instacart sources its own pricing through a mix of direct retailer data agreements and scraping publicly displayed prices for retailers without formal agreements. Retailers can apply markups on top of in-store prices on the Instacart platform. Our displayed prices, derived from Instacart, inherit that imprecision. This is an accepted tradeoff for MVP.

This pricing gap is also a long-term product opportunity: if we can eventually source more accurate or real-time pricing than Instacart surfaces, that is a genuine differentiator.

---

## File Structure

```
/app
  /page.tsx                        — Landing page / sign-in prompt
  /dashboard
    /page.tsx                      — Shopping list UI (Clerk-protected)
  /api
    /products
      /route.ts                    — Product matching logic + price lookup
    /retailers
      /route.ts                    — Proxy Instacart retailer locator
    /list
      /route.ts                    — Generate Instacart handoff link via IDP
/lib
  /instacart.ts                    — Instacart IDP client (API key auth, fetch wrappers)
  /pricing.ts                      — Price lookup logic (scrape or third-party API)
  /types.ts                        — Shared TypeScript types
/components
  /ShoppingList.tsx                — List input + item management
  /ProductMatch.tsx                — Display matched product + price + disclaimer
  /RetailerSelector.tsx            — Let user pick their preferred Instacart retailer
  /PriceDisclaimer.tsx             — Reusable disclaimer component shown alongside prices
```

---

## Environment Variables

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Instacart
INSTACART_API_KEY=
INSTACART_BASE_URL=https://connect.dev.instacart.tools  # swap for prod
```

Never expose `INSTACART_API_KEY` or `CLERK_SECRET_KEY` client-side. All Instacart API calls go through Next.js API routes.

---

## UI — Keep It Minimal

The MVP UI has three states:

**State 1: List building**
- Text input to add items one at a time
- Each item shows as a row with a delete button
- Retailer selector — let user pick their preferred store using the Instacart retailer endpoint
- "Find products" button triggers product matching

**State 2: Product review**
- Each list item shows the matched product name, quantity, and price estimate if available
- Price disclaimer displayed clearly alongside any prices shown
- User can swap to a different product match if the first is wrong
- "Go to Instacart" button generates the handoff link and redirects the user

**State 3: Handoff confirmation**
- Brief confirmation that the list has been sent to Instacart
- Link in case the redirect did not open automatically
- Note that the user will complete the order on Instacart

No dashboards, no saved lists, no recipe engine, no loyalty integration, no cart write. All of that is Phase 2.

---

## What to Skip for MVP

These are explicitly out of scope. Do not build them now:

- Kroger or Walmart API integration
- Real-time pricing (not available via Instacart IDP)
- Loyalty rewards integration
- Pickup vs. delivery toggle (handled by Instacart at checkout)
- Price drop alerts
- Recipe recommendations
- Subscription / payment logic
- Price history or tracking
- Order confirmation or status tracking

---

## MVP Success Criteria

You are done with MVP when a test user can:

1. Sign up for the app via Clerk
2. Build a grocery list in the app
3. See matched products and price estimates with a clear disclaimer
4. Select their preferred Instacart retailer
5. Be sent to Instacart with their list pre-loaded and complete checkout there

Anything beyond that is Phase 2.

---

## Known Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Price data is inaccurate or stale | High | Prominent disclaimer in UI; set user expectations upfront |
| Scraping breaks or violates Instacart ToS | Medium | Evaluate third-party grocery price API first; document risk if scraping is chosen |
| Product matching returns wrong item | High | Build a swap UI so users can pick the right match |
| Instacart dev key approval takes longer than expected | Low | Start application immediately; use dev sandbox URL while waiting |
| User drop-off at Instacart redirect | Medium | This is a key thing to measure — track how many users click "Go to Instacart" vs. complete an order |
| No order confirmation visibility | Certain | Accepted limitation of IDP; consider a simple "Did you complete your order?" prompt post-redirect for qualitative signal |

---

## Phase 2 Pricing Roadmap (For Reference)

Once the workflow is validated, pricing accuracy becomes the next lever. Options in rough priority order:

1. **Kroger API** — real-time pricing and native cart write for Kroger-family stores; best data quality but limited to ~2,800 stores
2. **Walmart OPD API** — gated partnership required; pursue after traction
3. **Retailer-specific scraping** — higher maintenance but possible for major chains without APIs
4. **Negotiated data agreements** — the Instacart model at scale; only realistic with significant order volume

---

## First Build Steps

1. Scaffold Next.js app with TypeScript and Tailwind
2. Install and configure Clerk — confirm sign-up/sign-in flow works end to end
3. Add all environment variables
4. Apply for Instacart IDP dev key
5. Build `instacart.ts` client — API key auth, retailer lookup, recipe/list endpoint
6. Evaluate pricing data source — test a third-party grocery price API or assess scraping feasibility before committing
7. Build `pricing.ts` — whichever approach is chosen from step 6
8. Build retailer selector — confirm retailer lookup returns usable results for test zip codes
9. Build shopping list UI (State 1)
10. Build product match + price display with disclaimer (State 2)
11. Build Instacart handoff link generation — confirm redirect works and pre-loads items correctly
12. Build handoff confirmation screen (State 3)
13. End-to-end test with one real user
