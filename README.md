# Grovr

Grovr is a grocery price comparison MVP that helps users find the cheapest Kroger-family store for their shopping list. Users build a list, enter their ZIP code, and Grovr fetches real-time prices across nearby stores — then lets them add items directly to their Kroger cart.

## Features

- **Grocery list builder** — add items one at a time, manage quantities
- **Nearby store lookup** — finds Kroger-family stores (Kroger, Ralphs, Fred Meyer, Harris Teeter, etc.) within a user-defined radius
- **Interactive map** — displays nearby stores on an OpenStreetMap map with a radius overlay; adjusting the radius slider re-fetches stores in real time
- **Real-time price comparison** — fetches live prices from the Kroger Products API per item per store; promo prices are always preferred
- **Lowest-cost recommendation** — highlights the cheapest store with an estimated subtotal
- **Kroger cart handoff** — users authorize via Kroger OAuth and items are added directly to their Kroger cart
- **Authentication** — sign-up and sign-in via Clerk

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Auth | Clerk |
| Retail data | Kroger Developer API |
| Maps | react-leaflet + OpenStreetMap (no API key) |
| Deployment | Vercel |

## Project Structure

```
/app
  /page.tsx                          Landing page
  /dashboard/page.tsx                Main shopping dashboard (protected)
  /sign-in, /sign-up                 Clerk auth pages
  /api
    /stores/route.ts                 Nearby stores by ZIP + radius
    /pricing/route.ts                Product price lookup per item/store
    /search/route.ts                 Product autocomplete search
    /cart/route.ts                   Add items to Kroger cart
    /auth/kroger/callback/route.ts   Kroger OAuth callback
    /auth/kroger/url/route.ts        Generate Kroger OAuth URL
/components
  /ShoppingList.tsx                  List input and item management
  /StoreMap.tsx                      Leaflet map with store pins + radius circle
  /ItemSearch.tsx                    Product search with autocomplete
  /ProductMatch.tsx                  Matched product + price display
  /RetailerComparison.tsx            Lowest-cost store recommendation
  /PriceDisclaimer.tsx               Required price disclaimer
  /CheckoutScreen.tsx                Cart confirmation screen
  /MapScreen.tsx                     Map view screen
  /TrackScreen.tsx                   Order tracking screen
/lib
  /kroger.ts                         Kroger API client (locations, products, cart, OAuth)
  /pricing.ts                        Price comparison logic
  /types.ts                          Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Clerk](https://clerk.com) account with a publishable and secret key
- A [Kroger Developer](https://developer.kroger.com) account with a client ID and secret

### Environment Variables

Create a `.env.local` file in the project root:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Kroger
KROGER_CLIENT_ID=your_client_id
KROGER_CLIENT_SECRET=your_client_secret
KROGER_REDIRECT_URI=http://localhost:3000/api/auth/kroger/callback
```

> Never expose `CLERK_SECRET_KEY`, `KROGER_CLIENT_ID`, or `KROGER_CLIENT_SECRET` client-side. All Kroger API calls are proxied through Next.js API routes.

> The Kroger sandbox base URL is `https://api-ce.kroger.com/v1`. Switch to `https://api.kroger.com/v1` for production.

### Install and Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Type Checking and Linting

```bash
npm run check-types
npm run lint
```

## User Flow

1. Sign up or log in via Clerk
2. Enter a ZIP code and adjust the search radius (5–25 miles)
3. Add grocery items to your list
4. Click **Find Prices** — the app fetches nearby stores and looks up real-time prices for each item at each store
5. Review the price comparison — the lowest-cost store is highlighted
6. Click **Add to Kroger Cart** — authorize via Kroger OAuth and items are added to your cart
7. Complete checkout on kroger.com

## Pricing Notes

- Prices are sourced from the Kroger Products API, scoped to a specific store location
- Promo prices are displayed when available
- Prices are cached for up to 1 hour
- The estimated subtotal does not include delivery fees, service fees, or taxes

> Estimated subtotal based on current Kroger listed prices. Final total including fees and promotions may vary.

## Deployment

Deploy to [Vercel](https://vercel.com). Set all environment variables in Project Settings → Environment Variables before deploying.

Update `KROGER_REDIRECT_URI` to your production domain:

```
KROGER_REDIRECT_URI=https://yourdomain.com/api/auth/kroger/callback
```
