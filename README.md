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
